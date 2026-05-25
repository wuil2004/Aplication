// src/Registro.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

export default function Registro() {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('alumno')
  const [codigoSecreto, setCodigoSecreto] = useState('') // Solo para profes
  
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  
  const navigate = useNavigate()

  const manejarRegistro = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    try {
      // OJO: Si pruebas desde otro celular, recuerda cambiar 'localhost' por la IP de tu Máquina 2
      const res = await axios.post('http://192.168.0.103:3000/api/registro', { 
        nombre, 
        correo, 
        password, 
        rol,
        codigo_secreto: rol === 'docente' ? codigoSecreto : undefined
      })
      
      if (res.data.exito) {
        setMensaje('✅ ¡Registro exitoso! Redirigiendo al login...')
        // Esperamos 2 segundos para que lea el mensaje y lo mandamos al login
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError(res.data.mensaje)
      }
    } catch (err) {
      console.error(err)
      setError('Error al conectar con el servidor.')
    }
  }

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h2>Crear Cuenta 📝</h2>
      
      {error && <p style={{ color: 'red', background: '#ffe6e6', padding: '10px', borderRadius: '5px' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green', background: '#e6ffe6', padding: '10px', borderRadius: '5px' }}>{mensaje}</p>}
      
      <form onSubmit={manejarRegistro} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label>Nombre Completo:</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
        </div>

        <div>
          <label>Correo Electrónico:</label>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
        </div>
        
        <div>
          <label>Contraseña:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
        </div>

        <div>
          <label>¿Qué rol tienes?</label>
          <select value={rol} onChange={(e) => setRol(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px' }}>
            <option value="alumno">Soy Alumno</option>
            <option value="docente">Soy Docente</option>
          </select>
        </div>

        {/* Este campo solo aparece si seleccionan "docente" */}
        {rol === 'docente' && (
          <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '5px' }}>
            <label>Código de Autorización (Profe):</label>
            <input type="password" value={codigoSecreto} onChange={(e) => setCodigoSecreto(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px' }} />
          </div>
        )}
        
        <button type="submit" style={{ padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>
          Registrarme
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
          ¿Ya tienes cuenta? Inicia sesión aquí
        </Link>
      </div>
    </div>
  )
}