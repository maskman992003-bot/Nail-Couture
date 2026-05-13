import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import ClientPortal from './components/ClientPortal.jsx'
import ClientLogin from './components/ClientLogin.jsx'
import AdminLobby from './components/AdminLobby.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/lookbook" element={<App />} />
        <Route path="/services" element={<App />} />
        <Route path="/booking" element={<App />} />
        <Route path="/about" element={<App />} />
        <Route path="/check-in" element={<App />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/lobby" element={<AdminLobby />} />
        <Route path="/portal" element={<ClientPortal />} />
        <Route path="/login" element={<ClientLogin />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
