import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const statusColors = {
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  assigned_pending: 'bg-blue-100 text-blue-800 border-blue-300',
  serving: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const CheckoutModal = ({ appointment, onConfirm, onClose }) => {
  const [finalPrice, setFinalPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (appointment?.services?.price) {
      setFinalPrice(appointment.services.price.toFixed(2));
    }
  }, [appointment]);

  if (!appointment) return null;

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm(appointment.id, {
      final_price: parseFloat(finalPrice),
      payment_method: paymentMethod
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-charcoal border border-gold/30 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-2xl text-gold">Settle Payment</h3>
          <button onClick={onClose} className="text-offwhite/50 hover:text-offwhite text-2xl">&times;</button>
        </div>

        <div className="bg-offwhite/5 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-offwhite/60">Customer</span>
            <span className="text-offwhite font-heading">{appointment.customer?.full_name || 'Guest'}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-offwhite/60">Service</span>
            <span className="text-gold font-heading">{appointment.services?.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-offwhite/60">Estimated Price</span>
            <span className="text-offwhite/50">${appointment.services?.price?.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Final Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-offwhite/50">$</span>
              <input
                type="number"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
            >
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
              <option value="Transfer">Transfer</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-offwhite/30 text-offwhite/60 hover:text-offwhite rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !finalPrice}
            className="flex-1 py-3 bg-gold text-charcoal font-heading hover:bg-gold/90 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CashierCheckout() {
  const { user, logout } = useAuth();
  const [servingAppointments, setServingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchServingAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, customer:profiles!appointments_profile_id_fkey(full_name), services(name, price)')
      .eq('status', 'serving')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching serving:', error);
    }
    setServingAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchServingAppointments();

    const channel = supabase
      .channel('cashier-checkout')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchServingAppointments();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleCheckout = async (appointmentId, { final_price, payment_method }) => {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        final_price,
        payment_method,
        cashier_id: user.id,
        completed_at: new Date().toISOString(),
        end_time: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (!error) {
      const appt = servingAppointments.find(a => a.id === appointmentId);
      setNotification({
        message: 'Payment Complete!',
        name: appt?.customer?.full_name,
        amount: final_price
      });
      setTimeout(() => setNotification(null), 3000);
      fetchServingAppointments();
    }
    setCheckingOut(null);
  };

  const firstName = user?.full_name?.split(' ')[0] || 'Cashier';

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="text-gold animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <nav className="bg-charcoal border-b border-gold/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/"><img src="/NC.jpg" alt="Nail Couture" className="h-16 w-auto" /></Link>
            <span className="text-gold/60 text-sm">Cashier Checkout</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gold font-heading text-sm">Hi, {firstName}</span>
            <button onClick={logout} className="text-offwhite/60 hover:text-offwhite text-sm">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-charcoal text-3xl mb-2">Checkout Station</h1>
          <p className="text-charcoal/60">Complete payments for customers being served</p>
        </div>

        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-lg shadow-lg z-50 max-w-[90vw] text-center">
            <p className="font-heading text-lg">{notification.message}</p>
            <p className="text-sm opacity-90">{notification.name} - ${notification.amount?.toFixed(2)}</p>
          </div>
        )}

        {servingAppointments.length === 0 ? (
          <div className="bg-white border border-charcoal/10 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">&#9744;</div>
            <h2 className="font-heading text-charcoal text-2xl mb-2">No Active Services</h2>
            <p className="text-charcoal/60">Customers currently being served will appear here for checkout.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servingAppointments.map((appointment) => (
              <div key={appointment.id} className="bg-white border border-charcoal/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading text-charcoal text-xl">
                    {appointment.customer?.full_name || 'Guest'}
                  </h3>
                  <span className={`px-2 py-1 text-xs border ${statusColors[appointment.status]}`}>
                    {appointment.status === 'serving' ? 'In Chair' : appointment.status}
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-charcoal/60">Service</span>
                    <span className="text-charcoal font-medium">{appointment.services?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-charcoal/60">Started</span>
                    <span className="text-charcoal/70">{formatTime(appointment.start_time)}</span>
                  </div>
                  <div className="flex justify-between text-lg pt-2 border-t border-charcoal/10">
                    <span className="text-charcoal font-medium">Est. Total</span>
                    <span className="text-gold font-heading">${appointment.services?.price?.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setCheckingOut(appointment)}
                  className="w-full py-3 bg-gold text-charcoal font-heading hover:bg-gold/90 rounded-lg transition-colors"
                >
                  Settle Payment
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {checkingOut && (
        <CheckoutModal
          appointment={checkingOut}
          onConfirm={handleCheckout}
          onClose={() => setCheckingOut(null)}
        />
      )}
    </div>
  );
}