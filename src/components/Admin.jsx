import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navbar from './Navbar';

const actionCards = [
  {
    id: 'lobby',
    label: 'Couture Lobby',
    icon: '◈',
    href: '/admin/lobby',
    color: 'gold',
    description: 'Floor management and technician grid'
  },
  {
    id: 'reports',
    label: 'Reports & Insights',
    icon: '◉',
    href: '/admin/reports',
    color: 'charcoal',
    description: 'Analytics and revenue data'
  },
  {
    id: 'services',
    label: 'Service Menu',
    icon: '◇',
    href: '/admin/services',
    color: 'gold',
    description: 'Manage services and pricing'
  },
  {
    id: 'staff',
    label: 'Staff Management',
    icon: '◻',
    href: '/admin/staff',
    color: 'charcoal',
    description: 'Manage technicians and roles'
  }
];

export default function Admin() {
  const navigate = useNavigate();
  const [quickStats, setQuickStats] = useState({
    todayRevenue: 0,
    activeTechnicians: 0,
    lobbyCount: 0
  });
  const [loading, setLoading] = useState(true);

  const handleNavigate = (page) => {
    if (page === 'home') navigate('/');
  };

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: revenueData } = await supabase
      .from('appointments')
      .select('final_price')
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString());
    
    const todayRevenue = revenueData?.reduce((sum, a) => sum + (a.final_price || 0), 0) || 0;

    const { count: techCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'technician');

    const { count: lobbyCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['waiting', 'assigned_pending', 'serving']);

    setQuickStats({
      todayRevenue,
      activeTechnicians: techCount || 0,
      lobbyCount: lobbyCount || 0
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-offwhite w-full overflow-x-hidden">
      <Navbar currentPage="admin" onNavigate={handleNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-charcoal text-3xl mb-2">Admin Command Center</h1>
          <p className="text-charcoal/60">Select an action to manage the salon</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gold/30 rounded-xl p-6 text-center">
            <div className="text-gold/60 text-sm mb-1">Today's Revenue</div>
            <div className="font-heading text-3xl text-gold">
              {loading ? '...' : `$${quickStats.todayRevenue.toFixed(0)}`}
            </div>
          </div>
          <div className="bg-white border border-charcoal/10 rounded-xl p-6 text-center">
            <div className="text-charcoal/60 text-sm mb-1">Active Technicians</div>
            <div className="font-heading text-3xl text-charcoal">
              {loading ? '...' : quickStats.activeTechnicians}
            </div>
          </div>
          <div className="bg-white border border-charcoal/10 rounded-xl p-6 text-center">
            <div className="text-charcoal/60 text-sm mb-1">Customers in Lobby</div>
            <div className="font-heading text-3xl text-charcoal">
              {loading ? '...' : quickStats.lobbyCount}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {actionCards.map((card) => (
            <Link
              key={card.id}
              to={card.href}
              className={`group relative bg-white border-2 ${
                card.color === 'gold' 
                  ? 'border-gold hover:shadow-lg hover:shadow-gold/20' 
                  : 'border-charcoal/20 hover:border-charcoal/40'
              } rounded-xl p-8 text-center transition-all duration-300 hover:-translate-y-1`}
            >
              <div className={`text-5xl mb-4 ${
                card.color === 'gold' ? 'text-gold' : 'text-charcoal/40'
              } group-hover:scale-110 transition-transform`}>
                {card.icon}
              </div>
              <h3 className="font-heading text-charcoal text-xl mb-2">{card.label}</h3>
              <p className="text-charcoal/50 text-sm">{card.description}</p>
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                card.color === 'gold' ? 'bg-gold' : 'bg-charcoal/20'
              } rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link 
            to="/" 
            className="text-charcoal/60 hover:text-charcoal text-sm transition-colors"
          >
            ← Back to Site
          </Link>
        </div>
      </div>
    </div>
  );
}