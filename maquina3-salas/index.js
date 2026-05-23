const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');

const packageDefinition = protoLoader.loadSync('./servicios.proto', { keepCase: true });
const proto = grpc.loadPackageDefinition(packageDefinition).sistema;

const JWT_SECRET = 'mi_super_secreto_123';
const salasDB = {};

// 1. Crear Sala
function CrearSala(call, callback) {
    const { max_alumnos_por_equipo, token_docente } = call.request;
    try {
        const decodificado = jwt.verify(token_docente, JWT_SECRET);
        if (decodificado.rol !== 'docente') {
            return callback(null, { exito: false, codigo_sala: '', mensaje: 'Solo docentes' });
        }

        const codigo_sala = 'SALA-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        salasDB[codigo_sala] = {
            docente: decodificado.nombre,
            max_alumnos_por_equipo: max_alumnos_por_equipo || 3, // Por si no llega el número, ponemos 3 por defecto
            alumnos_conectados: [], 
            equipos: [] 
        };

        console.log(`🏫 Sala ${codigo_sala} creada por ${decodificado.nombre}. Max: ${salasDB[codigo_sala].max_alumnos_por_equipo}`);
        callback(null, { exito: true, codigo_sala: codigo_sala, mensaje: 'Sala creada' });
    } catch (error) {
        console.error("❌ Error en CrearSala: Token inválido");
        callback(null, { exito: false, codigo_sala: '', mensaje: 'Token inválido' });
    }
}

// 2. Unirse a la Sala (Para alumnos)
function UnirseSala(call, callback) {
    const { codigo_sala, token_alumno } = call.request;
    
    // Filtro de seguridad: Avisar si el Gateway no mandó el token
    if (!token_alumno) {
        console.error(`❌ Alerta: El Gateway intentó meter a un alumno a la ${codigo_sala} pero no envió el token_alumno.`);
        return callback(null, { exito: false, mensaje: 'El token está vacío' });
    }

    try {
        const decodificado = jwt.verify(token_alumno, JWT_SECRET);
        
        if (decodificado.rol !== 'alumno') {
            return callback(null, { exito: false, mensaje: 'Solo los alumnos pueden unirse a las salas' });
        }
        
        if (!salasDB[codigo_sala]) {
            return callback(null, { exito: false, mensaje: 'La sala no existe' });
        }

        // Evitar que el mismo alumno se duplique si le da doble clic
        const yaEsta = salasDB[codigo_sala].alumnos_conectados.find(a => a.nombre === decodificado.nombre);
        if (!yaEsta) {
            salasDB[codigo_sala].alumnos_conectados.push({ nombre: decodificado.nombre });
        }

        console.log(`👨‍🎓 Alumno ${decodificado.nombre} entró a la ${codigo_sala}`);
        callback(null, { exito: true, mensaje: 'Te has unido exitosamente' });
    } catch (error) {
        console.error(`❌ Rechazado: El token del alumno rebotó al intentar entrar a ${codigo_sala}`);
        callback(null, { exito: false, mensaje: 'Token inválido' });
    }
}

// 3. El Algoritmo: Generar Equipos Equitativos
function GenerarEquipos(call, callback) {
    const { codigo_sala, token_docente } = call.request;
    
    if (!token_docente) {
        return callback(null, { exito: false, mensaje: 'El token del docente está vacío' });
    }

    try {
        const decodificado = jwt.verify(token_docente, JWT_SECRET);
        const sala = salasDB[codigo_sala];

        if (!sala || sala.docente !== decodificado.nombre) {
            return callback(null, { exito: false, mensaje: 'No tienes permiso para generar equipos aquí' });
        }

        const alumnos = sala.alumnos_conectados;
        const max = sala.max_alumnos_por_equipo;
        const total = alumnos.length;

        if (total === 0) {
            return callback(null, { exito: false, mensaje: 'No hay alumnos para repartir' });
        }

        // A. Mezclar a los alumnos al azar
        const alumnosMezclados = [...alumnos].sort(() => Math.random() - 0.5);

        // B. Calcular cuántos equipos se necesitan
        const num_equipos = Math.ceil(total / max);

        // C. Crear los equipos vacíos
        const equipos = Array.from({ length: num_equipos }, () => []);

        // D. Repartir como baraja de cartas
        alumnosMezclados.forEach((alumno, index) => {
            const numeroDeEquipo = index % num_equipos;
            equipos[numeroDeEquipo].push(alumno);
        });

        sala.equipos = equipos;
        
        console.log(`✅ Equipos equitativos generados en ${codigo_sala}:`);
        console.dir(equipos, { depth: null }); 

        callback(null, { exito: true, mensaje: 'Equipos armados correctamente' });
    } catch (error) {
        console.error("❌ Error en GenerarEquipos: Token inválido");
        callback(null, { exito: false, mensaje: 'Token inválido' });
    }
}

// 4. Encender Servidor
const server = new grpc.Server();
server.addService(proto.SalasService.service, { CrearSala, UnirseSala, GenerarEquipos });

server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) { console.error(error); return; }
    console.log(`🏫 Máquina 3 (Salas) lista en el puerto ${port}`);
});