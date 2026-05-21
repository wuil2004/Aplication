// src/Docente.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'

// Preparamos la conexión al WebSocket (aún sin conectarla hasta que entre a la sala)
const socket = io('http://localhost:3000', { autoConnect: false })

export default function Docente() {
  const [maxAlumnos, setMaxAlumnos] = useState(5)
  const [codigoSala, setCodigoSala] = useState('')
  const [eventos, setEventos] = useState([]) // Para el registro de actividad
  const [equiposGenerados, setEquiposGenerados] = useState(false)
  
  const navigate = useNavigate()

  // Este useEffect funciona como un guardia de seguridad y preparador
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      // Si no hay token, lo regresamos al login a patadas (Ruta Protegida)
      navigate('/login')
      return
    }

    // Encendemos el receptor de WebSockets
    socket.connect()

    socket.on('actualizacion_alumnos', (data) => {
      setEventos(prev => [...prev, `👨‍🎓 ${data.mensaje}`])
    })

    socket.on('equipos_listos', (data) => {
      setEventos(prev => [...prev, `✅ ${data.mensaje} (Revisa la terminal de la Máquina 3 para verlos)`])
      setEquiposGenerados(true)
    })

    // Limpieza cuando el profe cierre la pestaña
    return () => {
      socket.off('actualizacion_alumnos')
      socket.off('equipos_listos')
      socket.disconnect()
    }
  }, [navigate])

  const manejarCrearSala = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.post('http://localhost:3000/api/crear-sala', { 
        max_alumnos_por_equipo: parseInt(maxAlumnos), 
        token_docente: token 
      })
      
      if (res.data.exito) {
        const codigo = res.data.codigo_sala
        setCodigoSala(codigo)
        setEventos([`🏫 Sala creada. Código: ${codigo}. Esperando alumnos...`])
        
        // Le decimos al backend: "Conecta mis notificaciones a esta sala en específico"
        socket.emit('conectar_a_sala', codigo)
      } else {
        alert(res.data.mensaje)
      }
    } catch (error) {
      console.error(error)
      alert('Error al conectar con el servidor')
    }
  }

  const manejarGenerarEquipos = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.post('http://localhost:3000/api/generar-equipos', { 
        codigo_sala: codigoSala, 
        token_docente: token 
      })
      
      if (!res.data.exito) {
        alert(res.data.mensaje)
      }
      // No hacemos nada más aquí, porque el aviso de éxito llegará solito por WebSocket
    } catch (error) {
      console.error(error)
      alert('Error al generar equipos')
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Panel del Docente 👨‍🏫</h1>
      
      {!codigoSala ? (
        // VISTA 1: AÚN NO HAY SALA
        <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', marginTop: '20px' }}>
          <h2>Configurar Nueva Sala</h2>
          <label style={{ display: 'block', marginBottom: '10px' }}>
            Máximo de alumnos por equipo:
          </label>
          <input 
            type="number" 
            value={maxAlumnos}
            onChange={(e) => setMaxAlumnos(e.target.value)}
            min="2"
            max="10"
            style={{ padding: '10px', fontSize: '16px', width: '100px', marginRight: '15px' }}
          />
          <button 
            onClick={manejarCrearSala}
            style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}
          >
            Crear Sala
          </button>
        </div>
      ) : (
        // VISTA 2: LA SALA YA ESTÁ ACTIVA
        <div>
          <div style={{ background: '#e9ecef', padding: '20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>Código de acceso: <span style={{ color: '#d9534f', fontSize: '32px' }}>{codigoSala}</span></h2>
              <p style={{ margin: '5px 0 0 0' }}>Equipos de máximo {maxAlumnos} alumnos.</p>
            </div>
            
            <button 
              onClick={manejarGenerarEquipos}
              disabled={equiposGenerados}
              style={{ 
                padding: '15px 30px', 
                background: equiposGenerados ? '#6c757d' : '#28a745', 
                color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', cursor: equiposGenerados ? 'not-allowed' : 'pointer', fontWeight: 'bold' 
              }}
            >
              {equiposGenerados ? 'Equipos Generados' : 'Generar Equipos'}
            </button>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3>Monitor de Actividad 🔴</h3>
            <div style={{ background: '#212529', color: '#00ff00', padding: '20px', borderRadius: '5px', minHeight: '300px', fontFamily: 'monospace', fontSize: '16px' }}>
              {eventos.map((evento, index) => (
                <div key={index} style={{ marginBottom: '10px' }}>{evento}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}