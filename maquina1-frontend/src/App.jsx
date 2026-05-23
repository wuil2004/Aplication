// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Registro from './Registro' // <-- 1. Importamos el Registro
import Docente from './Docente'
import Alumno from './Alumno'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} /> {/* <-- 2. Agregamos la ruta */}
        <Route path="/docente" element={<Docente />} />
        <Route path="/alumno" element={<Alumno />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App