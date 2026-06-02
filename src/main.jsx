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
import CustomerServices from './components/CustomerServices.jsx'
import CustomerManagementHistory from './components/CustomerManagementHistory.jsx'
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
import AdminInventory from './components/AdminInventory.jsx'
import AdminServices from './components/AdminServices.jsx'
import AdminBookings from './components/AdminBookings.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
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
               <ProtectedRoute allowedRoles={['super_admin']}>
                 <SuperAdmin />
               </ProtectedRoute>
             } />
             <Route path="/superadmin/lobby" element={
               <ProtectedRoute allowedRoles={['super_admin']}>
                 <AdminLobby />
               </ProtectedRoute>
             } />
             <Route path="/superadmin/reports" element={
               <ProtectedRoute allowedRoles={['super_admin']}>
                 <AdminReports />
               </ProtectedRoute>
             } />
             <Route path="/superadmin/services" element={
               <ProtectedRoute allowedRoles={['super_admin']}>
                 <AdminServices />
               </ProtectedRoute>
             } />
             <Route path="/superadmin/staff" element={
               <ProtectedRoute allowedRoles={['super_admin']}>
                 <StaffManagement />
               </ProtectedRoute>
             } />
              <Route path="/:role/staff/:id" element={
                <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner', 'admin']}>
                  <StaffProfile />
                </ProtectedRoute>
              } />
              <Route path="/:role/staff/schedule" element={
                <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner', 'admin']}>
                  <StaffSchedule />
                </ProtectedRoute>
              } />
             <Route path="/superadmin/settings" element={
               <ProtectedRoute allowedRoles={['super_admin', 'admin', 'cashier', 'technician']}>
                 <Settings />
               </ProtectedRoute>
             } />
            <Route path="/superadmin/inventory" element={
               <ProtectedRoute allowedRoles={['super_admin']}>
                 <AdminInventory />
               </ProtectedRoute>
             } />
              <Route path="/:role/staff/:id/schedule" element={
                <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner', 'admin']}>
                  <StaffSchedule />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/bookings" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminBookings />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/customers" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <CustomerManagementHistory />
                </ProtectedRoute>
              } />
            
              {/* Owner Routes */}
             <Route path="/owner" element={
               <ProtectedRoute allowedRoles={['owner']}>
                 <SuperAdmin />
               </ProtectedRoute>
             } />
             <Route path="/owner/lobby" element={
               <ProtectedRoute allowedRoles={['owner']}>
                 <AdminLobby />
               </ProtectedRoute>
             } />
             <Route path="/owner/reports" element={
               <ProtectedRoute allowedRoles={['owner']}>
                 <AdminReports />
               </ProtectedRoute>
             } />
             <Route path="/owner/services" element={
               <ProtectedRoute allowedRoles={['owner']}>
                 <AdminServices />
               </ProtectedRoute>
             } />
             <Route path="/owner/staff" element={
               <ProtectedRoute allowedRoles={['owner']}>
                 <StaffManagement />
               </ProtectedRoute>
             } />
             <Route path="/owner/staff/:id" element={
               <ProtectedRoute allowedRoles={['owner']}>
                 <StaffProfile />
               </ProtectedRoute>
             } />
             <Route path="/owner/settings" element={
               <ProtectedRoute allowedRoles={['owner', 'admin', 'cashier', 'technician']}>
                 <Settings />
               </ProtectedRoute>
             } />
              <Route path="/owner/inventory" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <AdminInventory />
                </ProtectedRoute>
              } />

              <Route path="/owner/bookings" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <AdminBookings />
                </ProtectedRoute>
              } />
              <Route path="/owner/customers" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <CustomerManagementHistory />
                </ProtectedRoute>
              } />
            
              {/* Partner Routes */}
             <Route path="/partner" element={
               <ProtectedRoute allowedRoles={['partner']}>
                 <SuperAdmin />
               </ProtectedRoute>
             } />
             <Route path="/partner/lobby" element={
               <ProtectedRoute allowedRoles={['partner']}>
                 <AdminLobby />
               </ProtectedRoute>
             } />
             <Route path="/partner/reports" element={
               <ProtectedRoute allowedRoles={['partner']}>
                 <AdminReports />
               </ProtectedRoute>
             } />
              <Route path="/partner/services" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <AdminServices />
                </ProtectedRoute>
              } />
              <Route path="/partner/customers" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <CustomerManagementHistory />
                </ProtectedRoute>
              } />
              <Route path="/partner/staff" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <StaffManagement />
                </ProtectedRoute>
              } />
             <Route path="/partner/staff/:id" element={
               <ProtectedRoute allowedRoles={['partner']}>
                 <StaffProfile />
               </ProtectedRoute>
             } />
             <Route path="/partner/settings" element={
               <ProtectedRoute allowedRoles={['partner', 'admin', 'cashier', 'technician']}>
                 <Settings />
               </ProtectedRoute>
             } />
              <Route path="/partner/inventory" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <AdminInventory />
                </ProtectedRoute>
              } />

             <Route path="/partner/bookings" element={
               <ProtectedRoute allowedRoles={['partner']}>
                 <AdminBookings />
               </ProtectedRoute>
             } />

              {/* Admin Routes */}
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

             <Route path="/admin/bookings" element={
               <ProtectedRoute allowedRoles={['admin']}>
                 <AdminBookings />
               </ProtectedRoute>
             } />
             <Route path="/admin/services" element={
               <ProtectedRoute allowedRoles={['admin']}>
                 <AdminServices />
               </ProtectedRoute>
             } />
             <Route path="/admin/settings" element={
               <ProtectedRoute allowedRoles={['admin', 'cashier', 'technician']}>
                 <Settings />
               </ProtectedRoute>
             } />

            <Route path="/cashier" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <Cashier />
              </ProtectedRoute>
            } />
            <Route path="/cashier/lobby" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <AdminLobby />
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
            <Route path="/cashier/settings" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <Settings />
              </ProtectedRoute>
            } />

            <Route path="/technician" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <Technician />
              </ProtectedRoute>
            } />
            <Route path="/technician/settings" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <Settings />
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
            <Route path="/customer/services" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerServices />
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
    </ThemeProvider>
  </StrictMode>,
)