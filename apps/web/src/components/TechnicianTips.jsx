import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import {
  fetchTechnicianTipPayments,
  sumTipsFromPayments,
  TIP_PERIOD_OPTIONS,
  getTipPeriodLabel,
  formatTipPeriodRange,
} from '@nail-couture/shared/utils/technicianQueue';
import Sidebar from './Sidebar';

function formatTipTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TechnicianTips() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('today');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isDark = theme === 'dark';
  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    isDark ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal',
  );
  const cardClass = isDark ? 'bg-[#1a1a1a] border-gold/20' : 'bg-white border-gold/30';
  const mutedClass = isDark ? 'text-offwhite/60' : 'text-charcoal/60';

  const loadTips = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchTechnicianTipPayments(user.id, period);
      setPayments(data);
    } catch (err) {
      console.warn('Failed to load tips:', err);
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, period]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'technician') {
      navigate(getHomePath(user.role));
    }
  }, [user, navigate]);

  useEffect(() => {
    loadTips();
  }, [loadTips]);

  const totalTips = sumTipsFromPayments(payments);
  const periodLabel = getTipPeriodLabel(period);
  const periodRange = formatTipPeriodRange(period);

  return (
    <div className={bgClass}>
      <Sidebar />
      <div className="max-w-3xl mx-auto px-6 py-8 pb-24 lg:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl text-gold">My Tips</h1>
            <p className={clsx('text-sm mt-1', mutedClass)}>Tips from completed checkouts</p>
          </div>
          <button
            type="button"
            onClick={() => loadTips(true)}
            disabled={refreshing}
            className={clsx(
              'px-4 py-2 text-sm border rounded-lg disabled:opacity-50',
              isDark ? 'border-offwhite/20 hover:border-gold/40' : 'border-charcoal/20 hover:border-gold/40',
            )}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {TIP_PERIOD_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={clsx(
                'px-4 py-2 text-sm rounded-lg border transition-colors',
                period === id
                  ? 'bg-gold text-charcoal border-gold'
                  : isDark
                    ? 'border-offwhite/20 text-offwhite/70 hover:border-gold/40'
                    : 'border-charcoal/20 text-charcoal/70 hover:border-gold/40',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={clsx('rounded-xl border p-6 mb-6', cardClass)}>
          <p className={clsx('text-sm', mutedClass)}>{periodLabel} total</p>
          {periodRange && (
            <p className={clsx('text-xs mt-0.5', mutedClass)}>{periodRange}</p>
          )}
          <p className="font-heading text-4xl text-gold mt-1">${totalTips.toFixed(2)}</p>
          <p className={clsx('text-xs mt-2', mutedClass)}>
            {payments.length} tip{payments.length !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gold animate-pulse">Loading tips…</div>
        ) : payments.length === 0 ? (
          <div className={clsx('rounded-xl border p-12 text-center', cardClass)}>
            <div className="text-5xl mb-4">💵</div>
            <h2 className="font-heading text-xl mb-2">No tips yet</h2>
            <p className={clsx('text-sm', mutedClass)}>
              Tips appear here after cashier checkout for your visits.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className={clsx('rounded-xl border p-4 flex items-center justify-between gap-4', cardClass)}
              >
                <div className="min-w-0">
                  <p className={clsx('font-medium truncate', isDark ? 'text-offwhite' : 'text-charcoal')}>
                    {payment.customer?.full_name || 'Guest'}
                  </p>
                  <p className={clsx('text-xs mt-1', mutedClass)}>
                    {formatTipTime(payment.created_at)}
                  </p>
                </div>
                <span className="font-heading text-xl text-gold shrink-0">
                  ${Number(payment.extras_amount || 0).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
