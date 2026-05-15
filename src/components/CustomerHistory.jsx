import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

export default function CustomerHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.is_staff) {
      const route = (user.role === 'super_admin' || user.role === 'owner' || user.role === 'partner') ? '/superadmin' : `/${user.role}`;
      navigate(route);
      return;
    }
    fetchHistory();
  }, [user, navigate]);

  const fetchHistory = async () => {
    const currentUser = localStorage.getItem('salon_user_data');
    const userId = currentUser ? JSON.parse(currentUser).id : null;
    if (!userId) { setLoading(false); navigate('/login'); return; }

    try {
      const { data } = await supabase
        .from('appointments')
        .select('*, services(name, price, duration_minutes), technician:profiles!appointments_technician_id_fkey(full_name)')
        .eq('profile_id', userId)
        .in('status', ['completed', 'cancelled'])
        .order('check_in_time', { ascending: false });
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReceipt = (appt) => {
    const receiptContent = `
NAIL COUTURE - RECEIPT
=======================
Service: ${appt.services?.name || 'N/A'}
Duration: ${appt.services?.duration_minutes || 'N/A'} minutes
Date: ${new Date(appt.check_in_time).toLocaleDateString()}
Time: ${new Date(appt.check_in_time).toLocaleTimeString()}
${appt.technician ? `Technician: ${appt.technician.full_name}` : ''}
------------------------
Price: $${appt.final_price || appt.services?.price || 0}
Status: ${appt.status.toUpperCase()}
=======================
Thank you for visiting Nail Couture!
    `.trim();
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${appt.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completed = appointments.filter(a => a.status === 'completed');
  const cancelled = appointments.filter(a => a.status === 'cancelled');

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

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-10 py-8 space-y-10">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <Link to="/portal" className="text-offwhite/40 hover:text-gold text-sm">Home</Link>
              <span className="text-offwhite/30">/</span>
              <span className="text-gold font-heading text-sm">History</span>
            </div>
            <h1 className="font-heading text-4xl text-gold">Your Visit History</h1>
            <p className="text-offwhite/50 text-sm mt-1">A timeline of your experiences at Nail Couture</p>
          </div>

          {completed.length > 0 && (
            <div>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Completed Visits</div>
              <div className="space-y-6">
                {completed.map((appt) => (
                  <div key={appt.id} className="relative pl-8" style={{ paddingLeft: '2.5rem' }}>
                    <div className="absolute left-3 top-0 w-px h-full" style={{ backgroundColor: 'rgba(197, 160, 89, 0.2)' }}></div>
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)', boxShadow: '0 0 10px rgba(197, 160, 89, 0.3)' }}>
                      <svg className="w-3 h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="rounded-2xl p-8 border" style={{ borderColor: 'rgba(197, 160, 89, 0.2)', backgroundColor: '#111' }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-offwhite/40 text-xs mb-1">
                            {new Date(appt.check_in_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </div>
                          <h3 className="font-heading text-2xl text-offwhite mb-2">{appt.services?.name || 'Service'}</h3>
                          <div className="text-offwhite/50 text-sm">
                            {appt.services?.duration_minutes} minutes
                            {appt.technician && <span> &bull; Served by {appt.technician.full_name}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gold font-heading text-2xl">${appt.final_price || appt.services?.price}</div>
                          {appt.payment_method && <div className="text-offwhite/40 text-xs mt-1">{appt.payment_method}</div>}
                        </div>
                      </div>
                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={() => generateReceipt(appt)}
                          className="px-5 py-2 border rounded-lg text-sm transition-colors hover:border-gold/50"
                          style={{ borderColor: 'rgba(197, 160, 89, 0.3)', color: '#c5a059' }}
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cancelled.length > 0 && (
            <div>
              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-6">Cancelled</div>
              <div className="space-y-4">
                {cancelled.map((appt) => (
                  <div key={appt.id} className="rounded-2xl p-6 border flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#111' }}>
                    <div>
                      <h4 className="font-heading text-lg text-offwhite/60">{appt.services?.name || 'Service'}</h4>
                      <div className="text-offwhite/30 text-sm">
                        {new Date(appt.check_in_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      {appt.cancel_reason && <div className="text-red-400/50 text-xs mt-1">{appt.cancel_reason}</div>}
                    </div>
                    <span className="text-red-400/60 text-sm">Cancelled</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {appointments.length === 0 && (
            <div className="rounded-2xl p-12 border-2 text-center" style={{ borderColor: 'rgba(197, 160, 89, 0.15)', backgroundColor: '#111' }}>
              <div className="text-offwhite/30 text-5xl mb-4">&#128340;</div>
              <h3 className="font-heading text-2xl text-offwhite mb-3">No History Yet</h3>
              <p className="text-offwhite/50 mb-8 max-w-sm mx-auto">Your visit history will appear here after your first appointment.</p>
              <Link to="/customer/book" className="inline-block px-8 py-4 bg-gold text-charcoal font-heading tracking-wider text-sm rounded-xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20">
                Book Your First Visit
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}