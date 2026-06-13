import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags';
import {
  fetchCustomerVisitHistory,
  fetchVisitLoyaltyPoints,
  fetchVisitPayment,
  buildReceiptFromBooking,
  formatReceiptContent,
  formatPaymentReceiptRow,
  downloadTextFile,
  receiptFilename,
  computeActualDurationMinutes,
} from '@nail-couture/shared/utils/customerStats';
import {
  enrichAppointmentsWithServices,
  getAppointmentTechnicianNames,
} from '@nail-couture/shared/utils/appointmentServices';
import { fetchReviewableAppointments } from '@nail-couture/shared/utils/customerReviewService';
import Sidebar from './Sidebar';
import ReviewForm from './reviews/ReviewForm';

const statusConfigDark = {
  waiting: { label: 'Waiting', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' },
  assigned_pending: { label: 'Assigned', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
  serving: { label: 'In Chair', color: 'bg-green-900/50 text-green-300 border-green-700/50' },
  ready_for_checkout: { label: 'At Checkout', color: 'bg-amber-900/50 text-amber-300 border-amber-700/50' },
  completed: { label: 'Completed', color: 'bg-green-800/40 text-green-300 border-green-700/30' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/50 text-red-300 border-red-700/50' },
};

const statusConfigLight = {
  waiting: { label: 'Waiting', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  assigned_pending: { label: 'Assigned', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  serving: { label: 'In Chair', color: 'bg-green-100 text-green-800 border-green-300' },
  ready_for_checkout: { label: 'At Checkout', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300' },
};

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['waiting', 'assigned_pending', 'serving', 'ready_for_checkout', 'pending', 'confirmed', 'in_progress'];
const HISTORY_STATUSES = ['completed', 'cancelled'];

const isWalkIn = (appointment) => !appointment.booking_type || appointment.booking_type === 'walk_in';

async function resolveCustomerIds(customerId, phone) {
  const ids = new Set();
  if (customerId) ids.add(customerId);
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone) {
      const { data } = await supabase.from('profiles').select('id').eq('phone', cleanPhone);
      (data || []).forEach((profile) => ids.add(profile.id));
    }
  }
  return [...ids];
}

export default function CustomerHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailBooking, setSelectedDetailBooking] = useState(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);
  const [reviewableIds, setReviewableIds] = useState(new Set());
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [reviewModalBooking, setReviewModalBooking] = useState(null);

  const fetchData = useCallback(async () => {
    const userId = user?.id;
    if (!userId) { setLoading(false); navigate('/login'); return; }
    try {
      const customerIds = await resolveCustomerIds(userId, user?.phone);
      const [allData, notifRes, loyaltyByAppt, reviewableRes] = await Promise.all([
        fetchCustomerVisitHistory(userId, user?.phone, { includeOnline: CUSTOMER_ONLINE_BOOKING }),
        supabase.from('notifications').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(10),
        fetchVisitLoyaltyPoints(customerIds),
        fetchReviewableAppointments(user?.phone),
      ]);

      const onlineList = CUSTOMER_ONLINE_BOOKING ? allData.filter((a) => a.booking_type === 'online') : [];
      const kioskList = CUSTOMER_ONLINE_BOOKING ? allData.filter(isWalkIn) : allData;
      const toEnrich = [...onlineList, ...kioskList];
      const enriched = await enrichAppointmentsWithServices(supabase, toEnrich);

      const combined = enriched.map((b) => ({
        ...b,
        service: b.services,
        tech: b.technicians || null,
        source: b.booking_type === 'online' ? 'online' : 'kiosk',
        loyaltyPointsEarned: loyaltyByAppt[b.id] || null,
      })).sort((a, b) => {
        const dateA = new Date(a.checked_in_at || a.scheduled_at || a.created_at);
        const dateB = new Date(b.checked_in_at || b.scheduled_at || b.created_at);
        return dateB - dateA;
      });

      setActiveVisits(combined.filter((b) => ACTIVE_STATUSES.includes(b.status)));
      setBookings(combined.filter((b) => HISTORY_STATUSES.includes(b.status)));
      setNotifications(notifRes.data || []);
      if (reviewableRes.available) {
        setReviewableIds(new Set((reviewableRes.rows || []).map((row) => row.appointment_id)));
      }
    } catch (err) {
      console.error('Error loading visit history:', err);
    }
    setLoading(false);
  }, [navigate, user?.id, user?.phone]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user && ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'].includes(user.role)) {
      const route = (user.role === 'super_admin' || user.role === 'owner' || user.role === 'partner') ? '/superadmin' : `/${user.role}`;
      navigate(route);
      return;
    }
    fetchData();
  }, [user, navigate, fetchData]);

  const cancelBooking = useCallback(async (booking) => {
    setUpdatingId(booking.id);
    try {
      const { error } = await supabase.rpc('cancel_my_appointment', { caller_phone: user?.phone, appointment_id: booking.id });
      if (error) throw error;
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      console.error('Error cancelling booking:', err);
    } finally {
      setUpdatingId(null);
    }
  }, [user?.phone]);

  const generateReceipt = async (booking) => {
    if (!user?.id) return;
    setReceiptLoadingId(booking.id);
    try {
      let payment = null;
      try {
        payment = await fetchVisitPayment(booking.id);
      } catch (paymentErr) {
        console.warn('Payment lookup failed, generating receipt without payment details:', paymentErr);
      }
      const receipt = buildReceiptFromBooking(booking, payment);
      const receiptContent = formatReceiptContent(receipt);
      downloadTextFile(
        receiptContent,
        receiptFilename(booking.checked_in_at || booking.scheduled_at, booking.id),
      );
    } catch (err) {
      console.error('Receipt error:', err);
      window.alert('Unable to generate receipt. Please try again.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const getEmptyHistoryState = () => {
    if (bookings.length === 0) {
      return {
        title: CUSTOMER_ONLINE_BOOKING ? 'No Bookings Found' : 'No Visits Yet',
        message: CUSTOMER_ONLINE_BOOKING
          ? 'No completed or cancelled bookings yet.'
          : 'Check in at the salon kiosk to start building your visit history.',
        showAction: true,
      };
    }
    if (activeTab === 'completed') {
      return {
        title: 'No Completed Visits',
        message: 'You do not have any completed visits yet.',
        showAction: false,
      };
    }
    if (activeTab === 'cancelled') {
      return {
        title: 'No Cancelled Visits',
        message: 'You have not cancelled any visits.',
        showAction: false,
      };
    }
    return {
      title: 'No Visits Found',
      message: 'No visits match your current filter.',
      showAction: false,
    };
  };

  const emptyState = getEmptyHistoryState();

  const tabCounts = tabs.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? bookings.length : bookings.filter((b) => b.status === t.key).length;
    return acc;
  }, {});

  const filteredBookings = activeTab === 'all'
    ? bookings
    : bookings.filter((b) => b.status === activeTab);

  const statusConfig = theme === 'dark' ? statusConfigDark : statusConfigLight;
  const modalBg = theme === 'dark' ? '#1a1a1a' : '#ffffff';
  const labelMuted = theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40';
  const textPrimary = theme === 'dark' ? 'text-offwhite' : 'text-charcoal';
  const textSecondary = theme === 'dark' ? 'text-offwhite/50' : 'text-charcoal/50';
  const textHeading = theme === 'dark' ? 'text-offwhite font-heading' : 'text-charcoal font-heading';
  const closeBtn = theme === 'dark' ? 'text-offwhite/40 hover:text-gold' : 'text-charcoal/40 hover:text-gold';

  const openReviewModal = (booking, e) => {
    e?.stopPropagation?.();
    setReviewModalBooking(booking);
  };

  const handleReviewSuccess = (appointmentId) => {
    setReviewableIds((prev) => {
      const next = new Set(prev);
      next.delete(appointmentId);
      return next;
    });
    setReviewedIds((prev) => new Set(prev).add(appointmentId));
    setReviewModalBooking(null);
    if (showDetailModal) setShowDetailModal(false);
  };

  const canReviewBooking = (booking) =>
    booking.status === 'completed'
    && reviewableIds.has(booking.id)
    && !reviewedIds.has(booking.id);

  const getBookingTechnicianName = (booking) => {
    const names = getAppointmentTechnicianNames(booking);
    if (names.length) return names.join(', ');
    return booking.tech?.full_name || booking.technicians?.full_name || null;
  };

  const renderCard = (booking) => {
    const cfg = statusConfig[booking.status];
    const isUpdating = updatingId === booking.id;
    const canCancel = booking.source === 'online' && ['waiting', 'assigned_pending'].includes(booking.status);
    const appointmentDate = booking.checked_in_at || booking.scheduled_at;
    const totalPrice = booking.final_price || booking.computedServiceTotal || 0;
    const durationMinutes = computeActualDurationMinutes(booking) || booking.mainServices?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || booking.service?.duration_minutes;

    const openDetail = () => { setSelectedDetailBooking(booking); setShowDetailModal(true); };

    return (
      <div
        key={booking.id}
        onClick={openDetail}
        className="rounded-xl p-5 border transition-all cursor-pointer hover:border-gold/30"
        style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: 'rgba(197,160,89,0.15)' }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className={theme === 'dark' ? 'text-offwhite font-heading text-base' : 'text-charcoal font-heading text-base'}>
              {booking.mainServiceLabel || booking.service?.name || 'Service'}
            </div>
            <div className={theme === 'dark' ? 'text-offwhite/40 text-xs mt-0.5' : 'text-charcoal/40 text-xs mt-0.5'}>
              {durationMinutes ? `${durationMinutes} min` : ''}
            </div>
            {(booking.addonDetails || []).map((addon) => (
              <div key={addon.id} className={theme === 'dark' ? 'text-offwhite/30 text-xs mt-1' : 'text-charcoal/30 text-xs mt-1'}>+ {addon.name} (+${addon.price})</div>
            ))}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`px-2.5 py-1 text-[10px] rounded-full border ${cfg?.color || ''}`}>
              {cfg?.label || booking.status}
            </span>
            {booking.status === 'completed' && (
              <div className="flex flex-col items-end gap-1.5">
                {canReviewBooking(booking) && (
                  <button
                    onClick={(e) => openReviewModal(booking, e)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
                  >
                    Leave Review
                  </button>
                )}
                {reviewedIds.has(booking.id) && (
                  <span className="text-[10px] text-gold/70">Review submitted</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); generateReceipt(booking); }}
                  disabled={receiptLoadingId === booking.id}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:border-gold/50 disabled:opacity-50"
                  style={{ borderColor: 'rgba(197,160,89,0.3)', color: '#c5a059' }}
                >
                  {receiptLoadingId === booking.id ? 'Loading…' : 'Receipt'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={theme === 'dark' ? 'text-offwhite/50 text-sm mb-1' : 'text-charcoal/50 text-sm mb-1'}>
          {appointmentDate
            ? `${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(appointmentDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : (CUSTOMER_ONLINE_BOOKING ? 'Walk-in Appointment' : 'Salon check-in')}
        </div>
        <div className="text-gold font-heading text-lg">${Number(totalPrice).toFixed(2)}</div>
        {booking.status === 'completed' && (
          <div className={theme === 'dark' ? 'text-gold/80 text-xs mt-1' : 'text-gold/90 text-xs mt-1'}>
            {booking.loyaltyPointsEarned ? `+${booking.loyaltyPointsEarned} loyalty pts earned` : 'Loyalty points pending checkout'}
          </div>
        )}

        {canCancel && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmCancel(booking); }}
              disabled={isUpdating}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border text-red-400 hover:bg-red-900/20 hover:border-red-500/50 transition-all disabled:opacity-30"
              style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'}`}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64 ${theme === 'dark' ? 'bg-[#0B0B0C] text-white' : 'bg-white text-charcoal'}`}>
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/portal" className={theme === 'dark' ? 'text-offwhite/40 hover:text-gold text-sm' : 'text-charcoal/40 hover:text-gold text-sm'}>Home</Link>
            <span className={theme === 'dark' ? 'text-offwhite/30' : 'text-charcoal/30'}>/</span>
            <span className="text-gold font-heading text-sm">{CUSTOMER_ONLINE_BOOKING ? 'My Bookings' : 'Visit History'}</span>
          </div>
          <h1 className="font-heading text-4xl text-gold">{CUSTOMER_ONLINE_BOOKING ? 'My Bookings' : 'Visit History'}</h1>
          <p className={theme === 'dark' ? 'text-offwhite/50 text-sm mt-1' : 'text-charcoal/50 text-sm mt-1'}>
            {CUSTOMER_ONLINE_BOOKING ? 'Completed and cancelled appointments' : 'Your completed and cancelled salon visits'}
          </p>
        </div>

        {activeVisits.length > 0 && (
          <div className="rounded-2xl p-5 border border-gold/30" style={{ backgroundColor: theme === 'dark' ? 'rgba(197,160,89,0.08)' : 'rgba(197,160,89,0.06)' }}>
            <div className={theme === 'dark' ? 'text-gold text-xs uppercase tracking-widest mb-2' : 'text-gold text-xs uppercase tracking-widest mb-2'}>
              {CUSTOMER_ONLINE_BOOKING ? 'Active appointment' : 'Current visit in progress'}
            </div>
            <div className={textPrimary}>
              {activeVisits[0].mainServiceLabel || activeVisits[0].service?.name || 'Salon visit'} · {statusConfig[activeVisits[0].status]?.label || activeVisits[0].status}
            </div>
          </div>
        )}

        {notifications.length > 0 && (
          <div className="rounded-2xl p-6 border-2" style={{ background: theme === 'dark' ? 'linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, rgba(26,26,26,1) 100%)' : 'linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, #ffffff 100%)', borderColor: 'rgba(197, 160, 89, 0.3)' }}>
            <div className={theme === 'dark' ? 'text-offwhite/40 text-xs uppercase tracking-widest mb-4' : 'text-charcoal/40 text-xs uppercase tracking-widest mb-4'}>Notifications</div>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: n.is_read ? 'rgba(197,160,89,0.3)' : '#c5a059' }} />
                  <div className={theme === 'dark' ? 'text-offwhite/80 text-sm' : 'text-charcoal/80 text-sm'}>{n.body || n.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="relative w-full sm:w-56">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className={theme === 'dark' ? 'w-full p-3 pr-10 bg-offwhite/10 border border-offwhite/10 text-offwhite rounded-lg focus:border-gold focus:outline-none text-sm appearance-none cursor-pointer' : 'w-full p-3 pr-10 bg-charcoal/10 border border-charcoal/10 text-charcoal rounded-lg focus:border-gold focus:outline-none text-sm appearance-none cursor-pointer'}
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23c5a059' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
              {tabs.map((tab) => (
                <option key={tab.key} value={tab.key} style={{ backgroundColor: theme === 'dark' ? '#111' : '#fff', color: theme === 'dark' ? '#e2e8f0' : '#000' }}>
                  {tab.label} ({tabCounts[tab.key]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="rounded-2xl p-12 border-2 text-center" style={{ borderColor: 'rgba(197, 160, 89, 0.15)', backgroundColor: theme === 'dark' ? '#111' : '#fdf8f0' }}>
            <div className={theme === 'dark' ? 'text-offwhite/30 text-5xl mb-4' : 'text-charcoal/30 text-5xl mb-4'}>&#128340;</div>
            <h3 className={theme === 'dark' ? 'font-heading text-2xl text-offwhite mb-3' : 'font-heading text-2xl text-charcoal mb-3'}>
              {emptyState.title}
            </h3>
            <p className={theme === 'dark' ? 'text-offwhite/50 mb-8 max-w-sm mx-auto' : 'text-charcoal/50 mb-8 max-w-sm mx-auto'}>
              {emptyState.message}
            </p>
            {emptyState.showAction && (
              CUSTOMER_ONLINE_BOOKING ? (
                <Link to="/customer/book" className="inline-block px-8 py-4 bg-gold text-charcoal font-heading tracking-wider text-sm rounded-xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20">
                  Book Now
                </Link>
              ) : (
                <Link to="/check-in" className="inline-block px-8 py-4 bg-gold text-charcoal font-heading tracking-wider text-sm rounded-xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20">
                  Check In at Salon
                </Link>
              )
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBookings.map(renderCard)}
          </div>
        )}

        {confirmCancel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-sm flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" style={{ backgroundColor: modalBg, borderColor: 'rgba(197,160,89,0.4)' }}>
              <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
                <div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'}`}>
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className={`font-heading text-2xl mb-2 ${textPrimary}`}>Cancel Booking?</h3>
                  <p className={`${textSecondary} text-sm`}>Are you sure you want to cancel this booking?</p>
                </div>
                <button onClick={() => setConfirmCancel(null)} className={`${closeBtn} text-2xl w-8 h-8 flex items-center justify-center rounded-lg ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-charcoal/5'}`}>&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <p className={`${textSecondary} text-sm`}>
                  Are you sure you want to cancel your <span className={`${textPrimary} font-medium`}>{confirmCancel.mainServiceLabel || confirmCancel.service?.name}</span> appointment on{' '}
                  <span className={textPrimary}>
                    {new Date(confirmCancel.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>?
                </p>
              </div>
              <div className="flex gap-3 p-4 sm:p-6 pt-0">
                <button
                  onClick={() => setConfirmCancel(null)}
                  className={`flex-1 py-3 rounded-lg transition-colors font-medium ${theme === 'dark' ? 'bg-offwhite/10 text-offwhite hover:bg-offwhite/20' : 'bg-charcoal/10 text-charcoal hover:bg-charcoal/20'}`}
                >
                  Keep Booking
                </button>
                <button
                  onClick={async () => {
                    const booking = confirmCancel;
                    setConfirmCancel(null);
                    await cancelBooking(booking);
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {reviewModalBooking && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setReviewModalBooking(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] rounded-xl overflow-hidden border border-gold/10 shadow-2xl" style={{ backgroundColor: modalBg }}>
              <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
                <h2 className="font-heading text-2xl text-gold">Leave a Review</h2>
                <button onClick={() => setReviewModalBooking(null)} className={`${closeBtn} text-xl leading-none`}>&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <ReviewForm
                  appointmentId={reviewModalBooking.id}
                  serviceName={reviewModalBooking.mainServiceLabel || reviewModalBooking.service?.name}
                  technicianName={getBookingTechnicianName(reviewModalBooking)}
                  onSuccess={() => handleReviewSuccess(reviewModalBooking.id)}
                  onCancel={() => setReviewModalBooking(null)}
                />
              </div>
            </div>
          </div>
        )}

        {showDetailModal && selectedDetailBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" style={{ backgroundColor: modalBg }}>
              <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
                <h2 className="font-heading text-2xl text-gold">{CUSTOMER_ONLINE_BOOKING ? 'Appointment Details' : 'Visit Details'}</h2>
                <button onClick={() => setShowDetailModal(false)} className={`${closeBtn} text-xl leading-none`}>&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div>
                  <div className={`${labelMuted} text-xs uppercase tracking-widest mb-1`}>Services</div>
                  <div className={`${textHeading} text-lg`}>{selectedDetailBooking.mainServiceLabel || selectedDetailBooking.service?.name || 'N/A'}</div>
                  {(selectedDetailBooking.addonDetails || []).map((a) => (
                    <div key={a.id} className={`${labelMuted} text-xs ml-2`}>+ {a.name} (${a.price})</div>
                  ))}
                </div>
                <div>
                  <div className={`${labelMuted} text-xs uppercase tracking-widest mb-1`}>Total Price</div>
                  <div className="text-gold font-heading text-xl">${Number(selectedDetailBooking.final_price || selectedDetailBooking.computedServiceTotal || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className={`${labelMuted} text-xs uppercase tracking-widest mb-1`}>Date & Time</div>
                  <div className={textPrimary}>{selectedDetailBooking.checked_in_at || selectedDetailBooking.scheduled_at ? new Date(selectedDetailBooking.checked_in_at || selectedDetailBooking.scheduled_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + ' at ' + new Date(selectedDetailBooking.checked_in_at || selectedDetailBooking.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : (CUSTOMER_ONLINE_BOOKING ? 'Walk-in' : 'Salon check-in')}</div>
                </div>
                <div>
                  <div className={`${labelMuted} text-xs uppercase tracking-widest mb-1`}>Duration</div>
                  <div className={textPrimary}>
                    {computeActualDurationMinutes(selectedDetailBooking)
                      ? `${computeActualDurationMinutes(selectedDetailBooking)} min (actual)`
                      : `${selectedDetailBooking.service?.duration_minutes || '—'} min`}
                  </div>
                </div>
                {selectedDetailBooking.status === 'completed' && (
                  <div>
                    <div className={`${labelMuted} text-xs uppercase tracking-widest mb-1`}>Loyalty Points</div>
                    <div className={textPrimary}>
                      {selectedDetailBooking.loyaltyPointsEarned ? `+${selectedDetailBooking.loyaltyPointsEarned} pts earned` : 'Pending checkout'}
                    </div>
                  </div>
                )}
                {(() => {
                  const names = getAppointmentTechnicianNames(selectedDetailBooking);
                  if (!names.length) return null;
                  return (
                    <div>
                      <div className={`${labelMuted} text-xs uppercase tracking-widest mb-1`}>
                        {names.length === 1 ? 'Technician' : 'Technicians'}
                      </div>
                      <div className={textPrimary}>{names.join(', ')}</div>
                    </div>
                  );
                })()}
                <div>
                  <div className={`${labelMuted} text-xs uppercase tracking-widest mb-1`}>Status</div>
                  <span className={`px-3 py-1 text-xs border rounded-full ${statusConfig[selectedDetailBooking.status]?.color || ''}`}>{statusConfig[selectedDetailBooking.status]?.label || selectedDetailBooking.status}</span>
                </div>
              </div>
              <div className="p-4 sm:p-6 pt-0 flex flex-col sm:flex-row gap-3">
                {selectedDetailBooking.status === 'completed' && canReviewBooking(selectedDetailBooking) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false);
                      setReviewModalBooking(selectedDetailBooking);
                    }}
                    className="flex-1 py-3 border border-gold/40 text-gold font-heading text-sm rounded-xl hover:bg-gold/10 transition-colors"
                  >
                    Leave Review
                  </button>
                )}
                {selectedDetailBooking.status === 'completed' && (
                  <button
                    type="button"
                    onClick={() => generateReceipt(selectedDetailBooking)}
                    disabled={receiptLoadingId === selectedDetailBooking.id}
                    className="flex-1 py-3 border border-gold/30 text-gold font-heading text-sm rounded-xl hover:bg-gold/10 transition-colors disabled:opacity-50"
                  >
                    {receiptLoadingId === selectedDetailBooking.id ? 'Preparing…' : 'Download Receipt'}
                  </button>
                )}
                <button onClick={() => setShowDetailModal(false)} className={`${selectedDetailBooking.status === 'completed' ? 'flex-1' : 'w-full'} py-3 bg-gold text-charcoal font-heading text-sm rounded-xl hover:bg-gold/90 transition-colors`}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
