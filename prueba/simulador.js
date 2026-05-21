// simulador.js
const apiUrl = 'http://localhost:3000/api';

async function peticion(ruta, body) {
    const res = await fetch(`${apiUrl}${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return await res.json();
}

async function iniciarSimulacion() {
    console.log("🚀 Iniciando simulación automática...\n");

    // 1. Registrar y loguear al profe Wuil
    await peticion('/registro', { nombre: "Profe Wuil", correo: "profe@escuela.com", password: "123", rol: "docente", codigo_secreto: "profe2024" });
    const loginProfe = await peticion('/login', { correo: "profe@escuela.com", password: "123" });
    const tokenProfe = loginProfe.token;
    console.log("👨‍🏫 Profe registrado y logueado.");

    // 2. Crear Sala (Máx 3 alumnos por equipo)
    const salaData = await peticion('/crear-sala', { max_alumnos_por_equipo: 3, token_docente: tokenProfe });
    const codigoSala = salaData.codigo_sala;
    console.log(`🏫 Sala creada exitosamente. Código: ${codigoSala}\n`);

    // 3. Crear 8 alumnos ficticios y unirlos a la sala
    // Matemáticas: 8 alumnos / 3 por equipo = 3 equipos (quedarán de 3, 3 y 2 alumnos).
    const nombresAlumnos = ["Ana", "Beto", "Carlos", "Diana", "Elena", "Fer", "Gaby", "Hugo"];
    
    for (let i = 0; i < nombresAlumnos.length; i++) {
        const nombre = nombresAlumnos[i];
        const correo = `alumno${i}@escuela.com`;
        
        // Registro y Login de cada alumno
        await peticion('/registro', { nombre: nombre, correo: correo, password: "123", rol: "alumno" });
        const loginAlumno = await peticion('/login', { correo: correo, password: "123" });
        
        // El alumno se une con su propio token y el código de la sala
        await peticion('/unirse-sala', { codigo_sala: codigoSala, token_alumno: loginAlumno.token });
        console.log(`👨‍🎓 Alumno ${nombre} se unió a la sala.`);
    }

    console.log("\n⚙️ Profe Wuil presiona 'Generar Equipos'...");
    
    // 4. Generar equipos equitativos
    const resultado = await peticion('/generar-equipos', { codigo_sala: codigoSala, token_docente: tokenProfe });
    console.log("✅ Resultado:", resultado.mensaje);
    
    console.log("\n👉 ¡Revisa la terminal de la MÁQUINA 3 (Salas) para ver cómo quedaron repartidos!");
}

iniciarSimulacion();