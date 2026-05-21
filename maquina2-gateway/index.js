const express = require('express');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// 1. Nuevas importaciones para WebSockets
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

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

    socket.on('disconnect', () => {
        console.log('🔌 Navegador desconectado');
    });
});


const packageDefinition = protoLoader.loadSync('./servicios.proto', { keepCase: true });
const proto = grpc.loadPackageDefinition(packageDefinition).sistema;

const authClient = new proto.AuthService('localhost:50051', grpc.credentials.createInsecure());
const salasClient = new proto.SalasService('localhost:50052', grpc.credentials.createInsecure());

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


// --- LA MAGIA: RUTAS CON AVISO EN TIEMPO REAL ---

app.post('/api/unirse-sala', (req, res) => {
    salasClient.UnirseSala(req.body, (error, respuesta) => {
        if (error) return res.status(500).json({ exito: false, mensaje: 'Error interno' });
        
        // Si la Máquina 3 dice que el alumno se unió bien, ¡Avisamos por WebSockets!
        if (respuesta.exito) {
            io.to(req.body.codigo_sala).emit('actualizacion_alumnos', {
                mensaje: 'Un nuevo alumno acaba de entrar'
            });
        }
        
        res.json(respuesta);
    });
});

app.post('/api/generar-equipos', (req, res) => {
    salasClient.GenerarEquipos(req.body, (error, respuesta) => {
        if (error) return res.status(500).json({ exito: false, mensaje: 'Error interno' });
        
        // Si el algoritmo terminó con éxito, ¡Avisamos a todos que ya hay equipos!
        if (respuesta.exito) {
            io.to(req.body.codigo_sala).emit('equipos_listos', {
                mensaje: '¡Los equipos han sido generados!'
            });
        }
        
        res.json(respuesta);
    });
});

// ¡OJO! Ahora encendemos "servidorHttp", no "app"
servidorHttp.listen(3000, () => {
    console.log('🌐 API Gateway + WebSockets listos en http://localhost:3000');
});