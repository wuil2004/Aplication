import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Docente from './Docente'
import Alumno from './Alumno' // <-- Importamos el componente real

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/docente" element={<Docente />} />
        <Route path="/alumno" element={<Alumno />} /> {/* <-- Lo conectamos aquí */}
      </Routes>
    </BrowserRouter>
  )
}

export default App