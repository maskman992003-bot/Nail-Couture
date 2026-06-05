import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CASHIER_CHECKOUT } from '../constants/featureFlags';
import { LOYALTY_REWARDS } from '../utils/loyaltyTransactions';
import { getHomePath } from '../utils/routes';
import Sidebar from './Sidebar';
import clsx from 'clsx';

const statusColors = {
  ready_for_checkout: 'bg-amber-100 text-amber-800 border-amber-300',
  serving: 'bg-green-100 text-green-800 border-green-300',
};

const statusLabels = {
  ready_for_checkout: 'Ready',
  serving: 'In Chair',
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

function computeTotals(basePrice, extras, discountAmount, discountType) {
  const subtotal = basePrice + extras;
  let discount = 0;
  const discVal = parseFloat(discountAmount) || 0;
  if (discVal > 0) {
    discount = discountType === 'percent' ? subtotal * (discVal / 100) : discVal;
  }
  const finalTotal = Math.max(0, subtotal - discount);
  return { subtotal, discount, finalTotal };
}

const CheckoutModal = ({ appointment, onConfirm, onClose, theme }) => {
  const [extrasAmount, setExtrasAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState('amount');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [loyaltyRewardId, setLoyaltyRewardId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const basePrice = appointment?.final_price || appointment?.services?.price || 0;
  const extras = parseFloat(extrasAmount) || 0;
  const { subtotal, discount, finalTotal } = computeTotals(basePrice, extras, discountAmount, discountType);

  const customerPoints = appointment?.customer?.loyalty_points || 0;
  const selectedReward = LOYALTY_REWARDS.find((r) => r.id === loyaltyRewardId);

  const isDark = theme === 'dark';
  const modalBg = isDark ? 'bg-[#1a1a1a] border-gold/10' : 'bg-white border-gold/30';
  const inputClass = isDark
    ? 'w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg'
    : 'w-full px-4 py-3 bg-charcoal/5 border border-charcoal/20 text-charcoal rounded-lg';
  const labelClass = isDark ? 'block text-offwhite/80 text-sm mb-2' : 'block text-charcoal/80 text-sm mb-2';
  const mutedClass = isDark ? 'text-offwhite/60' : 'text-charcoal/60';
  const textClass = isDark ? 'text-offwhite' : 'text-charcoal';

  if (!appointment) return null;

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      await onConfirm(appointment.id, {
        amount: subtotal,
        discount_amount: discount,
        discount_type: discountType === 'percent' ? 'percentage' : discount > 0 && selectedReward ? 'loyalty' : 'fixed',
        final_amount: finalTotal,
        extras_amount: extras,
        notes,
        payment_method: paymentMethod,
        loyalty_points_redeem: selectedReward?.points || 0,
        loyalty_reward_name: selectedReward?.name || null,
      });
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={clsx('w-full max-w-md flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border shadow-2xl', modalBg)}>
        <div className={clsx('flex items-center justify-between gap-4 p-4 sm:p-6 border-b', isDark ? 'border-gold/10' : 'border-gold/20')}>
          <h3 className="font-heading text-2xl text-gold">Settle Payment</h3>
          <button type="button" onClick={onClose} className={clsx(isDark ? 'text-offwhite/50 hover:text-offwhite' : 'text-charcoal/50 hover:text-charcoal', 'text-2xl')}>&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className={clsx('rounded-lg p-4 mb-6', isDark ? 'bg-offwhite/5' : 'bg-charcoal/5')}>
            <div className="flex justify-between items-center mb-2">
              <span className={mutedClass}>Customer</span>
              <span className={clsx('font-heading', textClass)}>{appointment.customer?.full_name || 'Guest'}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className={mutedClass}>Service</span>
              <span className="text-gold font-heading">{appointment.add_ons || appointment.services?.name || 'Service'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={mutedClass}>Estimated Price</span>
              <span className={mutedClass}>${basePrice.toFixed(2)}</span>
            </div>
            {customerPoints > 0 && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gold/10">
                <span className={mutedClass}>Loyalty Points</span>
                <span className="text-gold">{customerPoints} pts</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Extras / Tip</label>
              <div className="relative">
                <span className={clsx('absolute left-4 top-1/2 -translate-y-1/2', mutedClass)}>$</span>
                <input
                  type="number"
                  value={extrasAmount}
                  onChange={(e) => setExtrasAmount(e.target.value)}
                  className={clsx(inputClass, 'pl-8')}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Discount</label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className={inputClass}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className={inputClass}
                >
                  <option value="amount">$</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>

            {customerPoints > 0 && (
              <div>
                <label className={labelClass}>Redeem Loyalty Reward</label>
                <select
                  value={loyaltyRewardId}
                  onChange={(e) => setLoyaltyRewardId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {LOYALTY_REWARDS.map((reward) => (
                    <option key={reward.id} value={reward.id} disabled={customerPoints < reward.points}>
                      {reward.name} ({reward.points} pts){customerPoints < reward.points ? ' — insufficient' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={clsx(inputClass, 'resize-none')}
                rows="3"
                placeholder="Optional checkout notes..."
              />
            </div>

            <div>
              <label className={labelClass}>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={inputClass}
              >
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
          </div>

          <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className={mutedClass}>Subtotal</span>
              <span className={textClass}>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between items-center mb-2 text-green-500">
                <span>Discount</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            {selectedReward && (
              <div className="flex justify-between items-center mb-2 text-amber-500 text-sm">
                <span>Loyalty redeem</span>
                <span>{selectedReward.points} pts — {selectedReward.name}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gold/20">
              <span className={clsx('font-medium', textClass)}>Final Total</span>
              <span className="font-heading text-2xl text-gold">${finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={clsx('flex-1 py-3 border rounded-lg transition-colors', isDark ? 'border-offwhite/30 text-offwhite/60 hover:text-offwhite' : 'border-charcoal/30 text-charcoal/60 hover:text-charcoal')}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 py-3 bg-gold text-charcoal font-heading hover:bg-gold/90 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function AppointmentCard({ appointment, onCheckout, theme, highlight }) {
  const isDark = theme === 'dark';
  const cardClass = clsx(
    'rounded-xl p-6 border',
    highlight
      ? 'border-amber-500/40 bg-amber-500/10'
      : isDark ? 'border-gold/20 bg-[#1a1a1a]' : 'border-gold/30 bg-white'
  );
  const mutedClass = isDark ? 'text-offwhite/50' : 'text-charcoal/50';
  const textClass = isDark ? 'text-offwhite' : 'text-charcoal';

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={clsx('font-heading text-xl', textClass)}>
          {appointment.customer?.full_name || 'Guest'}
        </h3>
        <span className={clsx('px-2 py-1 text-xs border rounded', statusColors[appointment.status] || statusColors.serving)}>
          {statusLabels[appointment.status] || appointment.status}
        </span>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className={mutedClass}>Service</span>
          <span className={clsx('font-medium', textClass)}>{appointment.add_ons || appointment.services?.name || 'Service'}</span>
        </div>
        {appointment.technician && (
          <div className="flex justify-between text-sm">
            <span className={mutedClass}>Technician</span>
            <span className={isDark ? 'text-offwhite/70' : 'text-charcoal/70'}>{appointment.technician.full_name}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className={mutedClass}>{appointment.status === 'ready_for_checkout' ? 'Ready since' : 'Started'}</span>
          <span className={isDark ? 'text-offwhite/70' : 'text-charcoal/70'}>
            {formatTime(appointment.checkout_ready_at || appointment.start_time)}
          </span>
        </div>
        <div className={clsx('flex justify-between text-lg pt-2 border-t', isDark ? 'border-offwhite/10' : 'border-charcoal/10')}>
          <span className={clsx('font-medium', textClass)}>Est. Total</span>
          <span className="text-gold font-heading">${(appointment.final_price || appointment.services?.price || 0).toFixed(2)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onCheckout(appointment)}
        className="w-full py-3 bg-gold text-charcoal font-heading hover:bg-gold/90 rounded-lg transition-colors"
      >
        Settle Payment
      </button>
    </div>
  );
}

export default function CashierCheckout() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [readyAppointments, setReadyAppointments] = useState([]);
  const [servingAppointments, setServingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [notification, setNotification] = useState(null);

  const isDark = theme === 'dark';
  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    isDark ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'
  );
  const mutedClass = isDark ? 'text-offwhite/60' : 'text-charcoal/60';
  const emptyCardClass = isDark ? 'bg-[#1a1a1a]' : 'bg-charcoal/5 border border-gold/20';

  const allAppointments = useMemo(
    () => [...readyAppointments, ...servingAppointments],
    [readyAppointments, servingAppointments]
  );

  useEffect(() => {
    if (!CASHIER_CHECKOUT) {
      navigate(getHomePath(user?.role || 'customer'));
      return;
    }
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchQueues = async () => {
    const caller = localStorage.getItem('salon_user_data');
    const phone = caller ? JSON.parse(caller).phone : '';

    const [readyResult, servingResult] = await Promise.all([
      supabase.rpc('get_appointments', { caller_phone: phone, status_filter: 'ready_for_checkout', order_asc: true }),
      supabase.rpc('get_appointments', { caller_phone: phone, status_filter: 'serving', order_asc: true }),
    ]);

    if (readyResult.error) console.error('Error fetching checkout queue:', readyResult.error);
    if (servingResult.error) console.error('Error fetching serving:', servingResult.error);

    setReadyAppointments(readyResult.data || []);
    setServingAppointments(servingResult.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!CASHIER_CHECKOUT) return undefined;
    fetchQueues();

    const channel = supabase
      .channel('cashier-checkout')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchQueues();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleCheckout = async (appointmentId, checkoutData) => {
    const appt = allAppointments.find((a) => a.id === appointmentId);

    const { data, error } = await supabase.rpc('process_checkout', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_amount: checkoutData.amount,
      p_discount_amount: checkoutData.discount_amount,
      p_discount_type: checkoutData.discount_type,
      p_final_amount: checkoutData.final_amount,
      p_payment_method: checkoutData.payment_method,
      p_notes: checkoutData.notes || null,
      p_loyalty_points_redeem: checkoutData.loyalty_points_redeem || 0,
      p_loyalty_reward_name: checkoutData.loyalty_reward_name || null,
    });

    if (error) {
      if (error.message?.includes('process_checkout') || error.code === '42883') {
        throw new Error('Checkout unavailable. Run sql/031_cashier_workflow.sql in Supabase.');
      }
      throw error;
    }

    const amount = data?.final_amount ?? checkoutData.final_amount;

    setNotification({
      message: 'Payment Complete!',
      name: appt?.customer?.full_name,
      amount,
      points: data?.points_earned,
    });
    setTimeout(() => setNotification(null), 3000);
    await fetchQueues();
    setCheckingOut(null);
  };

  if (!CASHIER_CHECKOUT) return null;

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
      <div className="max-w-7xl mx-auto px-6 py-8 pb-24 lg:pb-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl text-gold mb-2">Checkout Station</h1>
          <p className={mutedClass}>Process payments for clients ready at the front desk</p>
        </div>

        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-lg shadow-lg z-50 max-w-[90vw] text-center">
            <p className="font-heading text-lg">{notification.message}</p>
            <p className="text-sm opacity-90">
              {notification.name} — ${notification.amount?.toFixed(2)}
              {notification.points > 0 && ` · +${notification.points} loyalty pts`}
            </p>
          </div>
        )}

        {readyAppointments.length > 0 && (
          <section className="mb-10">
            <h2 className="font-heading text-xl text-amber-400 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
              Checkout Queue ({readyAppointments.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readyAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCheckout={setCheckingOut}
                  theme={theme}
                  highlight
                />
              ))}
            </div>
          </section>
        )}

        {servingAppointments.length > 0 && (
          <section className="mb-10">
            <h2 className={clsx('font-heading text-xl mb-4', isDark ? 'text-offwhite/80' : 'text-charcoal/80')}>
              Still In Chair ({servingAppointments.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCheckout={setCheckingOut}
                  theme={theme}
                />
              ))}
            </div>
          </section>
        )}

        {readyAppointments.length === 0 && servingAppointments.length === 0 && (
          <div className={clsx('rounded-xl p-12 text-center', emptyCardClass)}>
            <div className="text-6xl mb-4">&#9744;</div>
            <h2 className={clsx('font-heading text-2xl mb-2', isDark ? 'text-offwhite' : 'text-charcoal')}>No Clients to Checkout</h2>
            <p className={mutedClass}>Clients sent from technicians or the lobby will appear here.</p>
          </div>
        )}

        {checkingOut && (
          <CheckoutModal
            appointment={checkingOut}
            onConfirm={handleCheckout}
            onClose={() => setCheckingOut(null)}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
