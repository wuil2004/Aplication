// src/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  // Herramienta de React Router para cambiar de pantalla
  const navigate = useNavigate()

  const manejarLogin = async (e) => {
    e.preventDefault() // Evita que la página se recargue al enviar el formulario
    setError('')

    try {
      // Tu IP real ya está configurada aquí
      const res = await axios.post('http://192.168.50.214:3000/api/login', { 
        correo: correo, 
        password: password 
      })
      
      if (res.data.exito) {
        const token = res.data.token
        
        // 1. Guardamos el token en el navegador (LocalStorage)
        localStorage.setItem('token', token)
        
        // 2. Leemos qué dice adentro el token usando jwt-decode
        const decodificado = jwtDecode(token)
        console.log("Token decodificado:", decodificado)
        
        // 3. ¡La Redirección Inteligente!
        if (decodificado.rol === 'docente') {
          navigate('/docente')
        } else if (decodificado.rol === 'alumno') {
          navigate('/alumno')
        }
      } else {
        setError(res.data.mensaje)
      }
    } catch (err) {
      console.error(err)
      setError('Error al conectar con el servidor. ¿Está prendida la Máquina 2?')
    }
  }

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h2>Iniciar Sesión 🔐</h2>
      
      {error && <p style={{ color: 'red', background: '#ffe6e6', padding: '10px', borderRadius: '5px' }}>{error}</p>}
      
      <form onSubmit={manejarLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label>Correo Electrónico:</label>
          <input 
            type="email" 
            value={correo} 
            onChange={(e) => setCorreo(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </div>
        
        <div>
          <label>Contraseña:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </div>
        
        <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}>
          Entrar
        </button>
      </form>

      {/* Aquí está el bloque nuevo que agregamos para ir al Registro */}
      <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <p style={{ color: '#666', marginBottom: '10px' }}>¿No tienes cuenta?</p>
        <button 
          onClick={() => navigate('/registro')} 
          style={{ background: 'transparent', color: '#007bff', border: '1px solid #007bff', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', width: '100%' }}
        >
          Crear una cuenta nueva
        </button>
      </div>
    </div>
  )
}