import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme.js';
import { STAFF_GIFT_CARDS } from '@nail-couture/shared/constants/featureFlags';
import { getGiftCardsPath, getHomePath } from '@nail-couture/shared/utils/routes';
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh';
import AppModal from './AppModal';
import AppointmentServicesPanel from './AppointmentServicesPanel';
import AppointmentVisitNotesPanel from './AppointmentVisitNotesPanel';
import AppointmentPriceBreakdown from './AppointmentPriceBreakdown';
import {
  getAppointmentFinalPrice,
  getAppointmentServices,
} from '@nail-couture/shared/utils/appointmentHelpers';
import { loadVisitServiceSummary } from '@nail-couture/shared/utils/appointmentServiceHistory';
import { fetchAppointmentVisitNotes } from '@nail-couture/shared/utils/appointmentVisitNotes';
import { fetchVisitPayment } from '@nail-couture/shared/utils/customerStats';
import VipFoundingListCard from './VipFoundingListCard.jsx';

function prefetchAppointmentDetails(appointment) {
  if (!appointment?.id) return;
  void loadVisitServiceSummary(appointment);
  void fetchAppointmentVisitNotes(appointment);
}

const statusColors = {
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  assigned_pending: 'bg-blue-100 text-blue-800 border-blue-300',
  serving: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const statusLabels = {
  waiting: 'Waiting',
  assigned_pending: 'Assigned',
  serving: 'In Chair',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function SuperAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, themeConfig } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayRevenue: 0, activeTechnicians: 0, waitingCustomers: 0, completedToday: 0 });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedAppointmentPayment, setSelectedAppointmentPayment] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const phone = user?.phone;
    if (!phone) {
      setLoading(false);
      return;
    }

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const [apptsRes, waitingRes, staffRes] = await Promise.all([
        supabase.rpc('get_appointments', {
          caller_phone: phone,
          date_from: todayStart.toISOString(),
          date_to: todayEnd.toISOString(),
        }),
        supabase.rpc('get_appointments_count', {
          caller_phone: phone,
          status_filter: 'waiting',
        }),
        supabase
          .from('profiles')
          .select('*')
          .in('role', ['admin', 'cashier', 'technician'])
          .order('full_name'),
      ]);

      if (apptsRes.error) console.error('Error fetching appointments:', apptsRes.error);
      if (waitingRes.error) console.error('Error fetching waiting count:', waitingRes.error);
      if (staffRes.error) console.error('Error fetching staff:', staffRes.error);

      const appointments = apptsRes.data || [];
      const staffData = staffRes.data || [];
      const waitingCount = typeof waitingRes.data === 'number' ? waitingRes.data : 0;

      const completed = appointments.filter((a) => a.status === 'completed');
      const revenue = completed.reduce((sum, a) => sum + getAppointmentFinalPrice(a), 0);

      setStats({
        todayRevenue: revenue,
        activeTechnicians: staffData.filter((s) => s.role === 'technician').length || 5,
        waitingCustomers: waitingCount,
        completedToday: completed.length,
      });
      setRecentAppointments(appointments.slice(0, 10));
      setStaff(staffData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.phone]);

  const getAppointmentActivityLabel = (appt) => {
    if (appt.booking_type) return appt.booking_type;
    if (appt.type) return appt.type;
    const dateValue = appt.checked_in_at || appt.created_at;
    if (dateValue) {
      const date = new Date(dateValue);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return 'Walk-In';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getAppointmentBookingType = (appt) => {
    if (appt.booking_type) return appt.booking_type;
    if (appt.type) return appt.type;
    return 'Walk-In';
  };

  const getAppointmentCheckInLabel = (appt) => {
    const bookingType = getAppointmentBookingType(appt);
    return `${bookingType} • ${formatTime(appt.checked_in_at)}`;
  };

  const getAppointmentTechnicianName = (appt) => {
    if (appt.technician?.full_name) return appt.technician.full_name;
    if (appt.technician_name) return appt.technician_name;
    if (appt.technician_id) {
      const tech = staff.find((member) => String(member.id) === String(appt.technician_id));
      if (tech?.full_name) return tech.full_name;
    }
    return 'Unassigned';
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate(getHomePath(user.role));
      return;
    }
    fetchData();

    const channel = supabase
      .channel('superadmin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate, fetchData]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/staff') || path.endsWith('/staff')) {
      setActiveTab('staff');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!selectedAppointment?.id) {
      setSelectedAppointmentPayment(null);
      setPaymentLoading(false);
      return undefined;
    }

    let cancelled = false;
    setPaymentLoading(true);
    fetchVisitPayment(selectedAppointment.id)
      .then((payment) => {
        if (!cancelled) setSelectedAppointmentPayment(payment);
      })
      .catch(() => {
        if (!cancelled) setSelectedAppointmentPayment(null);
      })
      .finally(() => {
        if (!cancelled) setPaymentLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedAppointment?.id]);

  const panelCardStyle = {
    backgroundColor: themeConfig.backgroundSecondary,
    border: `1px solid ${themeConfig.borderColor}`,
    borderRadius: themeConfig.cardStyle.borderRadius,
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  useRegisterPullToRefresh(handleRefresh);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-sidebar">
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-sidebar">
      <div className="p-4 md:p-6 lg:p-8 mobile-page">
         <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-theme">
        <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-3xl text-gold-strong" style={{ fontFamily: themeConfig.fonts.heading }}>
                  {user?.role === 'owner' ? 'Owner Dashboard' : user?.role === 'partner' ? 'Partner Dashboard' : 'Super Admin'}
                </h1>
                <p className="text-sm mt-1 text-secondary">Welcome back, {user?.full_name}</p>
              </div>
             <div className="text-sm text-muted">
               {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
             </div>
           </div>
         </div>

         {user?.role !== 'owner' && (
           <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row gap-2 border-b border-theme">
             <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-gold-strong text-primary' : 'bg-secondary text-secondary hover:text-primary border border-theme'}`}>
               Dashboard
             </button>
             <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'staff' ? 'bg-gold-strong text-primary' : 'bg-secondary text-secondary hover:text-primary border border-theme'}`}>
               Staff
             </button>
           </div>
         )}

        <div className="flex-1 overflow-y-auto p-8 mobile-page">
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="border p-6" style={panelCardStyle}>
                  <div className="text-sm mb-1 text-secondary">Today's Revenue</div>
                  <div className="text-3xl font-heading text-gold-strong">${stats.todayRevenue.toFixed(0)}</div>
                </div>
                <div className="border p-6" style={panelCardStyle}>
                  <div className="text-sm mb-1 text-secondary">Active Technicians</div>
                  <div className="text-3xl font-heading text-primary">{stats.activeTechnicians}</div>
                </div>
                <div className="border p-6" style={panelCardStyle}>
                  <div className="text-sm mb-1 text-secondary">Waiting</div>
                  <div className="text-3xl font-heading text-gold-strong">{stats.waitingCustomers}</div>
                </div>
                <div className="border p-6" style={panelCardStyle}>
                  <div className="text-sm mb-1 text-secondary">Completed</div>
                  <div className="text-3xl font-heading text-primary">{stats.completedToday}</div>
                </div>
                <VipFoundingListCard
                  phone={user?.phone}
                  role={user?.role}
                  theme={theme}
                  panelStyle={panelCardStyle}
                />
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 border p-6" style={panelCardStyle}>
<div className="flex items-center justify-between mb-4">
  <h2 className="font-heading text-xl text-primary" style={{ fontFamily: themeConfig.fonts.heading }}>Today's Activity</h2>
  <Link to={user?.role === 'owner' ? '/owner/lobby' : user?.role === 'partner' ? '/partner/lobby' : '/superadmin/lobby'} className="text-gold-strong text-sm hover:underline">View Lobby</Link>
</div>
               <div className="space-y-3">
                     {recentAppointments.length > 0 ? recentAppointments.map((appt) => {
                        const services = getAppointmentServices(appt);
                        const primaryService = services[0] || 'Service';
                        const extraServiceCount = services.length > 1 ? services.length - 1 : 0;
                        return (
                          <button
                        type="button"
                        key={appt.id}
                        onClick={() => {
                          prefetchAppointmentDetails(appt);
                          setSelectedAppointment(appt);
                          setIsDetailsModalOpen(true);
                        }}
                        className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_2fr_1fr] items-center p-3 rounded-lg w-full text-left bg-primary/40 border border-theme"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate text-primary">{appt.customer?.full_name || appt.customer?.phone || 'Guest'}</div>
                          <div className="text-xs mt-1 text-muted">{getAppointmentCheckInLabel(appt)}</div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="truncate text-sm text-secondary">{primaryService}</div>
                                {extraServiceCount > 0 && (
                                  <span className="flex-shrink-0 rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                                    +{extraServiceCount} more
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="min-w-0 text-right">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${statusColors[appt.status]}`}>
                                {statusLabels[appt.status]}
                              </span>
                              <div className="text-gold-strong text-sm font-heading mt-2">${getAppointmentFinalPrice(appt)}</div>
                            </div>
                          </button>
                        );
                     }) : (
                       <p className="text-center py-8 text-muted">No appointments today</p>
                     )}
                   </div>
                </div>
                {isDetailsModalOpen && selectedAppointment && (
                  <AppModal
                    open
                    onClose={() => setIsDetailsModalOpen(false)}
                    maxWidth="max-w-lg"
                    zIndex="z-50"
                    scrollBody
                    title={selectedAppointment.customer?.full_name || 'Guest'}
                    subtitle={formatTime(selectedAppointment.checked_in_at)}
                    headerExtra={
                      <span className={`inline-flex w-fit mt-2 px-3 py-1 text-xs font-semibold rounded-full border ${statusColors[selectedAppointment.status]}`}>
                        {statusLabels[selectedAppointment.status]}
                      </span>
                    }
                  >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-0">
                        <div className="rounded-2xl border border-card bg-secondary p-4">
                          <div className="text-secondary text-xs uppercase tracking-[0.2em] mb-2">Booking Type</div>
                          <div className="text-primary">{getAppointmentBookingType(selectedAppointment)}</div>
                        </div>
                        <div className="rounded-2xl border border-card bg-secondary p-4">
                          <div className="text-secondary text-xs uppercase tracking-[0.2em] mb-2">Assigned Technician</div>
                          <div className="text-primary">{getAppointmentTechnicianName(selectedAppointment)}</div>
                        </div>
                      </div>

                      <div className="space-y-4 text-sm pt-4">
                        <div className="rounded-2xl border border-card bg-secondary p-4">
                          <div className="flex items-center justify-between mb-3 gap-3">
                            <div className="text-secondary text-xs uppercase tracking-[0.2em]">Services & Add-ons</div>
                            <div className="text-muted text-xs">
                              {getAppointmentServices(selectedAppointment).length} item(s)
                            </div>
                          </div>
                          <AppointmentServicesPanel
                            appointment={selectedAppointment}
                            tone="admin"
                            theme={theme}
                            showHistory
                            showFinalServices={false}
                          />
                        </div>

                        <div className="rounded-2xl border border-card bg-secondary p-4">
                          <div className="text-secondary text-xs uppercase tracking-[0.2em] mb-3">Notes</div>
                          <AppointmentVisitNotesPanel appointment={selectedAppointment} tone="admin" theme={theme} />
                        </div>
                      </div>

                      <AppointmentPriceBreakdown
                        appointment={selectedAppointment}
                        payment={selectedAppointmentPayment}
                        loading={paymentLoading}
                      />
                  </AppModal>
                )}

                <div className={`border rounded-xl p-6 ${theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30'}`}>
                  <h2 className={`font-heading text-xl mb-4 ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>Quick Actions</h2>
                   <div className="space-y-3">
                     <Link to={user?.role === 'owner' ? '/owner/lobby' : user?.role === 'partner' ? '/partner/lobby' : '/superadmin/lobby'} className="block p-4 bg-gold/10 border border-gold/30 rounded-lg hover:bg-gold/20 transition-colors">
                       <div className="text-gold font-heading">Manage Lobby</div>
                       <div className={`text-sm ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`}>Assign customers to technicians</div>
                     </Link>
                     <Link to={user?.role === 'owner' ? '/owner/services' : user?.role === 'partner' ? '/partner/services' : '/superadmin/services'} className={`block p-4 rounded-lg transition-colors ${theme === 'dark' ? 'bg-offwhite/5 border border-offwhite/20 hover:bg-offwhite/10' : 'bg-charcoal/5 border border-charcoal/20 hover:bg-charcoal/10'}`}>
                       <div className={`font-heading ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>Services</div>
                       <div className={`text-sm ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`}>Manage pricing</div>
                     </Link>
                     <Link to={user?.role === 'owner' ? '/owner/reports' : user?.role === 'partner' ? '/partner/reports' : '/superadmin/reports'} className={`block p-4 rounded-lg transition-colors ${theme === 'dark' ? 'bg-offwhite/5 border border-offwhite/20 hover:bg-offwhite/10' : 'bg-charcoal/5 border border-charcoal/20 hover:bg-charcoal/10'}`}>
                       <div className={`font-heading ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>View Reports</div>
                       <div className={`text-sm ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`}>Analytics and insights</div>
                     </Link>
                     {STAFF_GIFT_CARDS && user?.role && (
                       <Link to={getGiftCardsPath(user.role)} className={`block p-4 rounded-lg transition-colors ${theme === 'dark' ? 'bg-offwhite/5 border border-offwhite/20 hover:bg-offwhite/10' : 'bg-charcoal/5 border border-charcoal/20 hover:bg-charcoal/10'}`}>
                         <div className={`font-heading ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>Gift Cards</div>
                         <div className={`text-sm ${theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50'}`}>Complete sales or send requests to cashier</div>
                       </Link>
                     )}
                   </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'staff' && (
            <div className={`border rounded-xl p-6 ${theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`font-heading text-xl ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>Staff Management</h2>
                <Link to="/superadmin/staff/new" className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors">
                  + Add Staff
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`text-sm border-b ${theme === 'dark' ? 'text-offwhite/50 border-offwhite/10' : 'text-charcoal/50 border-charcoal/10'}`}>
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((member) => (
                      <tr key={member.id} className={`border-b ${theme === 'dark' ? 'border-offwhite/5 hover:bg-offwhite/5' : 'border-charcoal/5 hover:bg-charcoal/5'}`}>
                        <td className={`py-3 px-4 font-medium ${theme === 'dark' ? 'text-offwhite' : 'text-charcoal'}`}>{member.full_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded ${
                            member.role === 'technician' ? 'bg-blue-500/20 text-blue-400' :
                            member.role === 'cashier' ? 'bg-green-500/20 text-green-400' :
                            member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                            theme === 'dark' ? 'bg-offwhite/10 text-offwhite/60' : 'bg-charcoal/10 text-charcoal/60'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className={`py-3 px-4 ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>{member.phone}</td>
                        <td className={`py-3 px-4 ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>{member.email || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">Active</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Link to={`/superadmin/schedule?staff=${member.id}`} className="text-blue-400 hover:underline text-sm">
                              Schedule
                            </Link>
                            <Link to={`/superadmin/staff/${member.id}`} className="text-gold hover:underline text-sm">
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {staff.length === 0 && (
                      <tr>
                        <td colSpan="6" className={`py-8 text-center ${theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40'}`}>No staff members found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}