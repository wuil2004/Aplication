const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// 1. Conexión a MongoDB (¡Cambia la IP por la de tu servidor de BD!)
mongoose.connect('mongodb://192.168.0.103:27017/sistemaEquipos')
    .then(() => console.log('🍃 Máquina 3 conectada a MongoDB exitosamente'))
    .catch(err => console.error('❌ Error conectando a MongoDB', err));

// 2. Definir cómo se guarda una Sala en el "cajón" de Mongo
const salaSchema = new mongoose.Schema({
    codigo_sala: { type: String, required: true, unique: true },
    docente: { type: String, required: true },
    max_alumnos_por_equipo: { type: Number, default: 3 },
    alumnos_conectados: [{ nombre: String }],
    equipos: [[{ nombre: String }]] // Arreglo de arreglos
});

const Sala = mongoose.model('Sala', salaSchema);

const packageDefinition = protoLoader.loadSync('./servicios.proto', { keepCase: true });
const proto = grpc.loadPackageDefinition(packageDefinition).sistema;
const JWT_SECRET = 'mi_super_secreto_123';


// ==========================================
// FUNCIONES CON BASE DE DATOS
// ==========================================

// A. Crear Sala
async function CrearSala(call, callback) {
    const { max_alumnos_por_equipo, token_docente } = call.request;
    try {
        const decodificado = jwt.verify(token_docente, JWT_SECRET);
        if (decodificado.rol !== 'docente') {
            return callback(null, { exito: false, codigo_sala: '', mensaje: 'Solo docentes' });
        }

        const codigo_sala = 'SALA-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        
        // Guardamos en Mongo en lugar de la memoria RAM
        const nuevaSala = new Sala({
            codigo_sala: codigo_sala,
            docente: decodificado.nombre,
            max_alumnos_por_equipo: max_alumnos_por_equipo || 3
        });
        await nuevaSala.save();

        console.log(`🏫 Sala ${codigo_sala} creada y guardada en BD por ${decodificado.nombre}`);
        callback(null, { exito: true, codigo_sala: codigo_sala, mensaje: 'Sala creada' });
    } catch (error) {
        console.error("❌ Error en CrearSala:", error.message);
        callback(null, { exito: false, codigo_sala: '', mensaje: 'Token inválido o error de BD' });
    }
}

// B. Unirse a la Sala
async function UnirseSala(call, callback) {
    const { codigo_sala, token_alumno } = call.request;
    if (!token_alumno) return callback(null, { exito: false, mensaje: 'El token está vacío' });

    try {
        const decodificado = jwt.verify(token_alumno, JWT_SECRET);
        if (decodificado.rol !== 'alumno') return callback(null, { exito: false, mensaje: 'Solo alumnos' });
        
        // Buscamos la sala en la base de datos
        const sala = await Sala.findOne({ codigo_sala: codigo_sala });
        if (!sala) return callback(null, { exito: false, mensaje: 'La sala no existe' });

        // Verificamos si ya está adentro
        const yaEsta = sala.alumnos_conectados.find(a => a.nombre === decodificado.nombre);
        if (!yaEsta) {
            sala.alumnos_conectados.push({ nombre: decodificado.nombre });
            await sala.save(); // Actualizamos la BD
        }

        console.log(`👨‍🎓 Alumno ${decodificado.nombre} guardado en sala ${codigo_sala}`);
        callback(null, { exito: true, mensaje: 'Te has unido exitosamente' });
    } catch (error) {
        console.error("❌ Error al unir alumno:", error.message);
        callback(null, { exito: false, mensaje: 'Token inválido' });
    }
}

// C. Generar Equipos
async function GenerarEquipos(call, callback) {
    const { codigo_sala, token_docente } = call.request;
    if (!token_docente) return callback(null, { exito: false, mensaje: 'Token vacío' });

    try {
        const decodificado = jwt.verify(token_docente, JWT_SECRET);
        
        // Traemos la sala de la BD
        const sala = await Sala.findOne({ codigo_sala: codigo_sala });
        if (!sala || sala.docente !== decodificado.nombre) {
            return callback(null, { exito: false, mensaje: 'No tienes permiso o no existe' });
        }

        const alumnos = sala.alumnos_conectados.map(a => a.nombre);
        const max = sala.max_alumnos_por_equipo;
        const total = alumnos.length;

        if (total === 0) return callback(null, { exito: false, mensaje: 'No hay alumnos' });

        // Algoritmo matemático
        const alumnosMezclados = [...alumnos].sort(() => Math.random() - 0.5);
        const num_equipos = Math.ceil(total / max);
        const equipos = Array.from({ length: num_equipos }, () => []);

        alumnosMezclados.forEach((alumno, index) => {
            equipos[index % num_equipos].push({ nombre: alumno });
        });

        // Guardamos los equipos armados en la BD
        sala.equipos = equipos;
        await sala.save();
        
        console.log(`✅ Equipos guardados permanentemente en ${codigo_sala}`);
        callback(null, { exito: true, mensaje: 'Equipos armados correctamente' });
    } catch (error) {
        console.error("❌ Error armando equipos:", error.message);
        callback(null, { exito: false, mensaje: 'Token inválido' });
    }
}

// D. NUEVO: Obtener el historial de salas de un profe
// D. Obtener el historial de salas de un profe
async function ObtenerMisSalas(call, callback) {
    const { token_docente } = call.request;
    try {
        const decodificado = jwt.verify(token_docente, JWT_SECRET);
        
        const misSalas = await Sala.find({ docente: decodificado.nombre });
        
        // AHORA SÍ MANDAMOS TODO LO QUE ESTÁ EN MONGO
        const salasMapeadas = misSalas.map(sala => ({
            codigo_sala: sala.codigo_sala,
            max_alumnos_por_equipo: sala.max_alumnos_por_equipo,
            alumnos: sala.alumnos_conectados.map(a => a.nombre), // Sacamos solo los nombres
            equipos_json: JSON.stringify(sala.equipos || []) // Comprimimos los equipos
        }));

        console.log(`📂 Entregando historial COMPLETO a ${decodificado.nombre}`);
        callback(null, { exito: true, mensaje: 'Salas recuperadas', salas: salasMapeadas });
    } catch (error) {
        console.error("❌ Error recuperando historial:", error.message);
        callback(null, { exito: false, mensaje: 'Token inválido', salas: [] });
    }
}

// E. NUEVO: Obtener el historial de salas de un alumno
async function ObtenerSalasAlumno(call, callback) {
    const { token_alumno } = call.request;
    try {
        const decodificado = jwt.verify(token_alumno, JWT_SECRET);
        
        // Magia de Mongo: Busca todas las salas donde dentro del arreglo "alumnos_conectados", 
        // haya un objeto cuyo "nombre" coincida con el del alumno.
        const misSalas = await Sala.find({ "alumnos_conectados.nombre": decodificado.nombre });
        
        // Mapeamos igual que con el profe para mandar la info completa
        const salasMapeadas = misSalas.map(sala => ({
            codigo_sala: sala.codigo_sala,
            max_alumnos_por_equipo: sala.max_alumnos_por_equipo,
            alumnos: sala.alumnos_conectados.map(a => a.nombre),
            equipos_json: JSON.stringify(sala.equipos || [])
        }));

        console.log(`🎒 Entregando historial de ${misSalas.length} salas al alumno ${decodificado.nombre}`);
        callback(null, { exito: true, mensaje: 'Salas recuperadas', salas: salasMapeadas });
    } catch (error) {
        console.error("❌ Error recuperando historial del alumno:", error.message);
        callback(null, { exito: false, mensaje: 'Token inválido', salas: [] });
    }
}

// NUEVO: Guardar la foto de los equipos en MongoDB
async function GuardarEquipos(call, callback) {
    const { codigo_sala, token_docente, equipos_json } = call.request;
    try {
        const decodificado = jwt.verify(token_docente, JWT_SECRET);
        const sala = await Sala.findOne({ codigo_sala: codigo_sala, docente: decodificado.nombre });
        
        if (!sala) return callback(null, { exito: false, mensaje: 'No autorizado' });

        // Convertimos el texto ["juan", "pito"] al formato de Mongo [{nombre: "juan"}, {nombre: "pito"}]
        const equiposArray = JSON.parse(equipos_json);
        const equiposMongoose = equiposArray.map(eq => eq.map(nombre => ({ nombre: nombre })));

        sala.equipos = equiposMongoose;
        await sala.save(); // ¡Guardado en disco duro!

        callback(null, { exito: true, mensaje: 'Guardado exitoso' });
    } catch (error) {
        callback(null, { exito: false, mensaje: 'Error guardando' });
    }
}

// F. NUEVO: Eliminar Sala
async function EliminarSala(call, callback) {
    const { codigo_sala, token_docente } = call.request;
    try {
        const decodificado = jwt.verify(token_docente, JWT_SECRET);
        
        // Buscamos la sala y la eliminamos, pero OJO: verificamos que el docente que 
        // está pidiendo borrarla sea el verdadero dueño de esa sala.
        const salaBorrada = await Sala.findOneAndDelete({ 
            codigo_sala: codigo_sala, 
            docente: decodificado.nombre 
        });

        if (!salaBorrada) {
            return callback(null, { exito: false, mensaje: 'No se encontró la sala o no tienes permiso' });
        }

        console.log(`🗑️ Sala ${codigo_sala} eliminada permanentemente por ${decodificado.nombre}`);
        callback(null, { exito: true, mensaje: 'Sala eliminada correctamente' });
    } catch (error) {
        console.error("❌ Error eliminando sala:", error.message);
        callback(null, { exito: false, mensaje: 'Token inválido o error interno' });
    }
}

// G. Obtener estado actual de la sala (para que el alumno que entra tarde se sincronice)
async function ObtenerEstadoSala(call, callback) {
    const { codigo_sala } = call.request;
    try {
        const sala = await Sala.findOne({ codigo_sala: codigo_sala });
        if (!sala) return callback(null, { exito: false });
        
        callback(null, { 
            exito: true, 
            alumnos: sala.alumnos_conectados.map(a => a.nombre),
            equipos_json: JSON.stringify(sala.equipos || [])
        });
    } catch (error) {
        callback(null, { exito: false });
    }
}

// ==========================================
// ENCENDIDO DEL SERVIDOR
// ==========================================
const server = new grpc.Server();
server.addService(proto.SalasService.service, { 
    CrearSala, 
    UnirseSala, 
    GenerarEquipos, 
    ObtenerMisSalas ,
    ObtenerSalasAlumno , // <-- No olvides registrar la función aquí
    EliminarSala,
    GuardarEquipos
});

server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) { console.error(error); return; }
    console.log(`🏫 Máquina 3 (Salas + MongoDB) lista en el puerto ${port}`);
});