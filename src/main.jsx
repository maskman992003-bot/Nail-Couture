import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ClientLogin from './components/ClientLogin.jsx'
import ClientRegister from './components/ClientRegister.jsx'
import ClientPortal from './components/ClientPortal.jsx'
import CustomerBooking from './components/CustomerBooking.jsx'
import CustomerHistory from './components/CustomerHistory.jsx'
import CustomerLoyalty from './components/CustomerLoyalty.jsx'
import CustomerProfile from './components/CustomerProfile.jsx'
import EditBooking from './components/EditBooking.jsx'
import SuperAdmin from './components/SuperAdmin.jsx'
import Admin from './components/Admin.jsx'
import Cashier from './components/Cashier.jsx'
import Technician from './components/Technician.jsx'
import AdminLobby from './components/AdminLobby.jsx'
import AdminReports from './components/AdminReports.jsx'
import CashierCheckout from './components/CashierCheckout.jsx'
import StaffManagement from './components/StaffManagement.jsx'
import StaffProfile from './components/StaffProfile.jsx'
import StaffSchedule from './components/StaffSchedule.jsx'
import TechnicianSchedule from './components/TechnicianSchedule.jsx'
import Settings from './components/Settings.jsx'
import Services from './components/Services.jsx'
import AdminStock from './components/AdminStock.jsx'
import AdminServices from './components/AdminServices.jsx'
import AdminBookings from './components/AdminBookings.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'

const getHomePath = (role) => {
  switch (role) {
    case 'super_admin':
    case 'owner':
    case 'partner': return '/superadmin';
    case 'admin': return '/admin';
    case 'cashier': return '/cashier';
    case 'technician': return '/technician';
    default: return '/portal';
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/lookbook" element={<App />} />
          <Route path="/services" element={<Services />} />
          <Route path="/booking" element={<App />} />
          <Route path="/about" element={<App />} />
          <Route path="/check-in" element={<App />} />
          <Route path="/login" element={<ClientLogin />} />
          <Route path="/register" element={<ClientRegister />} />

          <Route path="/superadmin" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <SuperAdmin />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/lobby" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <AdminLobby />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/reports" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <AdminReports />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/services" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <AdminServices />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/staff" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <StaffManagement />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/staff/:id" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <StaffProfile />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/settings" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician']}>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/admin/lobby" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLobby />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReports />
            </ProtectedRoute>
          } />
          <Route path="/admin/services" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminServices />
            </ProtectedRoute>
          } />
          <Route path="/admin/staff" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StaffManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/staff/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StaffProfile />
            </ProtectedRoute>
          } />
          <Route path="/admin/stock" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminStock />
            </ProtectedRoute>
          } />
          <Route path="/admin/schedule" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StaffSchedule />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/stock" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <AdminStock />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/schedule" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <StaffSchedule />
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminBookings />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/bookings" element={
            <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner']}>
              <AdminBookings />
            </ProtectedRoute>
          } />

          <Route path="/cashier" element={
            <ProtectedRoute allowedRoles={['cashier']}>
              <Cashier />
            </ProtectedRoute>
          } />
          <Route path="/cashier/checkout" element={
            <ProtectedRoute allowedRoles={['cashier', 'super_admin', 'owner', 'partner']}>
              <CashierCheckout />
            </ProtectedRoute>
          } />
          <Route path="/cashier/reports" element={
            <ProtectedRoute allowedRoles={['cashier', 'super_admin', 'owner', 'partner']}>
              <AdminReports />
            </ProtectedRoute>
          } />

          <Route path="/technician" element={
            <ProtectedRoute allowedRoles={['technician']}>
              <Technician />
            </ProtectedRoute>
          } />
          <Route path="/technician/schedule" element={
            <ProtectedRoute allowedRoles={['technician', 'cashier']}>
              <TechnicianSchedule />
            </ProtectedRoute>
          } />

          <Route path="/portal" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <ClientPortal />
            </ProtectedRoute>
          } />
          <Route path="/customer/book" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerBooking />
            </ProtectedRoute>
          } />
          <Route path="/customer/history" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerHistory />
            </ProtectedRoute>
          } />
          <Route path="/customer/edit/:bookingId" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <EditBooking />
            </ProtectedRoute>
          } />
          <Route path="/customer/loyalty" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerLoyalty />
            </ProtectedRoute>
          } />
          <Route path="/customer/profile" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerProfile />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)