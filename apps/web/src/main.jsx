import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './lib/supabase.js'
import App from './App.jsx'
import ClientLogin from './components/ClientLogin.jsx'
import ClientRegister from './components/ClientRegister.jsx'
import ClientPortal from './components/ClientPortal.jsx'
import CustomerBooking from './components/CustomerBooking.jsx'
import CustomerHistory from './components/CustomerHistory.jsx'
import CustomerLoyalty from './components/CustomerLoyalty.jsx'
import CustomerProfile from './components/CustomerProfile.jsx'
import CustomerSettings from './components/CustomerSettings.jsx'
import CustomerServices from './components/CustomerServices.jsx'
import CustomerManagementHistory from './components/CustomerManagementHistory.jsx'
import StaffCustomerDetail from './components/StaffCustomerDetail.jsx'
import SalonActivity from './components/SalonActivity.jsx'
import Announcements from './components/Announcements.jsx'
import Promotions from './components/Promotions.jsx'
import SalonUpdates from './components/SalonUpdates.jsx'
import StaffReviews from './components/StaffReviews.jsx'
import EditBooking from './components/EditBooking.jsx'
import SuperAdmin from './components/SuperAdmin.jsx'
import Admin from './components/Admin.jsx'
import Cashier from './components/Cashier.jsx'
import Technician from './components/Technician.jsx'
import TechnicianTips from './components/TechnicianTips.jsx'
import AdminLobby from './components/AdminLobby.jsx'
import AdminReports from './components/AdminReports.jsx'
import CashierCheckout from './components/CashierCheckout.jsx'
import CashierTransactions from './components/CashierTransactions.jsx'
import StaffManagement from './components/StaffManagement.jsx'
import StaffProfile from './components/StaffProfile.jsx'
import StaffSchedule from './components/StaffSchedule.jsx'
import TechnicianSchedule from './components/TechnicianSchedule.jsx'
import Settings from './components/Settings.jsx'
import Services from './components/Services.jsx'
import FitnessAssessmentPublicPage from './components/fitness/FitnessAssessmentPublicPage.jsx'
import FitnessAssessmentPortalPage from './components/fitness/FitnessAssessmentPortalPage.jsx'
import NailAssessmentPublicPage from './components/nails/NailAssessmentPublicPage.jsx'
import NailAssessmentPortalPage from './components/nails/NailAssessmentPortalPage.jsx'
import AdminInventory from './components/AdminInventory.jsx'
import AdminServices from './components/AdminServices.jsx'
import AdminBookings from './components/AdminBookings.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<App />} />
            <Route path="/lookbook" element={<App />} />
            <Route path="/services" element={<Services />} />
            <Route path="/fitness-assessment" element={<FitnessAssessmentPublicPage />} />
            <Route path="/nail-assessment" element={<NailAssessmentPublicPage />} />
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
              <Route path="/superadmin/schedule" element={
                <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner', 'admin']}>
                  <StaffSchedule />
                </ProtectedRoute>
              } />
              <Route path="/admin/schedule" element={
                <ProtectedRoute allowedRoles={['super_admin', 'owner', 'partner', 'admin']}>
                  <StaffSchedule />
                </ProtectedRoute>
              } />
              <Route path="/technician/schedule" element={
                <ProtectedRoute allowedRoles={['cashier', 'technician']}>
                  <TechnicianSchedule />
                </ProtectedRoute>
              } />
              <Route path="/cashier/schedule" element={
                <ProtectedRoute allowedRoles={['cashier', 'technician']}>
                  <TechnicianSchedule />
                </ProtectedRoute>
              } />
              <Route path="/owner/schedule" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <StaffSchedule />
                </ProtectedRoute>
              } />
              <Route path="/partner/schedule" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <StaffSchedule />
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
              <Route path="/superadmin/customers/:id" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <StaffCustomerDetail />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/salon-activity" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SalonActivity />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/announcements" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Announcements />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/promotions" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <Promotions />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/reviews" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <StaffReviews />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/salon-updates" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SalonUpdates />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/fitness-assessment" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <FitnessAssessmentPortalPage />
                </ProtectedRoute>
              } />
              <Route path="/superadmin/nail-assessment" element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <NailAssessmentPortalPage />
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
              <Route path="/owner/customers/:id" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <StaffCustomerDetail />
                </ProtectedRoute>
              } />
              <Route path="/owner/salon-activity" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <SalonActivity />
                </ProtectedRoute>
              } />
              <Route path="/owner/announcements" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <Announcements />
                </ProtectedRoute>
              } />
              <Route path="/owner/promotions" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <Promotions />
                </ProtectedRoute>
              } />
              <Route path="/owner/reviews" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <StaffReviews />
                </ProtectedRoute>
              } />
              <Route path="/owner/salon-updates" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <SalonUpdates />
                </ProtectedRoute>
              } />
              <Route path="/owner/fitness-assessment" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <FitnessAssessmentPortalPage />
                </ProtectedRoute>
              } />
              <Route path="/owner/nail-assessment" element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <NailAssessmentPortalPage />
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
              <Route path="/partner/customers/:id" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <StaffCustomerDetail />
                </ProtectedRoute>
              } />
              <Route path="/partner/salon-activity" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <SalonActivity />
                </ProtectedRoute>
              } />
              <Route path="/partner/announcements" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <Announcements />
                </ProtectedRoute>
              } />
              <Route path="/partner/promotions" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <Promotions />
                </ProtectedRoute>
              } />
              <Route path="/partner/reviews" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <StaffReviews />
                </ProtectedRoute>
              } />
              <Route path="/partner/salon-updates" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <SalonUpdates />
                </ProtectedRoute>
              } />
              <Route path="/partner/fitness-assessment" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <FitnessAssessmentPortalPage />
                </ProtectedRoute>
              } />
              <Route path="/partner/nail-assessment" element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <NailAssessmentPortalPage />
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
             <Route path="/admin/customers" element={
               <ProtectedRoute allowedRoles={['admin']}>
                 <CustomerManagementHistory />
               </ProtectedRoute>
             } />
             <Route path="/admin/customers/:id" element={
               <ProtectedRoute allowedRoles={['admin']}>
                 <StaffCustomerDetail />
               </ProtectedRoute>
             } />
             <Route path="/admin/reviews" element={
               <ProtectedRoute allowedRoles={['admin']}>
                 <StaffReviews />
               </ProtectedRoute>
             } />
             <Route path="/admin/salon-updates" element={
               <ProtectedRoute allowedRoles={['admin']}>
                 <SalonUpdates />
               </ProtectedRoute>
             } />
             <Route path="/admin/fitness-assessment" element={
               <ProtectedRoute allowedRoles={['admin']}>
                 <FitnessAssessmentPortalPage />
               </ProtectedRoute>
             } />
             <Route path="/admin/nail-assessment" element={
               <ProtectedRoute allowedRoles={['admin']}>
                 <NailAssessmentPortalPage />
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
            <Route path="/cashier/transactions" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <CashierTransactions />
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
            <Route path="/cashier/customers" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <CustomerManagementHistory />
              </ProtectedRoute>
            } />
            <Route path="/cashier/customers/:id" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <StaffCustomerDetail />
              </ProtectedRoute>
            } />
            <Route path="/cashier/reviews" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <StaffReviews />
              </ProtectedRoute>
            } />
            <Route path="/cashier/salon-updates" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <SalonUpdates />
              </ProtectedRoute>
            } />
            <Route path="/cashier/fitness-assessment" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <FitnessAssessmentPortalPage />
              </ProtectedRoute>
            } />
            <Route path="/cashier/nail-assessment" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <NailAssessmentPortalPage />
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
            <Route path="/technician/tips" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <TechnicianTips />
              </ProtectedRoute>
            } />
            <Route path="/technician/customers" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <CustomerManagementHistory />
              </ProtectedRoute>
            } />
            <Route path="/technician/customers/:id" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <StaffCustomerDetail />
              </ProtectedRoute>
            } />
            <Route path="/technician/reviews" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <StaffReviews />
              </ProtectedRoute>
            } />
            <Route path="/technician/salon-updates" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <SalonUpdates />
              </ProtectedRoute>
            } />
            <Route path="/technician/fitness-assessment" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <FitnessAssessmentPortalPage />
              </ProtectedRoute>
            } />
            <Route path="/technician/nail-assessment" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <NailAssessmentPortalPage />
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
            <Route path="/customer/settings" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerSettings />
              </ProtectedRoute>
            } />
            <Route path="/customer/salon-updates" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <SalonUpdates />
              </ProtectedRoute>
            } />
            <Route path="/customer/fitness-assessment" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <FitnessAssessmentPortalPage />
              </ProtectedRoute>
            } />
            <Route path="/customer/nail-assessment" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <NailAssessmentPortalPage />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
)