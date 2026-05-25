// src/Docente.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'

const socket = io('http://192.168.0.103:3000', { autoConnect: false })

export default function Docente() {
  const [codigoSala, setCodigoSala] = useState('')
  const [alumnos, setAlumnos] = useState([]) 
  const [equipos, setEquipos] = useState([]) 
  const [tamanioEquipo, setTamanioEquipo] = useState(3) 
  const [misSalas, setMisSalas] = useState([]) 
  
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    socket.connect()
    cargarMisSalas(token)

    socket.on('alumno_unido', (data) => {
      setAlumnos((prevAlumnos) => {
        if (prevAlumnos.includes(data.nombre)) return prevAlumnos;
        return [...prevAlumnos, data.nombre]
      })
    })

    return () => {
      socket.off('alumno_unido')
      socket.disconnect()
    }
  }, [navigate])

  const cargarMisSalas = async (token) => {
    try {
      const res = await axios.post('http://192.168.0.103:3000/api/mis-salas', { token_docente: token })
      if (res.data.exito) {
        setMisSalas(res.data.salas || [])
      }
    } catch (error) {
      console.error("Error cargando historial de salas:", error)
    }
  }

  // --- DISTRIBUCIÓN 1: SECUENCIAL EN TIEMPO REAL ---
  // Le quitamos el candado. Siempre que entre alguien o cambie el tamaño, se arman los equipos.
  useEffect(() => {
    if (alumnos.length === 0) {
      setEquipos([])
      return
    }
    
    const nuevosEquipos = []
    for (let i = 0; i < alumnos.length; i += Number(tamanioEquipo)) {
      nuevosEquipos.push(alumnos.slice(i, i + Number(tamanioEquipo)))
    }
    setEquipos(nuevosEquipos)
  }, [alumnos, tamanioEquipo])

  const crearSala = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.post('http://192.168.0.103:3000/api/crear-sala', { 
        token_docente: token,
        max_alumnos_por_equipo: Number(tamanioEquipo) 
      })
      if (res.data.exito) {
        entrarASala({
          codigo_sala: res.data.codigo_sala,
          max_alumnos_por_equipo: tamanioEquipo,
          alumnos: [],
          equipos_json: "[]"
        })
      }
    } catch (error) {
      console.error(error)
      alert('Error al crear la sala')
    }
  }

  const entrarASala = (salaObj) => {
    setCodigoSala(salaObj.codigo_sala)
    setTamanioEquipo(salaObj.max_alumnos_por_equipo || 3)
    
    if (salaObj.equipos_json && salaObj.equipos_json !== "[]") {
      const equiposDesdeDB = JSON.parse(salaObj.equipos_json)
      const equiposPlanos = equiposDesdeDB.map(equipo => equipo.map(alumno => alumno.nombre))
      
      // EL TRUCO PARA NO BORRAR LA BASE DE DATOS:
      // Acomodamos la lista de alumnos en el mismo orden que tenían los equipos guardados.
      const alumnosEnEquipos = equiposPlanos.flat()
      const alumnosTotales = salaObj.alumnos || []
      
      // Por si se unió alguien mientras la sala estaba apagada
      const faltantes = alumnosTotales.filter(a => !alumnosEnEquipos.includes(a))
      
      // Esto dispara el useEffect secuencial, pero replicando el estado de la BD
      setAlumnos([...alumnosEnEquipos, ...faltantes])
    } else {
      setAlumnos(salaObj.alumnos || [])
    }

    socket.emit('conectar_a_sala', salaObj.codigo_sala)
  }

  // --- DISTRIBUCIÓN 2: ALEATORIA BAJO DEMANDA ---
  const generarAleatorios = () => {
    if (alumnos.length === 0) return alert('No hay alumnos para armar equipos')

    // Revolvemos la lista maestra de alumnos. Al hacer esto, React dispara 
    // automáticamente el useEffect secuencial de arriba y los empaqueta al azar.
    const alumnosMezclados = [...alumnos].sort(() => Math.random() - 0.5)
    setAlumnos(alumnosMezclados)

    // AVISO A WEB SOCKET
    socket.emit('equipos_generados', { 
      sala: codigoSala, 
      mensaje: '¡Los equipos han sido generados aleatoriamente!',
      equipos: nuevosEquipos // <-- ¡NUEVO! Le mandamos los equipos armados al Gateway
    })
  }

  const volverAlHistorial = () => {
    setCodigoSala('')
    setAlumnos([])
    setEquipos([])
    cargarMisSalas(localStorage.getItem('token'))
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Panel del Docente 👨‍🏫</h1>
      
      {!codigoSala ? (
        <div style={{ marginTop: '40px' }}>
          
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
            <h2>Mis Salas Anteriores 📂</h2>
            {(!misSalas || misSalas.length === 0) ? (
              <p style={{ color: '#666' }}>Aún no tienes salas creadas.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {misSalas.map((sala, index) => (
                  <div key={index} style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '18px', color: '#007bff' }}>{sala.codigo_sala}</strong>
                      <div style={{ fontSize: '14px', color: '#555' }}>Equipos de: {sala.max_alumnos_por_equipo} | Alumnos: {sala.alumnos ? sala.alumnos.length : 0}</div>
                    </div>
                    <button 
                      onClick={() => entrarASala(sala)}
                      style={{ padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      Entrar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', background: '#e9ecef', padding: '30px', borderRadius: '10px' }}>
            <h2>Empezar una Nueva Clase</h2>
            <p>Genera un código nuevo para tus alumnos de hoy.</p>
            <button onClick={crearSala} style={{ padding: '15px 30px', fontSize: '18px', background: '#007bff', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
              ➕ Generar Nueva Sala
            </button>
          </div>

        </div>
      ) : (
        <div style={{ marginTop: '30px' }}>
          <div style={{ background: '#343a40', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', position: 'relative' }}>
            <button 
              onClick={volverAlHistorial} 
              style={{ position: 'absolute', top: '20px', left: '20px', padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              ⬅ Volver
            </button>
            <h2>Código de Sala: <span style={{ color: '#ffc107', fontSize: '40px', display: 'block' }}>{codigoSala}</span></h2>
            <p>Pide a tus alumnos que ingresen este código</p>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
            <div style={{ flex: 1, background: '#f8f9fa', padding: '20px', borderRadius: '10px' }}>
              <h3>Configuración</h3>
              <label style={{ display: 'block', marginBottom: '10px' }}>Tamaño de los equipos:</label>
              <input 
                type="number" 
                min="1" 
                value={tamanioEquipo} 
                onChange={(e) => setTamanioEquipo(e.target.value)}
                style={{ padding: '10px', width: '100%', marginBottom: '20px', fontSize: '18px' }}
              />
              
              <button 
                onClick={generarAleatorios} 
                style={{ padding: '15px', width: '100%', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                🔀 Generar Equipos Aleatorios
              </button>
              
              <div style={{ marginTop: '20px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
                <h4>Alumnos Conectados ({alumnos.length}):</h4>
                <ul style={{ paddingLeft: '20px' }}>
                  {alumnos.map((alumno, index) => (
                    <li key={index} style={{ padding: '5px 0' }}>{alumno}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ flex: 2, background: '#e9ecef', padding: '20px', borderRadius: '10px' }}>
              <h3>Pizarrón de Equipos</h3>
              {equipos.length === 0 ? (
                <p style={{ color: '#666' }}>Esperando alumnos para armar equipos...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                  {equipos.map((equipo, i) => (
                    <div key={i} style={{ background: 'white', padding: '15px', borderRadius: '8px', borderLeft: '5px solid #28a745', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Equipo {i + 1}</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#555' }}>
                        {equipo.map((integrante, j) => (
                          <li key={j}>{integrante}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}