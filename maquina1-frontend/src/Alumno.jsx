// src/Alumno.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'

const socket = io('http://192.168.50.214:3000', { autoConnect: false })

export default function Alumno() {
  const [codigoSala, setCodigoSala] = useState('')
  const [unido, setUnido] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState('')
  
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    socket.connect()

    // Escuchamos el evento de que el profe ya armó los equipos
    socket.on('equipos_listos', (data) => {
      setMensajeEstado(`🎉 ${data.mensaje} ¡Revisa el pizarrón o con el profe para ver tu equipo!`)
    })

    return () => {
      socket.off('equipos_listos')
      socket.disconnect()
    }
  }, [navigate])

  const manejarUnirse = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    
    try {
      // El alumno intenta unirse enviando el código y su propio token
      const res = await axios.post('http://192.168.50.214:3000/api/unirse-sala', { 
        codigo_sala: codigoSala.toUpperCase(), 
        token_alumno: token 
      })
      
      if (res.data.exito) {
        setUnido(true)
        setMensajeEstado('✅ Te has unido a la sala. Esperando a que el profesor asigne los equipos...')
        
        // Nos conectamos al "canal de radio" de esta sala específica
        socket.emit('conectar_a_sala', codigoSala.toUpperCase())
      } else {
        alert(res.data.mensaje)
      }
    } catch (error) {
      console.error(error)
      alert('Error al intentar unirse a la sala. Verifica el código.')
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Portal del Alumno 👨‍🎓</h1>
      
      {!unido ? (
        // VISTA 1: METER EL CÓDIGO
        <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', marginTop: '20px' }}>
          <h2>Unirse a una Sala</h2>
          <form onSubmit={manejarUnirse} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" 
              placeholder="Ej. SALA-XYZ"
              value={codigoSala}
              onChange={(e) => setCodigoSala(e.target.value)}
              required
              style={{ padding: '15px', fontSize: '20px', textAlign: 'center', textTransform: 'uppercase' }}
            />
            <button 
              type="submit"
              style={{ padding: '15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Entrar a la Sala
            </button>
          </form>
        </div>
      ) : (
        // VISTA 2: SALA DE ESPERA
        <div style={{ background: '#e9ecef', padding: '40px', borderRadius: '10px', marginTop: '20px' }}>
          <h2>Sala: <span style={{ color: '#d9534f' }}>{codigoSala.toUpperCase()}</span></h2>
          <div style={{ margin: '30px 0', padding: '20px', background: 'white', borderRadius: '10px', border: '2px dashed #ccc' }}>
            <h3 style={{ margin: 0, color: '#007bff' }}>{mensajeEstado}</h3>
          </div>
        </div>
      )}
    </div>
  )
}