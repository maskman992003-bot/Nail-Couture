import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Admin from './components/Admin.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import ClientPortal from './components/ClientPortal.jsx'
import ClientLogin from './components/ClientLogin.jsx'
import AdminLobby from './components/AdminLobby.jsx'
import AdminReports from './components/AdminReports.jsx'
import CashierCheckout from './components/CashierCheckout.jsx'
import StaffManagement from './components/StaffManagement.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { RequireAuth } from './components/RequireAuth.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/lookbook" element={<App />} />
          <Route path="/services" element={<App />} />
          <Route path="/booking" element={<App />} />
          <Route path="/about" element={<App />} />
          <Route path="/check-in" element={<App />} />
          <Route path="/login" element={<ClientLogin />} />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/admin/lobby" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner', 'admin']}>
              <AdminLobby />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner', 'admin']}>
              <AdminReports />
            </ProtectedRoute>
          } />
          <Route path="/admin/staff" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <StaffManagement />
            </ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute allowedRoles={['cashier', 'super_admin', 'owner', 'partner']}>
              <CashierCheckout />
            </ProtectedRoute>
          } />

          <Route path="/portal" element={
            <RequireAuth>
              <ClientPortal />
            </RequireAuth>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)