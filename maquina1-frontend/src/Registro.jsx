// src/Registro.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4fb', padding: '24px' },
  card: { background: 'white', border: '0.5px solid #e0dff0', borderRadius: '16px', padding: '36px 32px', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
  brandWrap: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '8px' },
  brandIcon: { width: '40px', height: '40px', background: '#534AB7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  brandName: { fontSize: '18px', fontWeight: '500' },
  sub: { fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '24px' },
  label: { display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '0.5px solid #d0cfe8', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
  fieldGroup: { marginBottom: '16px' },
  warningBox: { background: '#fffbf0', border: '0.5px solid #f0d080', borderRadius: '8px', padding: '12px', marginBottom: '16px' },
  warningLabel: { fontSize: '13px', color: '#7a5c00', marginBottom: '8px', display: 'block' },
  btnPrimary: { width: '100%', padding: '11px', background: '#534AB7', color: '#EEEDFE', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  btnOutline: { width: '100%', padding: '10px', background: 'transparent', color: '#534AB7', border: '0.5px solid #534AB7', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '10px' },
  divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' },
  dividerLine: { flex: 1, border: 'none', borderTop: '0.5px solid #eee' },
  dividerText: { fontSize: '12px', color: '#aaa' },
  error: { background: '#fff0f0', border: '0.5px solid #ffcccc', color: '#c0392b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' },
  success: { background: '#f0fff4', border: '0.5px solid #b2dfcc', color: '#1a6b3a', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' },
}

export default function Registro() {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('alumno')
  const [codigoSecreto, setCodigoSecreto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const manejarRegistro = async (e) => {
    e.preventDefault()
    setError(''); setMensaje('')
    try {
      const resRegistro = await axios.post('http://192.168.50.156:3000/api/registro', {
        nombre, correo, password, rol,
        codigo_secreto: rol === 'docente' ? codigoSecreto : undefined
      })
      if (resRegistro.data.exito) {
        setMensaje('✅ ¡Cuenta creada! Iniciando sesión...')
        const resLogin = await axios.post('http://192.168.50.156:3000/api/login', { correo, password })
        if (resLogin.data.exito) {
          localStorage.setItem('token', resLogin.data.token)
          const dec = jwtDecode(resLogin.data.token)
          setTimeout(() => navigate(dec.rol === 'docente' ? '/docente' : '/alumno'), 1000)
        }
      } else {
        setError(resRegistro.data.mensaje)
      }
    } catch (err) {
      setError('Error al conectar con el servidor.')
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.brandWrap}>
          <div style={s.brandIcon}>🏫</div>
          <span style={s.brandName}>TeamSync</span>
        </div>
        <p style={s.sub}>Crea tu cuenta</p>

        {error && <div style={s.error}>⚠ {error}</div>}
        {mensaje && <div style={s.success}>{mensaje}</div>}

        <form onSubmit={manejarRegistro}>
          <div style={s.row2}>
            <div>
              <label style={s.label}>Nombre completo</label>
              <input style={s.input} type="text" value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div>
              <label style={s.label}>Rol</label>
              <select style={s.input} value={rol} onChange={e => setRol(e.target.value)}>
                <option value="alumno">Alumno</option>
                <option value="docente">Docente</option>
              </select>
            </div>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Correo electrónico</label>
            <input style={s.input} type="email" value={correo} onChange={e => setCorreo(e.target.value)} required />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.label}>Contraseña</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {rol === 'docente' && (
            <div style={s.warningBox}>
              <label style={s.warningLabel}>🔑 Código de autorización docente</label>
              <input style={s.input} type="password" value={codigoSecreto} onChange={e => setCodigoSecreto(e.target.value)} required />
            </div>
          )}
          <button type="submit" style={s.btnPrimary}>Registrarme</button>
        </form>

        <div style={s.divider}>
          <hr style={s.dividerLine} />
          <span style={s.dividerText}>o</span>
          <hr style={s.dividerLine} />
        </div>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <button style={s.btnOutline}>Ya tengo cuenta</button>
        </Link>
      </div>
    </div>
  )
}