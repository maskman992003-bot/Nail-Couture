import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import clsx from 'clsx';

const statusLabels = {
  waiting: 'Waiting',
  assigned_pending: 'Assigned',
  serving: 'In Chair',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function Technician() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [myAppointments, setMyAppointments] = useState([]);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [stats, setStats] = useState({ completedToday: 0, totalQueue: 0, nextClient: null });
  const [activeTab, setActiveTab] = useState('home');

  const getHomeRoute = (role) => {
    switch (role) {
      case 'super_admin':
      case 'owner':
      case 'partner': return '/superadmin';
      case 'admin': return '/admin';
      case 'cashier': return '/cashier';
      default: return '/portal';
    }
  };

  const userRole = user?.role;

  const fetchMyAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const caller = localStorage.getItem('salon_user_data');
      const phone = caller ? JSON.parse(caller).phone : '';
      
      const { data: appointments } = await supabase
        .rpc('get_appointments', { caller_phone: phone, date_from: `${today}T00:00:00`, order_asc: true })

      if (appointments) {
        const serving = appointments.find(a => a.status === 'serving');
        const completed = appointments.filter(a => a.status === 'completed').length;
        const waiting = appointments.filter(a => a.status === 'waiting');
        const nextWaiting = waiting[0] || null;
        
        setMyAppointments(appointments);
        setCurrentAppointment(serving || null);
        setStats({
          completedToday: completed,
          totalQueue: waiting.length,
          nextClient: nextWaiting,
        });
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (appointment) => {
    try {
      const price = appointment.final_price ?? (appointment.services?.price || 0);
      const caller = localStorage.getItem('salon_user_data');
      const phone = caller ? JSON.parse(caller).phone : '';
      await supabase.rpc('complete_appointment', { caller_phone: phone, appointment_id: appointment.id, p_final_price: price });
      const earnedPoints = Math.floor(price);
      if (earnedPoints > 0 && appointment.customer_id) {
        await supabase.rpc('award_loyalty_points', { p_profile_id: appointment.customer_id, p_points: earnedPoints }).catch(() => {});
      }
      fetchMyAppointments();
    } catch { }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (userRole && userRole !== 'technician') {
      navigate(getHomeRoute(userRole));
      return;
    }
    fetchMyAppointments();
  }, [user, userRole, navigate]);

  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'
  );
  const headerBorderClass = clsx('px-4 sm:px-6 lg:px-8 py-6 border-b', theme === 'dark' ? 'border-gold/10' : 'border-gold/30');
  const tabBorderClass = clsx('px-4 sm:px-6 lg:px-8 py-4 flex gap-2 border-b', theme === 'dark' ? 'border-gold/10' : 'border-gold/30');
  const textColor = clsx('font-medium', theme === 'dark' ? 'text-offwhite' : 'text-charcoal');
  const subtextClass = clsx('text-sm', theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50');
  const statCardClass = clsx('border p-6 rounded-xl', theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30');
  const appointmentCard = clsx('flex items-center justify-between p-4 rounded-lg', theme === 'dark' ? 'bg-offwhite/5' : 'bg-charcoal/5');
  const emptyText = clsx('text-center py-8', theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40');
  const welcomeSubclass = clsx('text-sm mt-1', theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60');
  const welcomeText = clsx('text-offwhite/60 text-lg mt-1', theme === 'dark' ? '' : 'text-charcoal/60');

  const firstName = user?.full_name?.split(' ')[0] || 'Technician';

  if (loading) {
    return (
      <div className={bgClass}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={bgClass}>
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className={headerBorderClass}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl text-gold">Hello, {firstName}</h1>
              <p className={welcomeSubclass}>Your personal dashboard</p>
            </div>
            <div className={subtextClass}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className={tabBorderClass}>
          <button 
            onClick={() => setActiveTab('home')} 
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === 'home' 
                ? 'bg-gold text-charcoal' 
                : clsx(
                    theme === 'dark' ? 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20' : 'bg-charcoal/10 text-charcoal/60 hover:bg-charcoal/20'
                  )
            )}
          >
            Home
          </button>
          <button 
            onClick={() => setActiveTab('schedule')} 
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeTab === 'schedule' 
                ? 'bg-gold text-charcoal' 
                : clsx(
                    theme === 'dark' ? 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20' : 'bg-charcoal/10 text-charcoal/60 hover:bg-charcoal/20'
                  )
            )}
          >
            My Schedule
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {activeTab === 'home' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className={statCardClass}>
                  <div className={clsx('text-sm mb-2', theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50')}>Services Done Today</div>
                  <div className="text-5xl font-heading text-green-400">{stats.completedToday}</div>
                </div>
                <div className={statCardClass}>
                  <div className={clsx('text-sm mb-2', theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50')}>Your Next Client</div>
                  <div className="text-xl font-heading text-yellow-400 truncate">
                    {stats.nextClient?.customer?.full_name || 'None'}
                  </div>
                </div>
                <div className={statCardClass}>
                  <div className={clsx('text-sm mb-2', theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50')}>Current Queue</div>
                  <div className={clsx('text-5xl font-heading', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>{stats.totalQueue}</div>
                </div>
              </div>

              {currentAppointment && (
                <div className="bg-gradient-to-r from-gold/20 to-amber-10 border-2 border-gold rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={clsx('font-heading text-xl', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>Current Customer</h2>
                    <span className="px-3 py-1 text-sm border bg-green-100 text-green-800 border-green-300 rounded">In Chair</span>
                  </div>
                  <div className={clsx('font-medium text-2xl', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>{currentAppointment.customer?.full_name || 'Customer'}</div>
                  <div className={welcomeText}>{currentAppointment.add_ons || currentAppointment.services?.name || 'Service'}{currentAppointment.services?.duration_minutes ? ` (~${currentAppointment.services?.duration_minutes} min)` : ''}</div>
                  {currentAppointment.customer?.nail_goal && (
                    <div className="text-gold/70 text-sm mt-2 flex items-center gap-2">
                      <span>🎯</span> {currentAppointment.customer?.nail_goal}
                    </div>
                  )}
                  <button
                    onClick={() => markComplete(currentAppointment)}
                    className="mt-6 w-full py-4 bg-gold text-charcoal font-heading text-xl rounded-xl hover:bg-gold/90 transition-colors"
                  >
                    Complete Service ✓
                  </button>
                </div>
              )}

              {!currentAppointment && stats.totalQueue === 0 && (
                <div className={clsx('border rounded-xl p-12 text-center', theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30')}>
                  <div className="text-6xl mb-4">✨</div>
                  <h3 className={clsx('font-heading text-2xl mb-2', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>All Done for Today!</h3>
                  <p className={welcomeSubclass}>No more appointments in your queue.</p>
                </div>
              )}

              {stats.totalQueue > 0 && (
                <div className={clsx('border rounded-xl p-6', theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30')}>
                  <h2 className={clsx('font-heading text-xl mb-4', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>Waiting Queue</h2>
                  <div className="space-y-3">
                    {myAppointments.filter(a => a.status === 'waiting').map((appt, index) => (
                      <div key={appt.id} className={appointmentCard}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center text-gold font-heading">
                            {index + 1}
                          </div>
                          <div>
                            <div className={clsx('text-lg', textColor)}>{appt.customer?.full_name || 'Guest'}</div>
                            <div className={subtextClass}>{appt.add_ons || appt.services?.name || 'Service'}</div>
                            {appt.customer?.nail_goal && (
                              <div className="text-gold/70 text-xs mt-1">Goal: {appt.customer?.nail_goal}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={subtextClass}>
                            {new Date(appt.checked_in_at).toLocaleTimeString()}
                          </div>
                          <span className="px-3 py-1 text-xs border bg-yellow-100 text-yellow-800 border-yellow-300 rounded mt-2 inline-block">
                            Position {index + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className={clsx('border rounded-xl p-6', theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30')}>
              <h2 className={clsx('font-heading text-xl mb-4', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>My Schedule - Today</h2>
              <div className="space-y-3">
                {myAppointments.length > 0 ? myAppointments.map((appt) => (
                  <div key={appt.id} className={appointmentCard}>
                    <div>
                      <div className={clsx('text-lg', textColor)}>{appt.customer?.full_name || 'Guest'}</div>
                      <div className={subtextClass}>{appt.add_ons || appt.services?.name || 'Service'}</div>
                      <div className={clsx('text-xs mt-1', theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40')}>
                        {new Date(appt.checked_in_at).toLocaleTimeString()}
                        {appt.customer?.nail_goal && ` • ${appt.customer?.nail_goal}`}
                      </div>
                    </div>
                    <span className={clsx(
                      'px-3 py-1 text-xs border rounded',
                      appt.status === 'serving' ? 'bg-green-100 text-green-800 border-green-300' :
                      appt.status === 'waiting' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                      appt.status === 'completed' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                      'bg-blue-100 text-blue-800 border-blue-300'
                    )}>
                      {statusLabels[appt.status]}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📅</div>
                    <p className={emptyText}>No appointments scheduled today</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
