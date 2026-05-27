// src/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4fb', padding: '24px' },
  card: { background: 'white', border: '0.5px solid #e0dff0', borderRadius: '16px', padding: '36px 32px', width: '100%', maxWidth: '380px', boxSizing: 'border-box' },
  brandWrap: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '8px' },
  brandIcon: { width: '40px', height: '40px', background: '#534AB7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  brandName: { fontSize: '18px', fontWeight: '500' },
  sub: { fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '28px' },
  label: { display: 'block', fontSize: '13px', color: '#555', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', border: '0.5px solid #d0cfe8', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '11px', background: '#534AB7', color: '#EEEDFE', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginTop: '8px' },
  btnOutline: { width: '100%', padding: '10px', background: 'transparent', color: '#534AB7', border: '0.5px solid #534AB7', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '10px' },
  divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' },
  dividerLine: { flex: 1, border: 'none', borderTop: '0.5px solid #eee' },
  dividerText: { fontSize: '12px', color: '#aaa' },
  error: { background: '#fff0f0', border: '0.5px solid #ffcccc', color: '#c0392b', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' },
  fieldGroup: { marginBottom: '16px' },
}

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const manejarLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post('http://192.168.50.156:3000/api/login', { correo, password })
      if (res.data.exito) {
        const token = res.data.token
        localStorage.setItem('token', token)
        const decodificado = jwtDecode(token)
        if (decodificado.rol === 'docente') navigate('/docente')
        else if (decodificado.rol === 'alumno') navigate('/alumno')
      } else {
        setError(res.data.mensaje)
      }
    } catch (err) {
      setError('Error al conectar con el servidor.')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brandWrap}>
          <div style={styles.brandIcon}>🏫</div>
          <span style={styles.brandName}>TeamSync</span>
        </div>
        <p style={styles.sub}>Inicia sesión para continuar</p>

        {error && <div style={styles.error}>⚠ {error}</div>}

        <form onSubmit={manejarLogin}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Correo electrónico</label>
            <input style={styles.input} type="email" placeholder="tu@correo.com" value={correo} onChange={e => setCorreo(e.target.value)} required />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Contraseña</label>
            <input style={styles.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" style={styles.btnPrimary}>Entrar</button>
        </form>

        <div style={styles.divider}>
          <hr style={styles.dividerLine} />
          <span style={styles.dividerText}>o</span>
          <hr style={styles.dividerLine} />
        </div>
        <button onClick={() => navigate('/registro')} style={styles.btnOutline}>Crear una cuenta nueva</button>
      </div>
    </div>
  )
}