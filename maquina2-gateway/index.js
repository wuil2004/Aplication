const express = require('express');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken'); // <-- NUEVO: Para abrir los gafetes

// 1. Nuevas importaciones para WebSockets
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

// Secreto para leer el JWT (Debe ser el mismo que usas en Máquina 4)
const JWT_SECRET = 'mi_super_secreto_123';

// 2. Configurar el servidor HTTP y Socket.io
const servidorHttp = http.createServer(app);
const io = new Server(servidorHttp, {
    cors: { origin: '*' } // Permite que cualquier frontend se conecte
});

// 3. Lógica de WebSockets (El Switchboard)
io.on('connection', (socket) => {
    console.log('🔌 Nuevo navegador conectado. ID:', socket.id);

    // Cuando el Frontend nos avisa "Ey, acabo de abrir la pantalla de esta sala"
    socket.on('conectar_a_sala', (codigo_sala) => {
        socket.join(codigo_sala);
        console.log(`📱 Pantalla unida al canal de tiempo real: ${codigo_sala}`);
    });

    // Nuevo: Escuchamos cuando el Profe avisa que ya revolvió los equipos aleatoriamente
    // Nuevo: Escuchamos cuando el Profe avisa y le pasamos los equipos a los alumnos
    socket.on('equipos_generados', (data) => {
        io.to(data.sala).emit('equipos_listos', { 
            mensaje: data.mensaje,
            equipos: data.equipos,
            alumnos: data.alumnos
        });
    });
    socket.on('disconnect', () => {
        console.log('🔌 Navegador desconectado');
    });
});

const packageDefinition = protoLoader.loadSync('./servicios.proto', { keepCase: true });
const proto = grpc.loadPackageDefinition(packageDefinition).sistema;

// Conexiones a tus otras máquinas físicas
const authClient = new proto.AuthService('192.168.0.103:50051', grpc.credentials.createInsecure());
const salasClient = new proto.SalasService('192.168.0.103:50052', grpc.credentials.createInsecure());

// --- RUTAS HTTP --- (Registro, Login y Crear Sala quedan igual)
app.post('/api/registro', (req, res) => {
    authClient.Registro(req.body, (err, resp) => err ? res.status(500).json({exito:false}) : res.json(resp));
});

app.post('/api/login', (req, res) => {
    authClient.Login(req.body, (err, resp) => err ? res.status(500).json({exito:false}) : res.json(resp));
});

app.post('/api/crear-sala', (req, res) => {
    salasClient.CrearSala(req.body, (err, resp) => err ? res.status(500).json({exito:false}) : res.json(resp));
});

// --- NUEVA RUTA PARA GUARDAR EQUIPOS EN BD ---
app.post('/api/guardar-equipos', (req, res) => {
    salasClient.GuardarEquipos(req.body, (error, respuesta) => {
        if (error) return res.status(500).json({ exito: false });
        res.json(respuesta);
    });
});

// --- NUEVA RUTA PARA PEDIR EL HISTORIAL DE SALAS ---
app.post('/api/mis-salas', (req, res) => {
    const { token_docente } = req.body;

    // El Gateway le pide a la Máquina 3 (Salas) que busque en MongoDB
    salasClient.ObtenerMisSalas({ token_docente: token_docente }, (error, respuesta) => {
        if (error) {
            console.error("❌ Error pidiendo salas a la Máquina 3:", error.message);
            return res.status(500).json({ exito: false, mensaje: 'Error interno' });
        }
        res.json(respuesta);
    });
});



// --- NUEVA RUTA PARA EL HISTORIAL DEL ALUMNO ---
app.post('/api/mis-salas-alumno', (req, res) => {
    const { token_alumno } = req.body;
    salasClient.ObtenerSalasAlumno({ token_alumno: token_alumno }, (error, respuesta) => {
        if (error) {
            console.error("❌ Error pidiendo salas del alumno:", error.message);
            return res.status(500).json({ exito: false, mensaje: 'Error interno' });
        }
        res.json(respuesta);
    });
});

// --- LA MAGIA: RUTAS CON AVISO EN TIEMPO REAL ---

app.post('/api/unirse-sala', (req, res) => {
    const { codigo_sala, token_alumno } = req.body;

    // --- LUPA DE DEBUGGING ---
    console.log("\n--- ALUMNO INTENTANDO UNIRSE ---");
    console.log("Código de sala:", codigo_sala);
    console.log("Token recibido:", token_alumno);

    try {
        const decodificado = jwt.verify(token_alumno, JWT_SECRET);
        console.log("✅ Token abierto con éxito. Alumno:", decodificado.nombre);

        salasClient.UnirseSala({ codigo_sala: codigo_sala, token_alumno: token_alumno }, (error, respuesta) => {
            if (error || !respuesta.exito) {
                return res.json({ exito: false, mensaje: respuesta ? respuesta.mensaje : 'Error en salas' });
            }

            io.to(codigo_sala).emit('alumno_unido', { nombre: decodificado.nombre });
            res.json(respuesta);
        });
    } catch (error) {
        console.error("❌ El token explotó por esta razón:", error.message);
        res.json({ exito: false, mensaje: 'Token inválido o expirado' });
    }
});

app.post('/api/generar-equipos', (req, res) => {
    salasClient.GenerarEquipos(req.body, (error, respuesta) => {
        if (error) return res.status(500).json({ exito: false, mensaje: 'Error interno' });
        
        // Esta ruta queda por si en el futuro generas equipos desde el backend (Máquina 3)
        if (respuesta.exito) {
            io.to(req.body.codigo_sala).emit('equipos_listos', {
                mensaje: '¡Los equipos han sido generados!'
            });
        }
        
        res.json(respuesta);
    });
});

// ¡OJO! Ahora escuchamos en '0.0.0.0' para aceptar peticiones de toda la red
servidorHttp.listen(3000, '0.0.0.0', () => {
    console.log('🌐 API Gateway + WebSockets listos en toda la red local por el puerto 3000');
});