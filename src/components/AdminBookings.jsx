import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

const statusConfig = {
  waiting: { label: 'Waiting', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50', dot: 'bg-yellow-400', tab: 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300' },
  assigned_pending: { label: 'Assigned', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50', dot: 'bg-blue-400', tab: 'bg-blue-900/20 border-blue-700/50 text-blue-300' },
  serving: { label: 'In Chair', color: 'bg-green-900/50 text-green-300 border-green-700/50', dot: 'bg-green-400', tab: 'bg-green-900/20 border-green-700/50 text-green-300' },
  completed: { label: 'Completed', color: 'bg-green-800/40 text-green-300 border-green-700/30', dot: 'bg-green-400', tab: 'bg-green-900/20 border-green-700/50 text-green-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/50 text-red-300 border-red-700/50', dot: 'bg-red-500', tab: 'bg-red-900/20 border-red-700/50 text-red-300' },
};

const statusOrder = ['waiting', 'assigned_pending', 'serving', 'completed', 'cancelled'];

export default function AdminBookings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [editingBooking, setEditingBooking] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const showFeedback = useCallback((id, type) => {
    setFeedback((prev) => ({ ...prev, [id]: type }));
    setTimeout(() => setFeedback((prev) => ({ ...prev, [id]: null })), 1500);
  }, []);

  const fetchBookings = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('source', 'online')
        .order('scheduled_time', { ascending: false });
      if (error) throw error;

      const bookingList = data || [];
      const profileIds = [...new Set(bookingList.map((b) => b.profile_id).filter(Boolean))];
      const serviceIds = [...new Set(bookingList.map((b) => b.service_id).filter(Boolean))];
      const techIds = [...new Set(bookingList.map((b) => b.technician_id).filter(Boolean))];

      const [profilesRes, servicesRes, techsRes] = await Promise.all([
        profileIds.length ? supabase.from('profiles').select('id, full_name, phone_number, nail_goal, refreshment_pref').in('id', profileIds) : { data: [] },
        serviceIds.length ? supabase.from('services').select('id, name, price, duration_minutes').in('id', serviceIds) : { data: [] },
        techIds.length ? supabase.from('profiles').select('id, full_name').in('id', techIds) : { data: [] },
      ]);

      const profileMap = {};
      (profilesRes.data || []).forEach((p) => { profileMap[p.id] = p; });
      const serviceMap = {};
      (servicesRes.data || []).forEach((s) => { serviceMap[s.id] = s; });
      const techMap = {};
      (techsRes.data || []).forEach((t) => { techMap[t.id] = t; });

      const enriched = bookingList.map((b) => ({
        ...b,
        customer: profileMap[b.profile_id] || null,
        service: serviceMap[b.service_id] || null,
        tech: techMap[b.technician_id] || null,
      }));

      setBookings(enriched);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendNotification = async (booking, newStatus) => {
    const customerName = booking.customer?.full_name || 'Customer';
    const serviceName = booking.service?.name || 'your service';
    const statusMessages = {
      assigned_pending: `Hi ${customerName}, your appointment for ${serviceName} is confirmed. See you soon!`,
      serving: `Hi ${customerName}, your ${serviceName} appointment has started. We'll let you know when it's done!`,
      completed: `Hi ${customerName}, your ${serviceName} appointment is complete. Thanks for visiting! We hope to see you again.`,
      cancelled: `Hi ${customerName}, your appointment for ${serviceName} has been cancelled. Please rebook at your convenience.`,
    };
    const message = statusMessages[newStatus];
    const titleMap = {
      assigned_pending: 'Booking Confirmed',
      serving: 'Service Started',
      completed: 'Service Completed',
      cancelled: 'Booking Cancelled',
    };
    if (!message) return;
    const notifPayload = {
      target_user_id: booking.profile_id,
      online_booking_id: booking.id,
      title: titleMap[newStatus],
      message,
      is_read: false,
    };
    await supabase.from('notifications').insert(notifPayload).catch(() => {});

    if (newStatus === 'completed') {
      const earnedPoints = Math.floor(booking.service?.price || booking.final_price || booking.price || 0);
      if (earnedPoints > 0) {
        await supabase.rpc('add_loyalty_points', { p_profile_id: booking.profile_id, p_points: earnedPoints }).catch(() => {});
        const pointsNotif = {
          target_user_id: booking.profile_id,
          online_booking_id: booking.id,
          title: 'Loyalty Points Earned!',
          message: `You earned ${earnedPoints} loyalty points from your ${serviceName} visit!`,
          is_read: false,
        };
        await supabase.from('notifications').insert(pointsNotif).catch(() => {});
      }
    }
  };

  const updateStatus = useCallback(async (booking, newStatus) => {
    console.log('[updateStatus] called', { bookingId: booking.id, status: newStatus });
    setUpdatingId(booking.id);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', booking.id);
      if (error) throw error;
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: newStatus } : b)));
      showFeedback(booking.id, 'ok');
      await sendNotification(booking, newStatus);
    } catch (err) {
      console.error('Error updating booking:', err);
      showFeedback(booking.id, 'error');
    } finally {
      setUpdatingId(null);
    }
  }, [showFeedback]);

  const openEdit = (booking) => {
    const d = new Date(booking.scheduled_time);
    setEditDate(d.toISOString().split('T')[0]);
    setEditTime(d.toTimeString().slice(0, 5));
    setEditError('');
    setEditingBooking(booking);
  };

  const saveEdit = async () => {
    if (!editDate || !editTime) { setEditError('Date and time are required'); return; }
    setSavingEdit(true);
    setEditError('');
    const newScheduled = new Date(`${editDate}T${editTime}:00`).toISOString();
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ scheduled_time: newScheduled, updated_at: new Date().toISOString() })
        .eq('id', editingBooking.id);
      if (error) throw error;
      setBookings((prev) => prev.map((b) =>
        b.id === editingBooking.id ? { ...b, scheduled_time: newScheduled } : b
      ));
      setEditingBooking(null);
      showFeedback(editingBooking.id, 'ok');
      const customerName = editingBooking.customer?.full_name || 'Customer';
      const serviceName = editingBooking.service?.name || 'your appointment';
      const newDateStr = new Date(newScheduled).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const newTimeStr = new Date(newScheduled).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      await supabase.from('notifications').insert({
        target_user_id: editingBooking.profile_id,
        online_booking_id: editingBooking.id,
        title: 'Appointment Rescheduled',
        message: `Hi ${customerName}, your ${serviceName} appointment has been rescheduled to ${newDateStr} at ${newTimeStr}.`,
        is_read: false,
      });
    } catch (err) {
      setEditError(err.message || 'Failed to update');
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['admin', 'super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate(user.role === 'technician' ? '/technician' : '/portal');
      return;
    }
    fetchBookings();
  }, [user, navigate, fetchBookings]);

  const filteredBookings = bookings.filter((b) => {
    const name = b.customer?.full_name || '';
    const service = b.service?.name || '';
    const phone = b.customer?.phone_number || '';
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm);
    const matchesTab = activeTab === 'all' || b.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const tabCounts = statusOrder.reduce((acc, s) => {
    acc[s] = bookings.filter((b) => b.status === s).length;
    return acc;
  }, {});

  const activeCount = bookings.filter((b) => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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
      <div className="p-4 md:p-6 lg:p-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b flex-shrink-0" style={{ borderColor: 'rgba(197, 160, 89, 0.1)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl text-gold">Booking Management</h1>
              <p className="text-offwhite/60 text-sm mt-1">{today} &mdash; {activeCount} active</p>
            </div>
            <button
              onClick={() => fetchBookings(true)}
              className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <div className="rounded-xl p-1 flex gap-1 overflow-x-auto" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197, 160, 89, 0.1)' }}>
            <button
              onClick={() => setActiveTab('all')}
              className={`min-w-[90px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'all' ? 'text-charcoal' : 'text-offwhite/60'
              }`}
              style={activeTab === 'all' ? { background: 'linear-gradient(135deg, #c5a059, #f0d78c)' } : {}}
            >
              All ({bookings.length})
            </button>
            {statusOrder.map((s) => {
              const cfg = statusConfig[s];
              const count = tabCounts[s];
              if (count === 0 && activeTab !== s) return null;
              return (
                <button
                  key={s}
                  onClick={() => setActiveTab(s)}
                  className={`min-w-[90px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all border whitespace-nowrap ${
                    activeTab === s ? '' : 'text-offwhite/60'
                  }`}
                  style={
                    activeTab === s
                      ? { background: 'linear-gradient(135deg, #c5a059, #f0d78c)', borderColor: 'transparent' }
                      : { borderColor: 'rgba(255,255,255,0.08)' }
                  }
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
          <div className="mt-4 mb-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, service, or phone..."
              className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite placeholder-offwhite/30 rounded-lg focus:border-gold focus:outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
          {filteredBookings.length === 0 ? (
            <div className="rounded-xl p-12 text-center mt-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-offwhite/30 text-4xl mb-4">&#128197;</div>
              <h2 className="font-heading text-2xl text-offwhite mb-2">No Bookings Found</h2>
              <p className="text-offwhite/50 text-sm">No appointments match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
           {filteredBookings.map((booking) => {
                 const fb = feedback[booking.id];
                 const isUpdating = updatingId === booking.id;
                 const cfg = statusConfig[booking.status];
                 const customer = booking.customer;
                 return (
                   <div
                     key={booking.id}
                     className="min-w-0 rounded-xl p-6 border transition-all hover:border-gold/40"
                     style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                   >
                     <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                       <div className="flex-1">
                         <div className="flex items-start justify-between mb-3">
                           <div>
                             <div className="text-offwhite font-heading text-xl">{customer?.full_name || 'Guest'}</div>
                             <div className="text-offwhite/40 text-sm mt-0.5">{customer?.phone_number || 'No phone'}</div>
                           </div>
                           <span className={`px-3 py-1 text-xs rounded-full border flex-shrink-0 ${cfg.color}`}>
                             {cfg.label}
                           </span>
                         </div>
                         <div className="flex flex-wrap gap-4 text-sm">
<div>
                              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-0.5">Service</div>
                              <div className="text-gold font-heading">{booking.service?.name || 'Service'}</div>
                            </div>
                            <div>
                              <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-0.5">Price</div>
                              <div className="text-offwhite font-heading">{booking.service?.price || booking.final_price || booking.price}</div>
                            </div>
                           <div>
                             <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-0.5">Scheduled</div>
                             <div className="text-offwhite font-heading">
                               {new Date(booking.scheduled_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                               {new Date(booking.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                             </div>
                           </div>
{booking.tech && (
                              <div>
                                <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-0.5">Technician</div>
                                <div className="text-offwhite font-heading">{booking.tech.full_name}</div>
                              </div>
                            )}
                         </div>
                         {customer?.nail_goal && (
                           <div className="text-offwhite/40 text-xs italic mt-3">Goal: {customer.nail_goal}</div>
                         )}
                       </div>

                       <div className="flex flex-col gap-2 lg:w-64 lg:items-end flex-shrink-0">
                         <div className="flex items-center gap-2 flex-wrap lg:justify-end">
<button
                              onClick={() => openEdit(booking)}
                              disabled={isUpdating}
                              className="px-4 py-2 text-xs font-medium rounded-lg border text-offwhite/60 hover:text-gold hover:border-gold/50 transition-all disabled:opacity-30"
                              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                            >
                              Edit Schedule
                            </button>
                            {booking.status === 'waiting' && (
                              <button
                                onClick={() => updateStatus(booking, 'assigned_pending')}
                                disabled={isUpdating}
                                className="px-4 py-2 text-xs font-medium rounded-lg border text-blue-300 hover:bg-blue-900/20 hover:border-blue-500/50 transition-all disabled:opacity-30"
                                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                              >
                                {isUpdating ? 'Processing...' : 'Confirm'}
                              </button>
                            )}
                            {booking.status === 'assigned_pending' && (
                              <button
                                onClick={() => updateStatus(booking, 'serving')}
                                disabled={isUpdating}
                                className="px-4 py-2 text-xs font-medium rounded-lg border text-green-300 hover:bg-green-900/20 hover:border-green-500/50 transition-all disabled:opacity-30"
                                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                              >
                                Start Service
                              </button>
                            )}
                            {booking.status === 'serving' && (
                              <button
                                onClick={() => updateStatus(booking, 'completed')}
                                disabled={isUpdating}
                                className="px-4 py-2 text-xs font-medium rounded-lg bg-gold text-charcoal hover:bg-gold/90 transition-all disabled:opacity-30"
                              >
                                Mark Completed
                              </button>
                            )}
                           {!['completed', 'cancelled'].includes(booking.status) && (
                             <button
                               onClick={() => updateStatus(booking, 'cancelled')}
                               disabled={isUpdating}
                               className="px-4 py-2 text-xs font-medium rounded-lg border text-red-400 hover:bg-red-900/20 hover:border-red-500/50 transition-all disabled:opacity-30"
                               style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                             >
                               Cancel
                             </button>
                           )}
                           {(booking.status === 'completed' || booking.status === 'cancelled') && (
                             <div className="px-4 py-2 text-xs text-center">
                               {fb === 'ok' && <span className="text-green-400 font-heading">&#10003; Updated</span>}
                               {fb === 'error' && <span className="text-red-400 font-heading">Failed</span>}
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               })}
            </div>
          )}
        </div>
      </div>

      {editingBooking && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md rounded-2xl p-8 border-2" style={{ backgroundColor: '#111', borderColor: 'rgba(197, 160, 89, 0.4)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-2xl text-gold">Edit Schedule</h2>
              <button onClick={() => setEditingBooking(null)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">&times;</button>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-lg text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-offwhite font-heading mb-1">{editingBooking.customer?.full_name}</div>
                <div className="text-offwhite/50 text-xs">{editingBooking.service?.name} &middot; ${editingBooking.service?.price || editingBooking.price || editingBooking.final_price}</div>
              </div>
              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite rounded-lg focus:border-gold focus:outline-none"
                  style={{ backgroundColor: '#111' }}
                />
              </div>
              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Time</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite rounded-lg focus:border-gold focus:outline-none"
                  style={{ backgroundColor: '#111' }}
                />
              </div>
              {editError && <p className="text-red-400 text-sm">{editError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="flex-1 py-3 bg-offwhite/10 text-offwhite rounded-lg hover:bg-offwhite/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="flex-1 py-3 bg-gold text-charcoal rounded-lg hover:bg-gold/90 transition-colors font-medium disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}