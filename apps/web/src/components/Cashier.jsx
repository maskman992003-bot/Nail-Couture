import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import Sidebar from './Sidebar';
import clsx from 'clsx';

export default function Cashier() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [paidToday, setPaidToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const fetchData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const caller = localStorage.getItem('salon_user_data');
      const phone = caller ? JSON.parse(caller).phone : '';
      const userId = user?.id;

      const [queueResult, paymentsResult] = await Promise.all([
        supabase.rpc('get_appointments', {
          caller_phone: phone,
          status_filter: 'ready_for_checkout',
          date_from: `${todayIso.split('T')[0]}T00:00:00`,
        }),
        supabase
          .from('payment_transactions')
          .select(`
            id, final_amount, amount, payment_method, created_at, status,
            appointments (
              id,
              add_ons,
              services ( name, price )
            ),
            customer:profiles!payment_transactions_customer_id_fkey ( full_name )
          `)
          .eq('cashier_id', userId)
          .eq('status', 'completed')
          .gte('created_at', todayIso)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const queue = queueResult.data || [];
      setQueueCount(queue.length);

      const payments = paymentsResult.data || [];
      setPaidToday(payments.length);
      setRevenueToday(payments.reduce((sum, p) => sum + Number(p.final_amount || p.amount || 0), 0));
      setRecentTransactions(payments);
    } catch (err) {
      console.error('Error fetching cashier data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'cashier') {
      navigate(getHomePath(user.role));
      return;
    }
    fetchData();

    const channel = supabase
      .channel('cashier-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payment_transactions' }, () => fetchData())
      .subscribe();

    return () => supabase.removeChannel(channel);
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
  const linkCard = clsx('block p-6 sm:p-8 border rounded-xl hover:transition-colors text-center relative', theme === 'dark' ? 'bg-offwhite/5 border-gold/20 hover:bg-offwhite/10' : 'bg-charcoal/5 border-gold/30 hover:bg-charcoal/10');
  const statCard = clsx('border rounded-xl p-5 text-center', theme === 'dark' ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30');

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className={statCard}>
              <div className="text-3xl font-heading text-amber-400">{queueCount}</div>
              <div className={subtextClass}>In Checkout Queue</div>
            </div>
            <div className={statCard}>
              <div className="text-3xl font-heading text-green-400">{paidToday}</div>
              <div className={subtextClass}>Paid Today</div>
            </div>
            <div className={statCard}>
              <div className="text-3xl font-heading text-gold">${revenueToday.toFixed(2)}</div>
              <div className={subtextClass}>Revenue Today</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Link to="/cashier/checkout" className="block p-6 sm:p-8 bg-gold/10 border-2 border-gold rounded-xl hover:bg-gold/20 transition-colors text-center relative">
              {queueCount > 0 && (
                <span className="absolute top-3 right-3 min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center rounded-full bg-amber-500 text-charcoal text-xs font-bold">
                  {queueCount}
                </span>
              )}
              <div className="text-4xl mb-3">💳</div>
              <h3 className="font-heading text-2xl text-gold mb-2">Checkout</h3>
              <p className={welcomeSubclass}>Process payments and settlements</p>
            </Link>
            <Link to="/cashier/lobby" className={linkCard}>
              <div className="text-4xl mb-3">👥</div>
              <h3 className={clsx('font-heading text-2xl mb-2', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>Lobby</h3>
              <p className={welcomeSubclass}>Monitor floor and assist check-ins</p>
            </Link>
            <Link to="/cashier/reports" className={linkCard}>
              <div className="text-4xl mb-3">📊</div>
              <h3 className={clsx('font-heading text-2xl mb-2', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>Daily Reports</h3>
              <p className={welcomeSubclass}>View transactions and revenue</p>
            </Link>
          </div>

          <div className={cardClass}>
            <h2 className={clsx('font-heading text-xl mb-4', theme === 'dark' ? 'text-offwhite' : 'text-charcoal')}>Today&apos;s Transactions</h2>
            <div className="space-y-3">
              {recentTransactions.length > 0 ? recentTransactions.map((tx) => {
                const appt = tx.appointments;
                const serviceLabel = appt?.add_ons || appt?.services?.name || 'Service';
                return (
                  <div key={tx.id} className={appointmentCard}>
                    <div>
                      <div className={textColor}>{tx.customer?.full_name || 'Guest'}</div>
                      <div className={subtextClass}>{serviceLabel}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gold font-heading text-xl">${Number(tx.final_amount || tx.amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-green-400 capitalize">{tx.payment_method || 'paid'}</div>
                    </div>
                  </div>
                );
              }) : (
                <p className={clsx('text-center py-8', theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40')}>No transactions today</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
