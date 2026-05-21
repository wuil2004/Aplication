const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');

const packageDefinition = protoLoader.loadSync('./servicios.proto', { keepCase: true });
const proto = grpc.loadPackageDefinition(packageDefinition).sistema;

const JWT_SECRET = 'mi_super_secreto_123';
const salasDB = {};

// 1. Crear Sala (Ya la tenías)
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
            max_alumnos_por_equipo: max_alumnos_por_equipo,
            alumnos_conectados: [], 
            equipos: [] 
        };

        console.log(`🏫 Sala ${codigo_sala} creada por ${decodificado.nombre}. Max: ${max_alumnos_por_equipo}`);
        callback(null, { exito: true, codigo_sala: codigo_sala, mensaje: 'Sala creada' });
    } catch (error) {
        callback(null, { exito: false, codigo_sala: '', mensaje: 'Token inválido' });
    }
}

// 2. Unirse a la Sala (Para alumnos)
function UnirseSala(call, callback) {
    const { codigo_sala, token_alumno } = call.request;
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
        callback(null, { exito: false, mensaje: 'Token inválido' });
    }
}

// 3. El Algoritmo: Generar Equipos Equitativos
function GenerarEquipos(call, callback) {
    const { codigo_sala, token_docente } = call.request;
    try {
        const decodificado = jwt.verify(token_docente, JWT_SECRET);
        const sala = salasDB[codigo_sala];

        // Validar que la sala exista y que este profe sea el dueño
        if (!sala || sala.docente !== decodificado.nombre) {
            return callback(null, { exito: false, mensaje: 'No tienes permiso para generar equipos aquí' });
        }

        const alumnos = sala.alumnos_conectados;
        const max = sala.max_alumnos_por_equipo;
        const total = alumnos.length;

        if (total === 0) {
            return callback(null, { exito: false, mensaje: 'No hay alumnos para repartir' });
        }

        // A. Mezclar a los alumnos al azar (Si quieres que sea por orden de llegada, borra esta línea)
        const alumnosMezclados = [...alumnos].sort(() => Math.random() - 0.5);

        // B. Calcular cuántos equipos se necesitan
        const num_equipos = Math.ceil(total / max);

        // C. Crear los equipos vacíos (un arreglo de arreglos)
        const equipos = Array.from({ length: num_equipos }, () => []);

        // D. Repartir como baraja de cartas usando el residuo (módulo)
        alumnosMezclados.forEach((alumno, index) => {
            const numeroDeEquipo = index % num_equipos;
            equipos[numeroDeEquipo].push(alumno);
        });

        // Guardar en la "base de datos"
        sala.equipos = equipos;
        
        console.log(`✅ Equipos equitativos generados en ${codigo_sala}:`);
        console.dir(equipos, { depth: null }); // Para verlo bonito en la terminal

        callback(null, { exito: true, mensaje: 'Equipos armados correctamente' });
    } catch (error) {
        callback(null, { exito: false, mensaje: 'Token inválido' });
    }
}

// 4. Encender Servidor
const server = new grpc.Server();
// Aquí registramos las TRES funciones
server.addService(proto.SalasService.service, { CrearSala, UnirseSala, GenerarEquipos });

server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) { console.error(error); return; }
    console.log(`🏫 Máquina 3 (Salas) lista en el puerto ${port}`);
});