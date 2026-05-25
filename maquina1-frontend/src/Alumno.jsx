// src/Alumno.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { jwtDecode } from 'jwt-decode'

const socket = io('http://192.168.0.103:3000', { autoConnect: false })

const color = {
  purple: '#534AB7', purpleLight: '#EEEDFE', purpleMid: '#AFA9EC',
  green: '#1D9E75', greenLight: '#E1F5EE',
  gray: '#f5f4fb', border: '#e0dff0', text: '#333', muted: '#888',
}
const COLORES_EQUIPO = [color.purple, color.green, '#D85A30', '#D4537E', '#378ADD']

const s = {
  shell: { minHeight: '100vh', background: color.gray, fontFamily: 'system-ui, sans-serif' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'white', borderBottom: `0.5px solid ${color.border}` },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: (bg, fg) => ({ width: '34px', height: '34px', borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500' }),
  topbarName: { fontSize: '14px', fontWeight: '500' },
  topbarRole: { fontSize: '12px', color: color.muted },
  btnSmall: { padding: '6px 12px', background: 'transparent', border: `0.5px solid ${color.border}`, borderRadius: '8px', color: color.muted, fontSize: '13px', cursor: 'pointer' },
  btnDanger: { padding: '6px 12px', background: 'transparent', border: `0.5px solid #ffcccc`, borderRadius: '8px', color: '#c0392b', fontSize: '13px', cursor: 'pointer' },
  main: { padding: '24px', maxWidth: '960px', margin: '0 auto' },
  sectionTitle: { fontSize: '16px', fontWeight: '500', marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' },
  salaCard: { background: 'white', border: `0.5px solid ${color.border}`, borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  salaCode: { fontSize: '15px', fontWeight: '500', color: color.green, marginBottom: '4px' },
  salaMeta: { fontSize: '12px', color: color.muted },
  btnEnter: { padding: '7px 14px', background: color.green, color: color.greenLight, border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  newCard: { background: 'white', border: `0.5px solid ${color.border}`, borderRadius: '12px', padding: '28px', textAlign: 'center' },
  newCardTitle: { fontSize: '16px', fontWeight: '500', marginBottom: '6px' },
  newCardText: { fontSize: '13px', color: color.muted, marginBottom: '20px' },
  codeInput: { padding: '14px', fontSize: '22px', textAlign: 'center', textTransform: 'uppercase', border: `0.5px solid ${color.border}`, borderRadius: '8px', width: '100%', maxWidth: '280px', letterSpacing: '4px', fontWeight: '500', color: color.purple, marginBottom: '12px', boxSizing: 'border-box' },
  btnJoin: { padding: '12px 28px', background: color.green, color: color.greenLight, border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' },
  estadoBar: { background: color.green, color: color.greenLight, padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
  salaBody: { display: 'grid', gridTemplateColumns: '180px 1fr', gap: '16px', padding: '20px 24px', maxWidth: '960px', margin: '0 auto' },
  panel: { background: 'white', border: `0.5px solid ${color.border}`, borderRadius: '12px', padding: '16px' },
  panelTitle: { fontSize: '13px', color: color.muted, marginBottom: '12px' },
  alumnoChip: (esYo) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: `0.5px solid ${color.border}`, fontSize: '13px', fontWeight: esYo ? '500' : '400', color: esYo ? color.purple : color.text }),
  dot: (c) => ({ width: '6px', height: '6px', borderRadius: '50%', background: c, flexShrink: 0 }),
  miEquipoBox: { background: color.purpleLight, border: `0.5px solid ${color.purpleMid}`, borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  miEquipoLabel: { fontSize: '11px', color: color.purple, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' },
  miEquipoNum: { fontSize: '20px', fontWeight: '500', color: '#3C3489', marginBottom: '10px' },
  chip: (highlight) => ({ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: highlight ? '500' : '400', background: highlight ? color.purple : 'white', color: highlight ? color.purpleLight : color.text, border: highlight ? 'none' : `0.5px solid ${color.border}` }),
  equiposGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' },
  equipoCard: (accent, highlight) => ({ background: highlight ? '#f0eeff' : '#fafafa', border: `0.5px solid ${color.border}`, borderRadius: '8px', padding: '12px', borderLeft: `3px solid ${accent}` }),
  equipoNum: (c) => ({ fontSize: '11px', color: c, fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.5px' }),
  equipoMember: (yo) => ({ fontSize: '12px', padding: '2px 0', color: yo ? color.purple : color.text, fontWeight: yo ? '500' : '400' }),
}

export default function Alumno() {
  const [codigoSala, setCodigoSala] = useState('')
  const [unido, setUnido] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState('')
  const [misSalas, setMisSalas] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [miNombre, setMiNombre] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    const dec = jwtDecode(token)
    setMiNombre(dec.nombre)
    socket.connect()
    cargarMisSalas(token)

    socket.on('alumno_unido', data => {
      setAlumnos(prev => prev.includes(data.nombre) ? prev : [...prev, data.nombre])
    })

    // --- FIX: AHORA SINCRONIZAMOS TANTO ALUMNOS COMO EQUIPOS ---
    socket.on('equipos_listos', data => {
      setMensajeEstado(`🎉 ${data.mensaje}`)
      if (data.equipos) setEquipos(data.equipos)
      if (data.alumnos) setAlumnos(data.alumnos) // Reemplazamos nuestra lista con la oficial del profe
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
      if (res.data.exito) setMisSalas(res.data.salas || [])
    } catch (e) { console.error(e) }
  }

  const entrarASala = async (sala) => {
    setCodigoSala(sala.codigo_sala);
    setUnido(true);
    setMensajeEstado('Conectado · Esperando instrucciones...');

    const token = localStorage.getItem('token');
    try {
      // Pedimos los datos frescos de la sala al servidor
      const res = await axios.post('http://192.168.0.103:3000/api/mis-salas-alumno', { token_alumno: token });
      
      if (res.data.exito) {
        const salaActualizada = res.data.salas.find(s => s.codigo_sala === sala.codigo_sala);
        
        // 1. Sincronizamos alumnos
        setAlumnos(salaActualizada?.alumnos || []);
        
        // 2. ¡EL FIX! Sincronizamos equipos inmediatamente al entrar
        if (salaActualizada?.equipos_json && salaActualizada.equipos_json !== '[]') {
          const eq = JSON.parse(salaActualizada.equipos_json).map(e => e.map(a => a.nombre));
          setEquipos(eq);
        } else {
          setEquipos([]);
        }
      }
    } catch (e) {
      console.error("Error al sincronizar equipos iniciales:", e);
    }

    socket.emit('conectar_a_sala', sala.codigo_sala);
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
        await entrarASala({
          codigo_sala: codigoSala.toUpperCase(),
          alumnos: [],
          equipos_json: '[]'
        })
        cargarMisSalas(token)
      } else {
        alert(res.data.mensaje)
      }
    } catch (e) {
      alert('Error al unirse a la sala. Verifica el código.')
    }
  }

  const volverAlInicio = () => {
    setUnido(false)
    setCodigoSala('')
    setAlumnos([])
    setEquipos([])
  }

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    socket.disconnect()
    navigate('/login')
  }

  const iniciales = miNombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  const miEquipoIdx = equipos.findIndex(eq => eq.includes(miNombre))

  return (
    <div style={s.shell}>
      <div style={s.topbar}>
        <div style={s.topbarLeft}>
          <div style={s.avatar(color.greenLight, color.green)}>{iniciales}</div>
          <div>
            <div style={s.topbarName}>{miNombre}</div>
            <div style={s.topbarRole}>Alumno</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unido && <button onClick={volverAlInicio} style={s.btnSmall}>← Salir de la sala</button>}
          <button onClick={cerrarSesion} style={s.btnDanger}>Cerrar sesión</button>
        </div>
      </div>

      {!unido ? (
        <div style={s.main}>
          {misSalas.length > 0 && (
            <>
              <p style={s.sectionTitle}>Mis clases anteriores</p>
              <div style={s.grid}>
                {misSalas.map((sala, i) => (
                  <div key={i} style={s.salaCard}>
                    <div>
                      <div style={s.salaCode}>{sala.codigo_sala}</div>
                      <div style={s.salaMeta}>{sala.alumnos?.length || 0} compañeros</div>
                    </div>
                    <button onClick={() => entrarASala(sala)} style={s.btnEnter}>Reingresar</button>
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={s.newCard}>
            <p style={s.newCardTitle}>Unirse a una sala nueva</p>
            <p style={s.newCardText}>Ingresa el código que te dio tu profesor</p>
            <form onSubmit={manejarUnirse} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <input
                style={s.codeInput}
                type="text"
                placeholder="SALA-XXXX"
                value={codigoSala}
                onChange={e => setCodigoSala(e.target.value)}
                required
              />
              <button type="submit" style={s.btnJoin}>Entrar a la sala</button>
            </form>
          </div>
        </div>
      ) : (
        <div>
          <div style={s.estadoBar}>✓ {mensajeEstado}</div>
          <div style={s.salaBody}>
            <div>
              <div style={s.panel}>
                <p style={s.panelTitle}>Compañeros ({alumnos.length})</p>
                {alumnos.map((a, i) => {
                  const esYo = a === miNombre
                  return (
                    <div key={i} style={s.alumnoChip(esYo)}>
                      <span style={s.dot(esYo ? color.purple : color.green)}></span>
                      {a}{esYo && ' (tú)'}
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              {miEquipoIdx >= 0 && (
                <div style={s.miEquipoBox}>
                  <div style={s.miEquipoLabel}>⭐ Tu equipo</div>
                  <div style={s.miEquipoNum}>Equipo {miEquipoIdx + 1}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {equipos[miEquipoIdx].map((m, j) => (
                      <span key={j} style={s.chip(m === miNombre)}>
                        {m}{m === miNombre && ' (tú)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={s.panel}>
                <p style={s.panelTitle}>
                  {equipos.length === 0
                    ? 'Esperando que el profesor genere los equipos...'
                    : 'Todos los equipos'}
                </p>
                {equipos.length > 0 && (
                  <div style={s.equiposGrid}>
                    {equipos.map((eq, i) => {
                      const accent = COLORES_EQUIPO[i % COLORES_EQUIPO.length]
                      const esMiEquipo = eq.includes(miNombre)
                      return (
                        <div key={i} style={s.equipoCard(accent, esMiEquipo)}>
                          <div style={s.equipoNum(accent)}>Equipo {i + 1}{esMiEquipo && ' ⭐'}</div>
                          {eq.map((m, j) => (
                            <div key={j} style={s.equipoMember(m === miNombre)}>{m}</div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}