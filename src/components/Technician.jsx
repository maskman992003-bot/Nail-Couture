import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

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
  const [loading, setLoading] = useState(true);
  const [myAppointments, setMyAppointments] = useState([]);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [stats, setStats] = useState({ completedToday: 0, totalQueue: 0, nextClient: null });
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'technician') { 
      navigate(getHomeRoute(user.role)); 
      return; 
    }
    fetchMyAppointments();
  }, [user, navigate]);

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

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (userRole && userRole !== 'technician') {
      navigate(getHomeRoute(userRole));
      return;
    }
    fetchMyAppointments();
  }, [user, userRole, navigate]);

  const fetchMyAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*, services(name, price, duration_minutes), profiles(full_name, phone_number, nail_goal)')
        .gte('check_in_time', `${today}T00:00:00`)
        .order('check_in_time', { ascending: true });

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

  const markComplete = async (appointmentId) => {
    try {
      await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', appointmentId);
      
      fetchMyAppointments();
    } catch (err) {
      console.error('Error completing appointment:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a' }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'Technician';

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl text-gold">Hello, {firstName}</h1>
              <p className="text-offwhite/60 text-sm mt-1">Your personal dashboard</p>
            </div>
            <div className="text-offwhite/50 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-4 flex gap-2 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <button onClick={() => setActiveTab('home')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'home' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
            Home
          </button>
          <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'schedule' ? 'bg-gold text-charcoal' : 'bg-offwhite/10 text-offwhite/60 hover:bg-offwhite/20'}`}>
            My Schedule
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {activeTab === 'home' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl text-center">
                  <div className="text-offwhite/50 text-sm mb-2">Services Done Today</div>
                  <div className="text-5xl font-heading text-green-400">{stats.completedToday}</div>
                </div>
                <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl text-center">
                  <div className="text-offwhite/50 text-sm mb-2">Your Next Client</div>
                  <div className="text-xl font-heading text-yellow-400 truncate">
                    {stats.nextClient?.profiles?.full_name || 'None'}
                  </div>
                </div>
                <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl text-center">
                  <div className="text-offwhite/50 text-sm mb-2">Current Queue</div>
                  <div className="text-5xl font-heading text-offwhite">{stats.totalQueue}</div>
                </div>
              </div>

              {currentAppointment && (
                <div className="bg-gradient-to-r from-gold/20 to-amber-10 border-2 border-gold rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading text-xl text-offwhite">Current Customer</h2>
                    <span className="px-3 py-1 text-sm border bg-green-100 text-green-800 border-green-300 rounded">In Chair</span>
                  </div>
                  <div className="text-offwhite font-medium text-2xl">{currentAppointment.profiles?.full_name || 'Customer'}</div>
                  <div className="text-offwhite/60 text-lg mt-1">{currentAppointment.services?.name} (~{currentAppointment.services?.duration_minutes} min)</div>
                  {currentAppointment.profiles?.nail_goal && (
                    <div className="text-gold/70 text-sm mt-2 flex items-center gap-2">
                      <span>🎯</span> {currentAppointment.profiles.nail_goal}
                    </div>
                  )}
                  <button
                    onClick={() => markComplete(currentAppointment.id)}
                    className="mt-6 w-full py-4 bg-gold text-charcoal font-heading text-xl rounded-xl hover:bg-gold/90 transition-colors"
                  >
                    Complete Service ✓
                  </button>
                </div>
              )}

              {!currentAppointment && stats.totalQueue === 0 && (
                <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-12 text-center">
                  <div className="text-6xl mb-4">✨</div>
                  <h3 className="font-heading text-2xl text-offwhite mb-2">All Done for Today!</h3>
                  <p className="text-offwhite/60">No more appointments in your queue.</p>
                </div>
              )}

              {stats.totalQueue > 0 && (
                <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
                  <h2 className="font-heading text-xl text-offwhite mb-4">Waiting Queue</h2>
                  <div className="space-y-3">
                    {myAppointments.filter(a => a.status === 'waiting').map((appt, index) => (
                      <div key={appt.id} className="flex items-center justify-between p-4 bg-offwhite/5 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center text-gold font-heading">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-offwhite font-medium text-lg">{appt.profiles?.full_name || 'Guest'}</div>
                            <div className="text-offwhite/50 text-sm">{appt.services?.name}</div>
                            {appt.profiles?.nail_goal && (
                              <div className="text-gold/70 text-xs mt-1">Goal: {appt.profiles.nail_goal}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-offwhite/50 text-sm">
                            {new Date(appt.check_in_time).toLocaleTimeString()}
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
            <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
              <h2 className="font-heading text-xl text-offwhite mb-4">My Schedule - Today</h2>
              <div className="space-y-3">
                {myAppointments.length > 0 ? myAppointments.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between p-4 bg-offwhite/5 rounded-lg">
                    <div>
                      <div className="text-offwhite font-medium text-lg">{appt.profiles?.full_name || 'Guest'}</div>
                      <div className="text-offwhite/50 text-sm">{appt.services?.name}</div>
                      <div className="text-offwhite/40 text-xs mt-1">
                        {new Date(appt.check_in_time).toLocaleTimeString()}
                        {appt.profiles?.nail_goal && ` • ${appt.profiles.nail_goal}`}
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs border rounded ${
                      appt.status === 'serving' ? 'bg-green-100 text-green-800 border-green-300' :
                      appt.status === 'waiting' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                      appt.status === 'completed' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                      'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                      {statusLabels[appt.status]}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-offwhite/40">No appointments scheduled today</p>
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