import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeTechnicians: 0, waitingCustomers: 0, completedToday: 0 });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin') { 
      navigate(getHomeRoute(user.role)); 
      return; 
    }
    fetchDashboardData();
  }, [user, navigate]);

  const getHomeRoute = (role) => {
    switch (role) {
      case 'super_admin':
      case 'owner':
      case 'partner': return '/superadmin';
      case 'cashier': return '/cashier';
      case 'technician': return '/technician';
      default: return '/portal';
    }
  };

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('checked_in_at', `${today}T00:00:00`);

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

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="px-8 py-6 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <h1 className="font-heading text-3xl text-gold">Admin Dashboard</h1>
          <p className="text-offwhite/60 text-sm mt-1">Welcome, {user?.full_name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pb-24 lg:pb-8">
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl">
              <div className="text-offwhite/50 text-sm mb-1">Active Technicians</div>
              <div className="text-3xl font-heading text-offwhite">{stats.activeTechnicians}</div>
            </div>
            <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl">
              <div className="text-offwhite/50 text-sm mb-1">Waiting</div>
              <div className="text-3xl font-heading text-yellow-400">{stats.waitingCustomers}</div>
            </div>
            <div className="bg-offwhite/5 border border-gold/20 p-6 rounded-xl">
              <div className="text-offwhite/50 text-sm mb-1">Completed</div>
              <div className="text-3xl font-heading text-green-400">{stats.completedToday}</div>
            </div>
          </div>

           <div className="grid md:grid-cols-2 gap-6">
             <Link to="/admin/lobby" className="block p-8 bg-offwhite/5 border border-gold/20 rounded-xl hover:bg-gold/10 transition-colors">
               <h3 className="font-heading text-2xl text-gold mb-2">Manage Lobby</h3>
               <p className="text-offwhite/60">Assign customers to technicians and manage floor</p>
             </Link>
           </div>
        </div>
      </div>
    </div>
  );
}