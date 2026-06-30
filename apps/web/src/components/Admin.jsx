import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import Sidebar from './Sidebar';
import VipFoundingListCard from './VipFoundingListCard.jsx';
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh';
import clsx from 'clsx';

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeTechnicians: 0, waitingCustomers: 0, completedToday: 0 });

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const caller = localStorage.getItem('salon_user_data');
      const phone = caller ? JSON.parse(caller).phone : '';
      
      const { data: appointments } = await supabase
        .rpc('get_appointments', { caller_phone: phone, date_from: `${today}T00:00:00` })

      if (appointments) {
        setStats({
          activeTechnicians: 5,
          waitingCustomers: appointments.filter(a => a.status === 'waiting').length,
          completedToday: appointments.filter(a => a.status === 'completed').length,
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useRegisterPullToRefresh(async () => {
    setLoading(true);
    await fetchDashboardData();
  }, { disabled: loading });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') {
      navigate(getHomePath(user.role));
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    theme === 'dark' ? 'bg-primary text-primary' : 'bg-white text-charcoal'
  );

  const headerBorderClass = clsx('px-8 py-6 border-b', theme === 'dark' ? 'border-gold/10' : 'border-gold/30');
  
  const statCardClass = clsx('border p-6 rounded-xl', theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30');
  
  const linkCardClass = clsx('block p-8 border rounded-xl hover:bg-gold/10 transition-colors', theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30');
  
  const subtextClass = clsx('text-sm mb-1', theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50');
  
  const textColor = clsx('text-3xl font-heading', theme === 'dark' ? 'text-offwhite' : 'text-charcoal');
  
  const welcomeSubclass = clsx('text-sm mt-1', theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60');

  if (loading) {
    return (
      <div className={bgClass}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={bgClass}>
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 mobile-page">
        <div className={headerBorderClass}>
          <h1 className="font-heading text-3xl text-gold">Admin Dashboard</h1>
          <p className={welcomeSubclass}>Welcome, {user?.full_name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 mobile-page">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className={statCardClass}>
              <div className={subtextClass}>Active Technicians</div>
              <div className={textColor}>{stats.activeTechnicians}</div>
            </div>
            <div className={statCardClass}>
              <div className={subtextClass}>Waiting</div>
              <div className="text-3xl font-heading text-yellow-400">{stats.waitingCustomers}</div>
            </div>
            <div className={statCardClass}>
              <div className={subtextClass}>Completed</div>
              <div className="text-3xl font-heading text-green-400">{stats.completedToday}</div>
            </div>
            <VipFoundingListCard
              phone={user?.phone}
              role={user?.role}
              theme={theme}
              className={statCardClass}
            />
          </div>

           <div className="grid md:grid-cols-2 gap-6">
             <Link to="/admin/lobby" className={linkCardClass}>
               <h3 className="font-heading text-2xl text-gold mb-2">Manage Lobby</h3>
               <p className={welcomeSubclass}>Assign customers to technicians and manage floor</p>
             </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
