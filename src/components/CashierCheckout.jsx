import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

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
  const [extrasAmount, setExtrasAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [saving, setSaving] = useState(false);

  const estimatedPrice = appointment?.services?.price || 0;
  const extras = parseFloat(extrasAmount) || 0;
  const finalPrice = (estimatedPrice + extras).toFixed(2);

  if (!appointment) return null;

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm(appointment.id, {
      final_price: parseFloat(finalPrice),
      extras_amount: extras,
      notes: notes,
      payment_method: paymentMethod
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-charcoal border border-gold/30 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
            <span className="text-offwhite/50">${estimatedPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Extras / Tip</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-offwhite/50">$</span>
              <input
                type="number"
                value={extrasAmount}
                onChange={(e) => setExtrasAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-offwhite/80 text-sm mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg resize-none"
              rows="3"
              placeholder="Customer added a gel-off at the last minute..."
            />
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

        <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-offwhite/60">Service</span>
            <span className="text-offwhite">${estimatedPrice.toFixed(2)}</span>
          </div>
          {extras > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-offwhite/60">Extras / Tip</span>
              <span className="text-offwhite">+${extras.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gold/20">
            <span className="text-offwhite font-medium">Final Total</span>
            <span className="font-heading text-2xl text-gold">${finalPrice}</span>
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
            disabled={saving}
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
  const { user } = useAuth();
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

  const handleCheckout = async (appointmentId, { final_price, extras_amount, notes, payment_method }) => {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        final_price,
        extras_amount,
        notes,
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

  const navigate = useNavigate();
  const handleNavigate = (page) => {
    if (page === 'home') navigate('/');
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
      <div className="max-w-7xl mx-auto px-6 py-8 pb-24 lg:pb-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl text-gold mb-2">Checkout Station</h1>
            <p className="text-offwhite/60">Complete payments for customers being served</p>
          </div>

          {notification && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-lg shadow-lg z-50 max-w-[90vw] text-center">
              <p className="font-heading text-lg">{notification.message}</p>
              <p className="text-sm opacity-90">{notification.name} - ${notification.amount?.toFixed(2)}</p>
            </div>
          )}

          {servingAppointments.length === 0 ? (
            <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#1a1a1a' }}>
              <div className="text-6xl mb-4">&#9744;</div>
              <h2 className="font-heading text-2xl text-offwhite mb-2">No Active Services</h2>
              <p className="text-offwhite/50">Customers currently being served will appear here for checkout.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servingAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-xl p-6 border border-gold/20" style={{ backgroundColor: '#1a1a1a' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading text-xl text-offwhite">
                      {appointment.customer?.full_name || 'Guest'}
                    </h3>
                    <span className={`px-2 py-1 text-xs border rounded ${statusColors[appointment.status]}`}>
                      {appointment.status === 'serving' ? 'In Chair' : appointment.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-offwhite/50">Service</span>
                      <span className="text-offwhite font-medium">{appointment.services?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-offwhite/50">Started</span>
                      <span className="text-offwhite/70">{formatTime(appointment.start_time)}</span>
                    </div>
                    <div className="flex justify-between text-lg pt-2 border-t border-offwhite/10">
                      <span className="text-offwhite font-medium">Est. Total</span>
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

          {checkingOut && (
            <CheckoutModal
              appointment={checkingOut}
              onConfirm={handleCheckout}
              onClose={() => setCheckingOut(null)}
            />
          )}
      </div>
    </div>
  );
}