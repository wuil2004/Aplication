// src/Docente.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { jwtDecode } from 'jwt-decode'

const socket = io('http://192.168.0.103:3000', { autoConnect: false })

const color = {
  purple: '#534AB7', purpleLight: '#EEEDFE', purpleMid: '#AFA9EC',
  red: '#D85A30', redLight: '#FAECE7',
  green: '#1D9E75', greenLight: '#E1F5EE',
  gray: '#f5f4fb', border: '#e0dff0', text: '#333', muted: '#888',
}

const s = {
  shell: { minHeight: '100vh', background: color.gray, fontFamily: 'system-ui, sans-serif' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'white', borderBottom: `0.5px solid ${color.border}` },
  avatar: (bg, fg) => ({ width: '34px', height: '34px', borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500' }),
  topbarLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  topbarName: { fontSize: '14px', fontWeight: '500' },
  topbarRole: { fontSize: '12px', color: color.muted },
  btnSmall: { padding: '6px 12px', background: 'transparent', border: `0.5px solid ${color.border}`, borderRadius: '8px', color: color.muted, fontSize: '13px', cursor: 'pointer' },
  btnDanger: { padding: '6px 12px', background: 'transparent', border: `0.5px solid #ffcccc`, borderRadius: '8px', color: '#c0392b', fontSize: '13px', cursor: 'pointer' },
  main: { padding: '24px', maxWidth: '960px', margin: '0 auto' },
  sectionTitle: { fontSize: '16px', fontWeight: '500', marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' },
  salaCard: { background: 'white', border: `0.5px solid ${color.border}`, borderRadius: '12px', padding: '16px' },
  salaCode: { fontSize: '15px', fontWeight: '500', color: color.purple, marginBottom: '4px' },
  salaMeta: { fontSize: '12px', color: color.muted, marginBottom: '12px' },
  salaActions: { display: 'flex', gap: '8px' },
  btnEnter: { flex: 1, padding: '7px 0', background: color.purple, color: color.purpleLight, border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  btnDel: { padding: '7px 10px', background: 'transparent', border: `0.5px solid #ffcccc`, color: '#c0392b', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  newCard: { background: 'white', border: `0.5px dashed ${color.purpleMid}`, borderRadius: '12px', padding: '28px', textAlign: 'center' },
  newCardText: { fontSize: '13px', color: color.muted, marginBottom: '16px' },
  btnNew: { padding: '10px 22px', background: color.purple, color: color.purpleLight, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  salaHeader: { background: color.purple, padding: '20px 24px', color: color.purpleLight, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  salaHeaderTitle: { fontSize: '13px', opacity: .7, marginBottom: '4px' },
  salaCodeBig: { fontSize: '28px', fontWeight: '500', letterSpacing: '3px' },
  salaBody: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', padding: '20px 24px', maxWidth: '960px', margin: '0 auto' },
  panel: { background: 'white', border: `0.5px solid ${color.border}`, borderRadius: '12px', padding: '16px' },
  panelTitle: { fontSize: '13px', color: color.muted, marginBottom: '12px' },
  cfgLabel: { fontSize: '12px', color: color.muted, marginBottom: '4px' },
  cfgInput: { width: '100%', padding: '8px 10px', border: `0.5px solid ${color.border}`, borderRadius: '8px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' },
  btnRandom: { width: '100%', padding: '10px', background: color.red, color: color.redLight, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  alumnoChip: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: `0.5px solid ${color.border}`, fontSize: '13px' },
  dot: { width: '6px', height: '6px', borderRadius: '50%', background: color.green, flexShrink: 0 },
  equiposGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' },
  equipoCard: (accent) => ({ background: '#fafafa', border: `0.5px solid ${color.border}`, borderRadius: '8px', padding: '12px', borderLeft: `3px solid ${accent}` }),
  equipoNum: (c) => ({ fontSize: '11px', color: c, fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.5px' }),
  equipoMember: { fontSize: '12px', color: color.text, padding: '2px 0' },
}

const COLORES_EQUIPO = [color.purple, color.green, color.red, '#D4537E', '#378ADD']

export default function Docente() {
  const [codigoSala, setCodigoSala] = useState('')
  const [alumnos, setAlumnos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [tamanioEquipo, setTamanioEquipo] = useState(3)
  const [misSalas, setMisSalas] = useState([])
  const [miNombre, setMiNombre] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    const decodificado = jwtDecode(token)
    setMiNombre(decodificado.nombre)
    socket.connect()
    cargarMisSalas(token)
    
    socket.on('alumno_unido', (data) => {
      // Al recibir un nuevo alumno, el profe actualiza su estado. 
      // El useEffect de abajo se dispara y re-transmite la lista a todos.
      setAlumnos(prev => prev.includes(data.nombre) ? prev : [...prev, data.nombre])
    })
    
    return () => { socket.off('alumno_unido'); socket.disconnect() }
  }, [navigate])

  const cargarMisSalas = async (token) => {
    try {
      const res = await axios.post('http://192.168.0.103:3000/api/mis-salas', { token_docente: token })
      if (res.data.exito) setMisSalas(res.data.salas || [])
    } catch (e) { console.error(e) }
  }

  // --- SINCRONIZACIÓN AUTORITARIA ---
  useEffect(() => {
    if (alumnos.length === 0) { setEquipos([]); return }
    const nuevos = []
    for (let i = 0; i < alumnos.length; i += Number(tamanioEquipo)) {
      nuevos.push(alumnos.slice(i, i + Number(tamanioEquipo)))
    }
    setEquipos(nuevos)

    // Avisa a todos los alumnos la lista OFICIAL y actualizada de alumnos y equipos
    if (codigoSala) {
      socket.emit('equipos_generados', { 
        sala: codigoSala, 
        mensaje: 'Actualización en vivo', 
        equipos: nuevos,
        alumnos: alumnos 
      })
      
      // Guardado permanente en Base de Datos
      axios.post('http://192.168.0.103:3000/api/guardar-equipos', {
        codigo_sala: codigoSala,
        token_docente: localStorage.getItem('token'),
        equipos_json: JSON.stringify(nuevos)
      }).catch(e => console.error("Error guardando en BD"));
    }
  }, [alumnos, tamanioEquipo, codigoSala])

  const crearSala = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.post('http://192.168.0.103:3000/api/crear-sala', { token_docente: token, max_alumnos_por_equipo: Number(tamanioEquipo) })
      if (res.data.exito) entrarASala({ codigo_sala: res.data.codigo_sala, max_alumnos_por_equipo: tamanioEquipo, alumnos: [], equipos_json: '[]' })
    } catch (e) { alert('Error al crear la sala') }
  }

  const entrarASala = (salaObj) => {
    setCodigoSala(salaObj.codigo_sala)
    setTamanioEquipo(salaObj.max_alumnos_por_equipo || 3)
    if (salaObj.equipos_json && salaObj.equipos_json !== '[]') {
      const eq = JSON.parse(salaObj.equipos_json).map(e => e.map(a => a.nombre))
      const enEquipos = eq.flat()
      const faltantes = (salaObj.alumnos || []).filter(a => !enEquipos.includes(a))
      setAlumnos([...enEquipos, ...faltantes])
    } else {
      setAlumnos(salaObj.alumnos || [])
    }
    socket.emit('conectar_a_sala', salaObj.codigo_sala)
  }

  const generarAleatorios = () => {
    if (alumnos.length === 0) return alert('No hay alumnos')
    const mezclados = [...alumnos].sort(() => Math.random() - 0.5)
    setAlumnos(mezclados) // Esto dispara el useEffect de sincronización de arriba
  }

  const manejarEliminarSala = async (codigo) => {
    if (!window.confirm(`¿Eliminar la sala ${codigo}?`)) return
    const token = localStorage.getItem('token')
    const res = await axios.post('http://192.168.0.103:3000/api/eliminar-sala', { codigo_sala: codigo, token_docente: token })
    if (res.data.exito) setMisSalas(misSalas.filter(s => s.codigo_sala !== codigo))
    else alert(res.data.mensaje)
  }

  const volverAlHistorial = () => {
    setCodigoSala(''); setAlumnos([]); setEquipos([])
    socket.disconnect(); socket.connect()
    cargarMisSalas(localStorage.getItem('token'))
  }

  const cerrarSesion = () => { localStorage.removeItem('token'); socket.disconnect(); navigate('/login') }

  const iniciales = miNombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div style={s.shell}>
      <div style={s.topbar}>
        <div style={s.topbarLeft}>
          <div style={s.avatar(color.purpleLight, color.purple)}>{iniciales}</div>
          <div>
            <div style={s.topbarName}>{miNombre}</div>
            <div style={s.topbarRole}>Docente</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {codigoSala && <button onClick={volverAlHistorial} style={s.btnSmall}>← Volver</button>}
          <button onClick={cerrarSesion} style={s.btnDanger}>Cerrar sesión</button>
        </div>
      </div>

      {!codigoSala ? (
        <div style={s.main}>
          <p style={s.sectionTitle}>Mis salas <span style={{ fontSize: '12px', color: color.muted, fontWeight: '400' }}>{misSalas.length} salas</span></p>
          {misSalas.length > 0 && (
            <div style={s.grid}>
              {misSalas.map((sala, i) => (
                <div key={i} style={s.salaCard}>
                  <div style={s.salaCode}>{sala.codigo_sala}</div>
                  <div style={s.salaMeta}>Equipos de {sala.max_alumnos_por_equipo} · {sala.alumnos?.length || 0} alumnos</div>
                  <div style={s.salaActions}>
                    <button onClick={() => entrarASala(sala)} style={s.btnEnter}>Entrar</button>
                    <button onClick={() => manejarEliminarSala(sala.codigo_sala)} style={s.btnDel}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={s.newCard}>
            <p style={s.newCardText}>Genera un código nuevo para tu clase de hoy</p>
            <button onClick={crearSala} style={s.btnNew}>+ Nueva sala</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={s.salaHeader}>
            <div>
              <p style={s.salaHeaderTitle}>Código de sala</p>
              <div style={s.salaCodeBig}>{codigoSala}</div>
            </div>
            <div style={{ fontSize: '13px', opacity: .75, textAlign: 'right' }}>Comparte este código<br />con tus alumnos</div>
          </div>
          <div style={s.salaBody}>
            <div>
              <div style={{ ...s.panel, marginBottom: '12px' }}>
                <p style={s.panelTitle}>Configuración</p>
                <div style={s.cfgLabel}>Tamaño de equipos</div>
                <input style={s.cfgInput} type="number" min="1" value={tamanioEquipo} onChange={e => setTamanioEquipo(e.target.value)} />
                <button onClick={generarAleatorios} style={s.btnRandom}>🔀 Aleatorio</button>
              </div>
              <div style={s.panel}>
                <p style={s.panelTitle}>Alumnos conectados <strong style={{ color: color.text }}>{alumnos.length}</strong></p>
                {alumnos.map((a, i) => (
                  <div key={i} style={s.alumnoChip}><span style={s.dot}></span>{a}</div>
                ))}
              </div>
            </div>
            <div style={s.panel}>
              <p style={s.panelTitle}>Pizarrón de equipos</p>
              {equipos.length === 0
                ? <p style={{ color: color.muted, fontSize: '14px' }}>Esperando alumnos...</p>
                : <div style={s.equiposGrid}>
                    {equipos.map((eq, i) => {
                      const accent = COLORES_EQUIPO[i % COLORES_EQUIPO.length]
                      return (
                        <div key={i} style={s.equipoCard(accent)}>
                          <div style={s.equipoNum(accent)}>Equipo {i + 1}</div>
                          {eq.map((m, j) => <div key={j} style={s.equipoMember}>{m}</div>)}
                        </div>
                      )
                    })}
                  </div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}