import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

export default function Cashier() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recentCheckouts, setRecentCheckouts] = useState([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'cashier') { 
      navigate(getHomeRoute(user.role)); 
      return; 
    }
    fetchData();
  }, [user, navigate]);

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
      
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*, services(name, price), profiles(full_name)')
        .in('status', ['serving', 'completed'])
        .gte('check_in_time', `${today}T00:00:00`)
        .order('check_in_time', { ascending: false });

      if (appointments) {
        setRecentCheckouts(appointments || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="px-6 sm:px-8 py-4 border-b" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <h1 className="font-heading text-3xl text-gold">Cashier Dashboard</h1>
          <p className="text-offwhite/60 text-sm mt-1">Welcome, {user?.full_name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-24 lg:pb-8">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link to="/cashier/checkout" className="block p-6 sm:p-8 bg-gold/10 border-2 border-gold rounded-xl hover:bg-gold/20 transition-colors text-center">
              <div className="text-4xl mb-3">💳</div>
              <h3 className="font-heading text-2xl text-gold mb-2">Checkout</h3>
              <p className="text-offwhite/60">Process payments and settlements</p>
            </Link>
            <Link to="/cashier/reports" className="block p-6 sm:p-8 bg-offwhite/5 border border-gold/20 rounded-xl hover:bg-offwhite/10 transition-colors text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-heading text-2xl text-offwhite mb-2">Daily Reports</h3>
              <p className="text-offwhite/60">View transactions and revenue</p>
            </Link>
          </div>

          <div className="bg-offwhite/5 border border-gold/20 rounded-xl p-6">
            <h2 className="font-heading text-xl text-offwhite mb-4">Today's Activity</h2>
            <div className="space-y-3">
              {recentCheckouts.length > 0 ? recentCheckouts.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-3 bg-offwhite/5 rounded-lg">
                  <div>
                    <div className="text-offwhite font-medium">{appt.profiles?.full_name || 'Guest'}</div>
                    <div className="text-offwhite/50 text-sm">{appt.services?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gold font-heading text-xl">${appt.final_price || appt.services?.price}</div>
                    <div className={`text-xs ${appt.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {appt.status === 'completed' ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-offwhite/40 text-center py-8">No transactions today</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}