import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navbar from './Navbar';
import StaffNav from './StaffNav';

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
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      <StaffNav />
      <div className="flex-1 overflow-x-hidden">
        <Navbar currentPage="admin" onNavigate={handleNavigate} />
        <div className="max-w-7xl mx-auto px-6 py-8 pb-24 lg:pb-8">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl text-gold mb-2">Admin Command Center</h1>
          <p className="text-offwhite/60">Select an action to manage the salon</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl p-6 text-center border border-gold/20" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="text-offwhite/50 text-sm mb-1">Today&apos;s Revenue</div>
            <div className="font-heading text-3xl text-gold">
              {loading ? '...' : `$${quickStats.todayRevenue.toFixed(0)}`}
            </div>
          </div>
          <div className="rounded-xl p-6 text-center border border-offwhite/10" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="text-offwhite/50 text-sm mb-1">Active Technicians</div>
            <div className="font-heading text-3xl text-offwhite">
              {loading ? '...' : quickStats.activeTechnicians}
            </div>
          </div>
          <div className="rounded-xl p-6 text-center border border-offwhite/10" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="text-offwhite/50 text-sm mb-1">Customers in Lobby</div>
            <div className="font-heading text-3xl text-offwhite">
              {loading ? '...' : quickStats.lobbyCount}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {actionCards.map((card) => {
            return (
              <Link
                key={card.id}
                to={card.href}
                className={`group relative border-2 rounded-xl p-8 text-center transition-all duration-300 hover:-translate-y-1 ${
                  card.color === 'gold'
                    ? 'border-gold hover:shadow-lg hover:shadow-gold/20'
                    : 'border-offwhite/10 hover:border-offwhite/30'
                }`}
                style={{ backgroundColor: '#1a1a1a' }}
              >
                <div className={`text-5xl mb-4 ${
                  card.color === 'gold' ? 'text-gold' : 'text-offwhite/30'
                } group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
                <h3 className="font-heading text-xl text-offwhite mb-2">{card.label}</h3>
                <p className="text-offwhite/40 text-sm">{card.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/"
            className="text-offwhite/40 hover:text-offwhite/60 text-sm transition-colors"
          >
            Back to Site
          </Link>
        </div>
      </div>
    </div>
  );
}