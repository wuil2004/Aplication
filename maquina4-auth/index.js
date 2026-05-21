const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// 1. Conexión a MongoDB (Apunta al puerto de tu Docker)
mongoose.connect('mongodb://127.0.0.1:27017/sistemaEquipos')
    .then(() => console.log('🍃 MongoDB Conectado exitosamente'))
    .catch(err => console.error('❌ Error conectando a MongoDB', err));

// 2. Definir cómo se ve un Usuario en la base de datos
const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    correo: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, required: true } // "alumno" o "docente"
});

// Crear el modelo
const Usuario = mongoose.model('Usuario', usuarioSchema);

const packageDefinition = protoLoader.loadSync('./servicios.proto', { keepCase: true });
const proto = grpc.loadPackageDefinition(packageDefinition).sistema;
const JWT_SECRET = 'mi_super_secreto_123';

// 3. Lógica de Registro con MongoDB
async function Registro(call, callback) {
    const { nombre, correo, password, rol, codigo_secreto } = call.request;

    if (rol === 'docente' && codigo_secreto !== 'profe2024') {
        return callback(null, { exito: false, mensaje: 'Código de autorización incorrecto' });
    }

    try {
        const nuevoUser = new Usuario({ nombre, correo, password, rol });
        await nuevoUser.save(); // Guarda en MongoDB
        
        console.log(`✅ Nuevo ${rol} registrado en Mongo: ${nombre}`);
        callback(null, { exito: true, mensaje: 'Registro exitoso' });
    } catch (error) {
        // El código 11000 en Mongo significa "Duplicado" (el correo ya existe)
        if (error.code === 11000) {
            return callback(null, { exito: false, mensaje: 'El correo ya está registrado' });
        }
        console.error(error);
        callback(null, { exito: false, mensaje: 'Error al guardar en base de datos' });
    }
}

// 4. Lógica de Login con MongoDB
async function Login(call, callback) {
    const { correo, password } = call.request;

    try {
        // Busca un usuario que coincida con ese correo y contraseña
        const usuario = await Usuario.findOne({ correo: correo, password: password });

        if (!usuario) {
            return callback(null, { exito: false, token: '', mensaje: 'Correo o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { nombre: usuario.nombre, rol: usuario.rol }, 
            JWT_SECRET, 
            { expiresIn: '2h' }
        );

        console.log(`🔑 Login exitoso desde Mongo: ${usuario.nombre} (${usuario.rol})`);
        callback(null, { exito: true, token: token, mensaje: 'Login correcto' });
    } catch (error) {
        console.error(error);
        callback(null, { exito: false, token: '', mensaje: 'Error en la base de datos' });
    }
}

const server = new grpc.Server();
server.addService(proto.AuthService.service, { Login, Registro });

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) { console.error(error); return; }
    console.log(`🔐 Máquina 4 (Auth + MongoDB) corriendo en puerto ${port}`);
});