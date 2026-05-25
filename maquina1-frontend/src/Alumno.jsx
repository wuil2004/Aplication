// src/Alumno.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { jwtDecode } from 'jwt-decode'

const socket = io('http://192.168.0.103:3000', { autoConnect: false })

export default function Alumno() {
  const [codigoSala, setCodigoSala] = useState('')
  const [unido, setUnido] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState('')
  
  // Nuevos estados para el Pizarrón Espejo y el Historial
  const [misSalas, setMisSalas] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [miNombre, setMiNombre] = useState('')
  
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    // Sacamos el nombre del alumno de su propio gafete
    const decodificado = jwtDecode(token)
    setMiNombre(decodificado.nombre)

    socket.connect()
    cargarMisSalas(token)

    // Escuchamos cuando un compañero entra
    socket.on('alumno_unido', (data) => {
      setAlumnos((prev) => {
        if (prev.includes(data.nombre)) return prev;
        return [...prev, data.nombre]
      })
    })

    // Escuchamos cuando el profe arma los equipos
    socket.on('equipos_listos', (data) => {
      setMensajeEstado(`🎉 ${data.mensaje}`)
      if (data.equipos) {
        setEquipos(data.equipos)
      }
    })

    return () => {
      socket.off('alumno_unido')
      socket.off('equipos_listos')
      socket.disconnect()
    }
  }, [navigate])

  const cargarMisSalas = async (token) => {
    try {
      const res = await axios.post('http://192.168.0.103:3000/api/mis-salas-alumno', { token_alumno: token })
      if (res.data.exito) {
        setMisSalas(res.data.salas || [])
      }
    } catch (error) {
      console.error("Error cargando historial", error)
    }
  }

  const manejarUnirse = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    
    try {
      const res = await axios.post('http://192.168.0.103:3000/api/unirse-sala', { 
        codigo_sala: codigoSala.toUpperCase(), 
        token_alumno: token 
      })
      
      if (res.data.exito) {
        // En lugar de solo decir "Unido", disparamos la vista completa
        entrarASala({
          codigo_sala: codigoSala.toUpperCase(),
          alumnos: [miNombre], // Se pone a sí mismo por defecto
          equipos_json: "[]"
        })
        
        // Recargamos el historial en el fondo por si quiere volver luego
        cargarMisSalas(token)
      } else {
        alert(res.data.mensaje)
      }
    } catch (error) {
      console.error(error)
      alert('Error al intentar unirse a la sala. Verifica el código.')
    }
  }

  const entrarASala = (sala) => {
    setCodigoSala(sala.codigo_sala)
    setUnido(true)
    setMensajeEstado('✅ Conectado. Esperando instrucciones del profesor...')
    
    setAlumnos(sala.alumnos || [])
    
    // Si la sala ya tenía equipos guardados en la BD, los reconstruimos
    if (sala.equipos_json && sala.equipos_json !== "[]") {
      const equiposDesdeDB = JSON.parse(sala.equipos_json)
      const equiposPlanos = equiposDesdeDB.map(eq => eq.map(a => a.nombre))
      setEquipos(equiposPlanos)
    } else {
      setEquipos([])
    }

    socket.emit('conectar_a_sala', sala.codigo_sala)
  }

  const volverAlInicio = () => {
    setUnido(false)
    setCodigoSala('')
    setAlumnos([])
    setEquipos([])
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Portal del Alumno 👨‍🎓</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>Bienvenido, <strong>{miNombre}</strong></p>
      
      {!unido ? (
        <div style={{ marginTop: '40px' }}>
          
          {/* SECCIÓN 1: Historial de Salas del Alumno */}
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
            <h2>Mis Clases Anteriores 📚</h2>
            {misSalas.length === 0 ? (
              <p style={{ color: '#666' }}>Aún no te has unido a ninguna clase.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {misSalas.map((sala, index) => (
                  <div key={index} style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '18px', color: '#17a2b8' }}>{sala.codigo_sala}</strong>
                      <div style={{ fontSize: '14px', color: '#555' }}>Tus compañeros: {sala.alumnos ? sala.alumnos.length : 0}</div>
                    </div>
                    <button 
                      onClick={() => entrarASala(sala)}
                      style={{ padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      Reingresar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: Unirse a Nueva Sala */}
          <div style={{ textAlign: 'center', background: '#e9ecef', padding: '30px', borderRadius: '10px' }}>
            <h2>Unirse a una Sala Nueva</h2>
            <form onSubmit={manejarUnirse} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', margin: '0 auto' }}>
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

        </div>
      ) : (
        // VISTA 2: PIZARRÓN ESPEJO (SALA DE ESPERA)
        <div style={{ marginTop: '30px' }}>
          <div style={{ background: '#17a2b8', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', position: 'relative' }}>
            <button 
              onClick={volverAlInicio} 
              style={{ position: 'absolute', top: '20px', left: '20px', padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              ⬅ Salir
            </button>
            <h2>Estás en la Sala: <span style={{ color: '#ffc107', fontSize: '40px', display: 'block' }}>{codigoSala}</span></h2>
            <h3 style={{ margin: '10px 0 0 0', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '5px' }}>{mensajeEstado}</h3>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
            
            {/* COMPAÑEROS CONECTADOS */}
            <div style={{ flex: 1, background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
              <h3>Compañeros ({alumnos.length}):</h3>
              <ul style={{ paddingLeft: '20px' }}>
                {alumnos.map((alumno, index) => (
                  <li key={index} style={{ 
                    padding: '5px 0', 
                    fontWeight: alumno === miNombre ? 'bold' : 'normal',
                    color: alumno === miNombre ? '#007bff' : '#333'
                  }}>
                    {alumno} {alumno === miNombre && '(Tú)'}
                  </li>
                ))}
              </ul>
            </div>

            {/* EQUIPOS */}
            <div style={{ flex: 2, background: '#e9ecef', padding: '20px', borderRadius: '10px' }}>
              <h3>Pizarrón de Equipos</h3>
              {equipos.length === 0 ? (
                <p style={{ color: '#666' }}>El profesor aún no ha generado los equipos...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                  {equipos.map((equipo, i) => {
                    const estoyAqui = equipo.includes(miNombre);
                    return (
                      <div key={i} style={{ 
                        background: estoyAqui ? '#e6f2ff' : 'white', 
                        padding: '15px', 
                        borderRadius: '8px', 
                        borderLeft: `5px solid ${estoyAqui ? '#007bff' : '#28a745'}`, 
                        boxShadow: estoyAqui ? '0 0 10px rgba(0,123,255,0.3)' : '0 2px 4px rgba(0,0,0,0.1)' 
                      }}>
                        <h4 style={{ margin: '0 0 10px 0', color: estoyAqui ? '#007bff' : '#333' }}>
                          Equipo {i + 1} {estoyAqui && '⭐'}
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#555' }}>
                          {equipo.map((integrante, j) => (
                            <li key={j} style={{ 
                              fontWeight: integrante === miNombre ? 'bold' : 'normal',
                              color: integrante === miNombre ? '#007bff' : '#555'
                            }}>
                              {integrante}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}