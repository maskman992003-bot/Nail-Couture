import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import clsx from 'clsx';

export default function Cashier() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [recentCheckouts, setRecentCheckouts] = useState([]);

  const getHomeRoute = (role) => {
    switch (role) {
      case 'super_admin':
      case 'owner':
      case 'partner': return '/superadmin';
      case 'admin': return '/admin';
      case 'technician': return '/technician';
      default: return '/portal';
    }
  };

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const caller = localStorage.getItem('salon_user_data');
      const phone = caller ? JSON.parse(caller).phone : '';
      
      const { data: appointments } = await supabase
        .rpc('get_appointments', { caller_phone: phone, status_filter: 'serving,completed', date_from: `${today}T00:00:00` })

      if (appointments) {
        setRecentCheckouts(appointments || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'cashier') { 
      navigate(getHomeRoute(user.role)); 
      return; 
    }
    fetchData();
  }, [user, navigate]);

  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'
  );
  const headerBorderClass = clsx('px-6 sm:px-8 py-4 border-b', theme === 'dark' ? 'border-gold/10' : 'border-gold/30');
  const textColor = clsx('font-medium', theme === 'dark' ? 'text-offwhite' : 'text-charcoal');
  const subtextClass = clsx('text-sm', theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50');
  const welcomeSubclass = clsx('text-sm mt-1', theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60');
  const cardClass = clsx('border rounded-xl p-6', theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30');
  const appointmentCard = clsx('flex items-center justify-between p-3 rounded-lg', theme === 'dark' ? 'bg-offwhite/5' : 'bg-charcoal/5');
  const linkCardDark = clsx('bg-offwhite/5 border-gold/20 hover:bg-offwhite/10');
  const linkCardLight = clsx('bg-charcoal/5 border-gold/30 hover:bg-charcoal/10');
  const linkCard = clsx('block p-6 sm:p-8 border rounded-xl hover:transition-colors text-center', theme === 'dark' ? linkCardDark : linkCardLight);

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
          <h1 className="font-heading text-3xl text-gold">Cashier Dashboard</h1>
          <p className={welcomeSubclass}>Welcome, {user?.full_name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-24 lg:pb-8">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link to="/cashier/checkout" className="block p-6 sm:p-8 bg-gold/10 border-2 border-gold rounded-xl hover:bg-gold/20 transition-colors text-center">
              <div className="text-4xl mb-3">💳</div>
              <h3 className="font-heading text-2xl text-gold mb-2">Checkout</h3>
              <p className={welcomeSubclass}>Process payments and settlements</p>
            </Link>
            <Link to="/cashier/reports" className={linkCard}>
              <div className="text-4xl mb-3">📊</div>
              <h3 className={clsx('font-heading text-2xl mb-2', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>Daily Reports</h3>
              <p className={welcomeSubclass}>View transactions and revenue</p>
            </Link>
          </div>

          <div className={cardClass}>
            <h2 className={clsx('font-heading text-xl mb-4', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>Today's Activity</h2>
            <div className="space-y-3">
              {recentCheckouts.length > 0 ? recentCheckouts.map((appt) => (
                <div key={appt.id} className={appointmentCard}>
                  <div>
                    <div className={textColor}>{appt.customer?.full_name || 'Guest'}</div>
                    <div className={subtextClass}>{appt.add_ons || appt.services?.name || 'Service'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gold font-heading text-xl">${appt.final_price || appt.services?.price}</div>
                    <div className={clsx('text-xs', appt.status === 'completed' ? 'text-green-400' : 'text-yellow-400')}>
                      {appt.status === 'completed' ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                </div>
              )) : (
                <p className={clsx('text-center py-8', theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40')}>No transactions today</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
