import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

const statusConfig = {
  confirmed: { label: 'Confirmed', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50', dot: 'bg-blue-400' },
  waiting: { label: 'Lobby', color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50', dot: 'bg-yellow-400' },
  serving: { label: 'In Chair', color: 'bg-green-900/50 text-green-300 border-green-700/50', dot: 'bg-green-400' },
  completed: { label: 'Completed', color: 'bg-green-800/40 text-green-300 border-green-700/30', dot: 'bg-green-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/50 text-red-300 border-red-700/50', dot: 'bg-red-500' },
  missed: { label: 'Missed', color: 'bg-gray-900/50 text-gray-400 border-gray-600/50', dot: 'bg-gray-500' },
};
const statusOrder = ['confirmed', 'waiting', 'serving', 'completed', 'cancelled', 'missed'];

function DatePicker({ value, onChange }) {
  const today = new Date();
  const [selYear, setSelYear] = useState(() => value ? new Date(value + 'T00:00:00').getFullYear() : today.getFullYear());
  const [selMonth, setSelMonth] = useState(() => value ? new Date(value + 'T00:00:00').getMonth() : today.getMonth());
  const [selDay, setSelDay] = useState(() => value ? new Date(value + 'T00:00:00').getDate() : today.getDate());
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 1 + i);
  const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const apply = () => {
    const d = new Date(selYear, selMonth, selDay);
    onChange(d.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center">
          <div className="text-offwhite/30 text-[9px] uppercase tracking-widest mb-1">Month</div>
          <div className="relative">
            <select value={selMonth} onChange={(e) => setSelMonth(parseInt(e.target.value))} className="appearance-none w-16 p-2 rounded-lg text-center font-heading text-xs cursor-pointer pr-6" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.3)' }}>
              {months.map((m, i) => <option key={m} value={i} style={{ backgroundColor: '#111' }}>{m}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center"><svg className="w-3 h-3 text-offwhite/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-offwhite/30 text-[9px] uppercase tracking-widest mb-1">Day</div>
          <div className="relative">
            <select value={selDay} onChange={(e) => setSelDay(parseInt(e.target.value))} className="appearance-none w-14 p-2 rounded-lg text-center font-heading text-xs cursor-pointer pr-6" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.3)' }}>
              {days.map(d => <option key={d} value={d} style={{ backgroundColor: '#111' }}>{d}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center"><svg className="w-3 h-3 text-offwhite/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-offwhite/30 text-[9px] uppercase tracking-widest mb-1">Year</div>
          <div className="relative">
            <select value={selYear} onChange={(e) => setSelYear(parseInt(e.target.value))} className="appearance-none w-16 p-2 rounded-lg text-center font-heading text-xs cursor-pointer pr-6" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.3)' }}>
              {years.map(y => <option key={y} value={y} style={{ backgroundColor: '#111' }}>{y}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center"><svg className="w-3 h-3 text-offwhite/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
          </div>
        </div>
      </div>
      <button type="button" onClick={apply} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(197,160,89,0.2)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.3)' }}>Set</button>
    </div>
  );
}

function TimePicker({ value, onChange }) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = ['00', '15', '30', '45'];
  const [period, setPeriod] = useState(() => {
    if (!value) return 'PM';
    const h = parseInt(value.split(':')[0]);
    return h >= 12 ? 'PM' : 'AM';
  });
  const [selHour, setSelHour] = useState(() => {
    if (!value) return 12;
    let h = parseInt(value.split(':')[0]);
    if (period === 'PM' && h > 12) h -= 12;
    if (period === 'AM' && h === 0) h = 12;
    return h;
  });
  const [selMin, setSelMin] = useState(() => {
    if (!value) return '00';
    return (value.split(':')[1] || '00');
  });

  const apply = () => {
    let h = selHour % 12;
    if (selHour === 12) h = 0;
    if (period === 'PM') h += 12;
    onChange(`${h.toString().padStart(2, '0')}:${selMin}:00`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center">
          <div className="text-offwhite/30 text-[9px] uppercase tracking-widest mb-1">Hour</div>
          <div className="relative">
            <select value={selHour} onChange={(e) => setSelHour(parseInt(e.target.value))} className="appearance-none w-14 p-2 rounded-lg text-center font-heading text-sm cursor-pointer pr-6" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.3)' }}>
              {hours.map(h => <option key={h} value={h} style={{ backgroundColor: '#111' }}>{h}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center"><svg className="w-3 h-3 text-offwhite/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
          </div>
        </div>
        <div className="text-offwhite text-2xl font-heading mt-4">:</div>
        <div className="flex flex-col items-center">
          <div className="text-offwhite/30 text-[9px] uppercase tracking-widest mb-1">Min</div>
          <div className="relative">
            <select value={selMin} onChange={(e) => setSelMin(e.target.value)} className="appearance-none w-14 p-2 rounded-lg text-center font-heading text-sm cursor-pointer pr-6" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.3)' }}>
              {minutes.map(m => <option key={m} value={m} style={{ backgroundColor: '#111' }}>{m}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center"><svg className="w-3 h-3 text-offwhite/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
          </div>
        </div>
        <div className="flex flex-col mt-4">
          {['AM', 'PM'].map(p => (
            <div key={p} onClick={() => setPeriod(p)} className="px-3 py-1 text-xs font-heading cursor-pointer rounded-md text-center transition-colors mb-1" style={{ backgroundColor: period === p ? 'rgba(197,160,89,0.2)' : 'rgba(255,255,255,0.05)', color: period === p ? '#c5a059' : 'rgba(255,255,255,0.4)', border: period === p ? '1px solid rgba(197,160,89,0.4)' : '1px solid transparent' }}>{p}</div>
          ))}
        </div>
      </div>
      <button type="button" onClick={apply} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(197,160,89,0.2)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.3)' }}>Set</button>
    </div>
  );
}

export default function AdminBookings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [technicians, setTechnicians] = useState([]);
  const [services, setServices] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ phone: '', service_id: '', tech_id: '', date: '', time: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editTechId, setEditTechId] = useState('');
  const [editServiceId, setEditServiceId] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelNote, setCancelNote] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reactivatingId, setReactivatingId] = useState(null);
  const [historyBooking, setHistoryBooking] = useState(null);

    const fetchLookups = async () => {
      const [techsRes, svcsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone, nail_goal, refreshment_pref').in('role', ['technician', 'admin']),
        supabase.from('services').select('id, name, price, duration_minutes').order('name'),
      ]);
      if (techsRes.data) setTechnicians(techsRes.data);
      if (svcsRes.data) setServices(svcsRes.data);
    };

  const fetchBookings = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) setLoading(true);
    try {
      const { data, error } = await supabase.from('appointments').select('*').order('scheduled_at', { ascending: true });
      if (error) throw error;
      const bookingList = data || [];
      const profileIds = [...new Set(bookingList.map((b) => b.customer_id).filter(Boolean))];
      const serviceIds = [...new Set(bookingList.map((b) => b.service_id).filter(Boolean))];
      const techIds = [...new Set(bookingList.map((b) => b.technician_id).filter(Boolean))];
      const [profilesRes, servicesRes, techsRes] = await Promise.all([
        profileIds.length ? supabase.from('profiles').select('id, full_name, phone, nail_goal, refreshment_pref').in('id', profileIds) : { data: [] },
        serviceIds.length ? supabase.from('services').select('id, name, price, duration_minutes').in('id', serviceIds) : { data: [] },
        techIds.length ? supabase.from('profiles').select('id, full_name').in('id', techIds) : { data: [] },
      ]);
      const profileMap = {};
      (profilesRes.data || []).forEach((p) => { profileMap[p.id] = p; });
      const serviceMap = {};
      (servicesRes.data || []).forEach((s) => { serviceMap[s.id] = s; });
      const techMap = {};
      (techsRes.data || []).forEach((t) => { techMap[t.id] = t; });
      setBookings(bookingList.map((b) => ({
        ...b,
        customer: profileMap[b.customer_id] || null,
        service: serviceMap[b.service_id] || null,
        tech: techMap[b.technician_id] || null,
      })));
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!['admin', 'super_admin', 'owner', 'partner'].includes(user.role)) {
      navigate(user.role === 'technician' ? '/technician' : '/portal');
      return;
    }
    fetchLookups();
    fetchBookings();

    const channel = supabase
      .channel('booking-management')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchBookings(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, navigate, fetchBookings]);

  const openHistory = (booking) => setHistoryBooking(booking);

  const openEdit = (booking) => {
    if (['completed', 'cancelled', 'missed'].includes(booking.status)) return;
    const d = new Date(booking.scheduled_at || Date.now());
    setEditDate(d.toISOString().split('T')[0]);
    setEditTime(d.toTimeString().slice(0, 5));
    setEditTechId(booking.technician_id || '');
    setEditServiceId(booking.service_id || '');
    setEditError('');
    setEditingBooking(booking);
  };

  const saveEdit = async () => {
    if (!editDate || !editTime) { setEditError('Date and time are required'); return; }
    setSavingEdit(true);
    setEditError('');
    const newScheduled = new Date(`${editDate}T${editTime}:00`).toISOString();
    try {
      const updates = { scheduled_at: newScheduled };
      if (editServiceId) updates.service_id = editServiceId;
      if (editTechId) updates.technician_id = editTechId;
      const { error } = await supabase.from('appointments').update(updates).eq('id', editingBooking.id);
      if (error) throw error;
      const newService = services.find(s => s.id === editServiceId);
      const newTech = technicians.find(t => t.id === editTechId);
      setBookings((prev) => prev.map((b) =>
        b.id === editingBooking.id ? { ...b, ...updates, service: newService || b.service, tech: newTech || b.tech } : b
      ));
      setEditingBooking(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update');
    } finally {
      setSavingEdit(false);
    }
  };

  const openCreate = () => {
    setCreateForm({ phone: '', service_id: '', tech_id: '', date: '', time: '' });
    setCreateError('');
    setPhoneError('');
    setCustomerName('');
    setShowCreateModal(true);
  };

  const handlePhoneChange = async (phone) => {
    setCreateForm((prev) => ({ ...prev, phone }));
    setPhoneError('');
    setCustomerName('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length > 10) { setCreateForm((prev) => ({ ...prev, phone: digits.slice(0, 10) })); return; }
    if (digits.length === 10) {
      const { data } = await supabase.from('profiles').select('full_name').eq('phone', phone).single();
      if (!data) { setPhoneError('This phone number is not registered.'); }
      else { setCustomerName(data.full_name); }
    }
  };

  const saveCreate = async () => {
    if (!createForm.phone || !createForm.service_id || !createForm.date) {
      setCreateError('Phone, service, and date are required');
      return;
    }
    const digits = createForm.phone.replace(/\D/g, '');
    if (digits.length !== 10) { setCreateError('Please enter a valid 10-digit phone number'); return; }
    if (phoneError) { setCreateError(phoneError); return; }
    setCreating(true);
    setCreateError('');
    try {
         const { data: profileData } = await supabase.from('profiles').select('id').eq('phone', createForm.phone).single();
      if (!profileData) { setPhoneError('This phone number is not registered.'); setCreating(false); return; }
      const scheduledTime = createForm.time ? new Date(`${createForm.date}T${createForm.time}:00`).toISOString() : null;
const { error } = await supabase.from('appointments').insert({
        customer_id: profileData.id,
        service_id: createForm.service_id,
        technician_id: createForm.tech_id || null,
        scheduled_at: scheduledTime,
        checked_in_at: null,
        status: 'confirmed',
        booking_type: 'online',
        final_price: services.find(s => s.id === createForm.service_id)?.price || 0,
      });
      if (error) throw error;
      setShowCreateModal(false);
      fetchBookings(true);
    } catch (err) {
      setCreateError(err.message || 'Failed to create booking');
    } finally {
      setCreating(false);
    }
  };

  const openCancel = (booking) => { setCancelNote(''); setCancelTarget(booking); };
  const executeCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const updates = { status: 'cancelled' };
      const { error } = await supabase.from('appointments').update(updates).eq('id', cancelTarget.id);
      if (error) throw error;
      setBookings((prev) => prev.map((b) => (b.id === cancelTarget.id ? { ...b, ...updates } : b)));
      setCancelTarget(null);
      setCancelNote('');
    } catch (err) { console.error('Error cancelling:', err); }
    finally { setCancelling(false); }
  };

  const reactivateBooking = async (booking) => {
    setReactivatingId(booking.id);
    try {
      const updates = { status: 'confirmed' };
      const { error } = await supabase.from('appointments').update(updates).eq('id', booking.id);
      if (error) throw error;
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, ...updates } : b)));
    } catch (err) { console.error('Error reactivating:', err); }
    finally { setReactivatingId(null); }
  };

  const confirmDelete = (booking) => setDeleteTarget(booking);
  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setBookings((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) { console.error('Error deleting:', err); }
    finally { setDeleting(false); }
  };

  const exportCSV = () => {
    const headers = ['Customer', 'Phone', 'Service', 'Date', 'Time', 'Status', 'Source', 'Technician', 'Price', 'Cancel Note'];
    const rows = dataToExport.map(b => [
      b.customer?.full_name || '',
      b.customer?.phone || '',
      b.service?.name || '',
      new Date(b.scheduled_at || b.checked_in_at).toLocaleDateString(),
      new Date(b.scheduled_at || b.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      statusConfig[b.status]?.label || b.status,
      b.booking_type || 'online',
      b.tech?.full_name || '',
      b.final_price || b.service?.price || '',
      b.cancel_reason || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const matchesSearch = (b) => {
    if (!searchTerm) return true;
    return (
      (b.customer?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.customer?.phone || '').includes(searchTerm) ||
      (b.service?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getDateRange = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const tomorrowStart = new Date(todayEnd);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const weekEnd = new Date(todayEnd);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(todayEnd);
    monthEnd.setDate(monthEnd.getDate() + 30);
    if (dateRange === 'today') return { gte: todayStart, lt: todayEnd };
    if (dateRange === 'tomorrow') return { gte: tomorrowStart, lt: tomorrowEnd };
    if (dateRange === 'week') return { gte: todayEnd, lt: weekEnd };
    if (dateRange === 'month') return { gte: todayEnd, lt: monthEnd };
    return null;
  };

  const allUpcoming = bookings.filter(b => ['confirmed', 'waiting', 'serving'].includes(b.status));
  const upcomingFiltered = allUpcoming.filter(b => matchesSearch(b) && (statusTab === 'all' || b.status === statusTab));
  const sortedUpcoming = [...upcomingFiltered].sort((a, b) => {
    const aT = new Date(a.scheduled_at || 0).getTime();
    const bT = new Date(b.scheduled_at || 0).getTime();
    return aT - bT;
  });

  const allPast = bookings.filter(b => ['completed', 'cancelled', 'missed'].includes(b.status));
  const dateBounds = getDateRange();
  let filteredPast = allPast;
  if (dateBounds) {
    filteredPast = allPast.filter(b => {
      const t = new Date(b.scheduled_at || 0).getTime();
      return t >= dateBounds.gte.getTime() && t < dateBounds.lt.getTime();
    });
  }
  const pastSearched = filteredPast.filter(matchesSearch);
  const dataToExport = pastSearched;
  const sortedPast = [...pastSearched].sort((a, b) => {
    const aT = new Date(a.scheduled_at || 0).getTime();
    const bT = new Date(b.scheduled_at || 0).getTime();
    return bT - aT;
  });

  const tabCounts = statusOrder.reduce((acc, s) => {
    acc[s] = bookings.filter((b) => b.status === s).length;
    return acc;
  }, {});

  const todayRevenue = bookings.filter(b => {
    if (b.status !== 'completed') return false;
    const t = new Date(b.scheduled_at || 0).getTime();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return t >= start && t < end;
  }).reduce((sum, b) => sum + (b.final_price || b.service?.price || 0), 0);

  const fmtTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  const fmtTimeInput = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    let hr = parseInt(h) % 12 || 12;
    return `${hr}:${m} ${parseInt(h) >= 12 ? 'PM' : 'AM'}`;
  };

  const renderBadge = (booking) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${
      booking.booking_type === 'online' ? 'bg-gold/20 text-gold border-gold/40' : 'bg-yellow-900/30 text-yellow-300 border-yellow-700/40'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${booking.booking_type === 'online' ? 'bg-gold' : 'bg-yellow-400'}`} />
      {booking.booking_type === 'online' ? 'Online' : 'Walk-in'}
    </span>
  );

   const buildTimeline = (booking) => {
     const events = [];
     if (booking.created_at) {
       events.push({ label: 'Booking Received', time: booking.created_at, color: '#c5a059', detail: booking.booking_type === 'online' ? 'Online booking submitted' : 'Walk-in created' });
     }
     if (booking.scheduled_at) {
       events.push({ label: 'Scheduled Visit', time: booking.scheduled_at, color: '#a78bfa', detail: `Visit scheduled for ${new Date(booking.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` });
     }
     if (booking.checked_in_at && booking.status !== 'confirmed') {
       events.push({ label: 'Customer Checked In', time: booking.checked_in_at, color: '#eab308', detail: 'Customer arrived at salon' });
     }
     // Note: start_time, end_time, lobby_at, serving_at, cancelled_at, missed_at columns have been removed.
     // Status changes are now logged in appointment_status_history table.
     return events;
   };

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
        <Sidebar />
        <div className="flex items-center justify-center py-20"><div className="text-gold animate-pulse">Loading...</div></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-white transition-all duration-300 pl-0 md:pl-20 lg:pl-64">
      <Sidebar />
      <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6 border-b" style={{ borderColor: 'rgba(197,160,89,0.1)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-heading text-3xl text-gold">Booking Management</h1>
              <p className="text-offwhite/60 text-sm mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => fetchBookings(true)} className="px-4 py-2 bg-offwhite/10 text-offwhite/80 rounded-lg hover:bg-offwhite/20 text-sm border border-offwhite/10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh
              </button>
              <button onClick={exportCSV} className="px-4 py-2 bg-offwhite/10 text-offwhite/80 rounded-lg hover:bg-offwhite/20 text-sm border border-offwhite/10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
              <button onClick={openCreate} className="px-4 py-2 bg-gold text-charcoal rounded-lg hover:bg-gold/90 font-medium text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Booking
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(197,160,89,0.15)' }}>
              <div className="text-offwhite/40 text-xs mb-1">Total Bookings</div>
              <div className="text-2xl font-heading text-gold">{bookings.length}</div>
            </div>
            <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(197,160,89,0.15)' }}>
              <div className="text-offwhite/40 text-xs mb-1">Upcoming</div>
              <div className="text-2xl font-heading text-yellow-400">{tabCounts.confirmed + tabCounts.waiting + tabCounts.serving}</div>
            </div>
            <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(197,160,89,0.15)' }}>
              <div className="text-offwhite/40 text-xs mb-1">Today's Revenue</div>
              <div className="text-2xl font-heading text-green-400">${todayRevenue.toFixed(0)}</div>
            </div>
            <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(197,160,89,0.15)' }}>
              <div className="text-offwhite/40 text-xs mb-1">Completed</div>
              <div className="text-2xl font-heading text-offwhite">{tabCounts.completed || 0}</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, service, or phone..." className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite placeholder-offwhite/30 rounded-lg focus:border-gold focus:outline-none text-sm" />
            </div>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-4 py-3 border rounded-lg text-sm focus:border-gold focus:outline-none cursor-pointer" style={{ backgroundColor: '#111', borderColor: 'rgba(197,160,89,0.3)', color: '#f0d78c' }}>
              <option value="today" style={{ backgroundColor: '#111', color: '#f0d78c' }}>Today</option>
              <option value="tomorrow" style={{ backgroundColor: '#111', color: '#f0d78c' }}>Tomorrow</option>
              <option value="week" style={{ backgroundColor: '#111', color: '#f0d78c' }}>This Week</option>
              <option value="month" style={{ backgroundColor: '#111', color: '#f0d78c' }}>This Month</option>
            </select>
          </div>

          <div className="rounded-xl p-1 flex gap-1 overflow-x-auto mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197,160,89,0.1)' }}>
            {[
              { key: 'all', label: 'All', count: tabCounts.confirmed + tabCounts.waiting + tabCounts.serving + tabCounts.completed + tabCounts.cancelled + tabCounts.missed },
              { key: 'confirmed', label: 'Confirmed', count: tabCounts.confirmed },
              { key: 'waiting', label: 'Lobby', count: tabCounts.waiting },
              { key: 'serving', label: 'In Chair', count: tabCounts.serving },
              { key: 'completed', label: 'Completed', count: tabCounts.completed },
            ].map(({ key, label, count }) => (
              <button key={key} onClick={() => setStatusTab(key)} className="min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap" style={statusTab === key ? { background: 'linear-gradient(135deg, #c5a059, #f0d78c)', color: '#0B0B0C' } : { color: 'rgba(255,255,255,0.4)' }}>
                {label} {count > 0 && `(${count})`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8">

          {sortedUpcoming.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gold/20" />
                <h2 className="text-gold font-heading text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  Upcoming ({sortedUpcoming.length})
                </h2>
                <div className="h-px flex-1 bg-gold/20" />
              </div>
              <div className="space-y-3">
                {sortedUpcoming.map((booking) => {
                  const cfg = statusConfig[booking.status] || {};
                  const apptTime = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
                  return (
                    <div key={booking.id} className="min-w-0 rounded-xl p-5 border transition-all hover:border-gold/40" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(197,160,89,0.2)' }}>
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <div className="text-offwhite font-heading text-lg">{booking.customer?.full_name || 'Guest'}</div>
                              <div className="text-offwhite/40 text-sm">{booking.customer?.phone || 'No phone'}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {renderBadge(booking)}
                              <span className={`px-3 py-1 text-xs rounded-full border ${cfg.color}`}>{cfg.label}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <div className="text-offwhite/30 text-[10px] uppercase tracking-widest mb-0.5">Service</div>
                              <div className="text-gold font-heading">{booking.service?.name || '—'}</div>
                            </div>
                            <div>
                              <div className="text-offwhite/30 text-[10px] uppercase tracking-widest mb-0.5">Price</div>
                              <div className="text-offwhite font-heading">${booking.final_price || booking.service?.price || 0}</div>
                            </div>
                            <div>
                              <div className="text-offwhite/30 text-[10px] uppercase tracking-widest mb-0.5">Date & Time</div>
                              <div className="text-offwhite font-heading text-xs">
                                {apptTime ? `${apptTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${apptTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '—'}
                              </div>
                            </div>
                            <div>
                              <div className="text-offwhite/30 text-[10px] uppercase tracking-widest mb-0.5">Technician</div>
                              <div className="text-offwhite font-heading text-xs">{booking.tech?.full_name || 'Unassigned'}</div>
                            </div>
                          </div>
                          {booking.customer?.nail_goal && <div className="text-offwhite/30 text-xs italic mt-2">Goal: {booking.customer.nail_goal}</div>}
                        </div>
                        <div className="flex flex-col gap-2 lg:items-end lg:flex-shrink-0 lg:w-44">
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <button onClick={() => openHistory(booking)} className="px-3 py-1.5 text-xs font-medium rounded-lg border text-offwhite/50 hover:text-gold hover:border-gold/50 transition-all" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>History</button>
                            {!['completed', 'cancelled', 'missed'].includes(booking.status) && (
                              <>
                                <button onClick={() => openEdit(booking)} className="px-3 py-1.5 text-xs font-medium rounded-lg border text-offwhite/60 hover:text-gold hover:border-gold/50 transition-all" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Edit</button>
                                <button onClick={() => openCancel(booking)} className="px-3 py-1.5 text-xs font-medium rounded-lg border text-red-400 hover:bg-red-900/20 hover:border-red-500/50 transition-all" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Cancel</button>
                              </>
                            )}
                            <button onClick={() => confirmDelete(booking)} className="px-3 py-1.5 text-xs font-medium rounded-lg border text-red-400/60 hover:text-red-400 hover:border-red-500/50 transition-all" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {sortedPast.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-offwhite/10" />
                <h2 className="text-offwhite/40 font-heading text-base flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-offwhite/30" />
                  Past ({sortedPast.length})
                  {dateRange !== 'all' && (
                    <span className="text-offwhite/20 text-xs ml-1">({
                      dateRange === 'today' ? 'Today' :
                      dateRange === 'tomorrow' ? 'Tomorrow' :
                      dateRange === 'week' ? 'This Week' : 'This Month'
                    })</span>
                  )}
                </h2>
                <div className="h-px flex-1 bg-offwhite/10" />
              </div>
              <div className="space-y-3">
                {sortedPast.map((booking) => {
                  const cfg = statusConfig[booking.status] || {};
                  const apptTime = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
                  const isReactivating = reactivatingId === booking.id;
                  return (
                    <div key={booking.id} className="min-w-0 rounded-xl p-5 border opacity-75" style={{ backgroundColor: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.05)' }}>
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <div className="text-offwhite/60 font-heading text-base">{booking.customer?.full_name || 'Guest'}</div>
                              <div className="text-offwhite/40 text-sm">{booking.customer?.phone || 'No phone'}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {renderBadge(booking)}
                              <span className={`px-3 py-1 text-xs rounded-full border ${cfg.color}`}>{cfg.label}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                            <div><div className="text-offwhite/20 text-[10px] uppercase tracking-widest mb-0.5">Service</div><div className="text-offwhite/50 font-heading text-sm">{booking.service?.name || '—'}</div></div>
                            <div><div className="text-offwhite/20 text-[10px] uppercase tracking-widest mb-0.5">Price</div><div className="text-offwhite/50 font-heading text-sm">${booking.final_price || booking.service?.price || 0}</div></div>
                            <div><div className="text-offwhite/20 text-[10px] uppercase tracking-widest mb-0.5">Date & Time</div><div className="text-offwhite/50 font-heading text-xs">{apptTime ? `${apptTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${apptTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '—'}</div></div>
                            <div><div className="text-offwhite/20 text-[10px] uppercase tracking-widest mb-0.5">Technician</div><div className="text-offwhite/50 font-heading text-xs">{booking.tech?.full_name || 'Unassigned'}</div></div>
                          </div>
                          {booking.status === 'cancelled' && booking.cancelled_at && (
                            <div className="text-red-400/40 text-xs mt-2">
                              Cancelled {new Date(booking.cancelled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              {booking.cancel_reason && <span className="text-red-400/30 ml-2">— {booking.cancel_reason}</span>}
                            </div>
                          )}
                          {booking.status === 'missed' && booking.scheduled_at && (
                            <div className="text-gray-400/40 text-xs mt-2">Originally scheduled: {new Date(booking.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 lg:items-end lg:flex-shrink-0 lg:w-44">
                          <button onClick={() => openHistory(booking)} className="px-3 py-1.5 text-xs font-medium rounded-lg border text-offwhite/40 hover:text-gold hover:border-gold/30 transition-all" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>View History</button>
                          {booking.status === 'cancelled' && (
                            <button onClick={() => reactivateBooking(booking)} disabled={isReactivating} className="px-3 py-1.5 text-xs font-medium rounded-lg border text-blue-400 hover:bg-blue-900/20 hover:border-blue-500/50 transition-all disabled:opacity-30" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                              {isReactivating ? '...' : 'Reactivate'}
                            </button>
                          )}
                          <button onClick={() => confirmDelete(booking)} className="px-3 py-1.5 text-xs font-medium rounded-lg border text-red-400/60 hover:text-red-400 hover:border-red-500/50 transition-all" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {sortedUpcoming.length === 0 && sortedPast.length === 0 && (
            <div className="rounded-xl p-12 text-center mt-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-offwhite/30 text-4xl mb-4">&#128197;</div>
              <h2 className="font-heading text-2xl text-offwhite mb-2">No Bookings Found</h2>
              <p className="text-offwhite/50 text-sm">No appointments match your current filters.</p>
            </div>
          )}
        </div>
      </div>

      {editingBooking && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl">
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
              <h2 className="font-heading text-2xl text-gold">Edit Booking</h2>
              <button onClick={() => setEditingBooking(null)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-offwhite font-heading mb-1">{editingBooking.customer?.full_name}</div>
                <div className="text-offwhite/50 text-xs">{editingBooking.service?.name} &middot; ${editingBooking.service?.price || 0}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Service</label>
                  <select value={editServiceId} onChange={(e) => setEditServiceId(e.target.value)} className="w-full p-3 border rounded-lg focus:border-gold focus:outline-none" style={{ backgroundColor: '#111', borderColor: 'rgba(197,160,89,0.3)', color: '#f0d78c' }}>
                    <option value="" style={{ backgroundColor: '#111', color: '#888' }}>Select service</option>
                    {services.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: '#111', color: '#f0d78c' }}>{s.name} — ${s.price}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Technician</label>
                  <select value={editTechId} onChange={(e) => setEditTechId(e.target.value)} className="w-full p-3 border rounded-lg focus:border-gold focus:outline-none" style={{ backgroundColor: '#111', borderColor: 'rgba(197,160,89,0.3)', color: '#f0d78c' }}>
                    <option value="" style={{ backgroundColor: '#111', color: '#888' }}>Unassigned</option>
                    {technicians.map(t => <option key={t.id} value={t.id} style={{ backgroundColor: '#111', color: '#f0d78c' }}>{t.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Date</label>
                  {editDate ? (
                    <div className="p-3 rounded-lg text-offwhite font-heading text-sm flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(197,160,89,0.3)' }}>
                      {new Date(editDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      <button onClick={() => setEditDate('')} className="text-red-400 text-xs hover:text-red-300 ml-2">Change</button>
                    </div>
                  ) : (
                    <DatePicker value={editDate} onChange={(v) => setEditDate(v)} />
                  )}
                </div>
                <div>
                  <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Time</label>
                  {editTime ? (
                    <div className="p-3 rounded-lg text-offwhite font-heading text-sm flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(197,160,89,0.3)' }}>
                      {fmtTimeInput(editTime)}
                      <button onClick={() => setEditTime('')} className="text-red-400 text-xs hover:text-red-300 ml-2">Change</button>
                    </div>
                  ) : (
                    <TimePicker value={editTime} onChange={(v) => setEditTime(v)} />
                  )}
                </div>
              </div>
              {editError && <p className="text-red-400 text-sm">{editError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingBooking(null)} className="flex-1 py-3 bg-offwhite/10 text-offwhite rounded-lg hover:bg-offwhite/20 transition-colors">Cancel</button>
                <button type="button" onClick={saveEdit} disabled={savingEdit} className="flex-1 py-3 bg-gold text-charcoal rounded-lg hover:bg-gold/90 font-medium disabled:opacity-50">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {historyBooking && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl">
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
              <div>
                <h2 className="font-heading text-xl text-gold">Booking History</h2>
                <p className="text-offwhite/50 text-xs mt-1">{historyBooking.customer?.full_name} — {historyBooking.service?.name || 'Service'}</p>
              </div>
              <button onClick={() => setHistoryBooking(null)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-6 p-4 rounded-xl space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197,160,89,0.15)' }}>
                {[
                  { label: 'Source', value: <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border bg-gold/20 text-gold border-gold/40"><span className="w-1 h-1 rounded-full bg-gold mr-1" />Online</span> },
                  { label: 'Status', value: <span className={`px-3 py-1 text-xs rounded-full border ${statusConfig[historyBooking.status]?.color}`}>{statusConfig[historyBooking.status]?.label}</span> },
                  { label: 'Customer', value: historyBooking.customer?.full_name || '—' },
                  { label: 'Phone', value: historyBooking.customer?.phone || '—' },
                  { label: 'Service', value: historyBooking.service?.name || '—' },
                  { label: 'Price', value: `$${historyBooking.final_price || historyBooking.service?.price || 0}` },
                  { label: 'Technician', value: historyBooking.tech?.full_name || 'Unassigned' },
                  { label: 'Booked At', value: historyBooking.created_at ? fmtTime(historyBooking.created_at) : '—' },
                   { label: 'Confirmed At', value: '—' },
                   { label: 'Scheduled Visit', value: historyBooking.scheduled_at ? fmtTime(historyBooking.scheduled_at) : '—' },
                   { label: 'Lobby At', value: '—' },
                   { label: 'Serving At', value: '—' },
                   { label: 'Completed At', value: '—' },
                   { label: 'Missed At', value: '—' },
                   { label: 'Cancelled At', value: historyBooking.cancelled_at ? fmtTime(historyBooking.cancelled_at) : '—' },
                  { label: 'Cancel Reason', value: historyBooking.cancel_reason || '—' },
                  { label: 'Nail Goal', value: historyBooking.customer?.nail_goal || '—' },
                  { label: 'Refreshment', value: historyBooking.customer?.refreshment_pref || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start">
                    <div className="text-offwhite/30 text-[10px] uppercase tracking-widest flex-shrink-0 mr-4">{label}</div>
                    <div className={`font-heading text-sm text-right ${label === 'Cancel Reason' ? 'text-red-400/70' : label === 'Lobby At' ? 'text-yellow-400' : 'text-offwhite'}`}>{value}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-offwhite/40 text-xs uppercase tracking-widest mb-3">Activity Timeline</div>
                <div className="space-y-0">
                  {buildTimeline(historyBooking).map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ backgroundColor: event.color }} />
                      <div className="flex-1 pb-4 border-l ml-1" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="text-offwhite font-heading text-sm">{event.label}</div>
                        <div className="text-offwhite/40 text-xs mt-0.5">{event.detail}</div>
                        <div className="text-offwhite/20 text-[10px] mt-1">{fmtTime(event.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl">
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
              <h2 className="font-heading text-xl text-offwhite">Cancel Booking</h2>
              <button onClick={() => setCancelTarget(null)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">&times;</button>
            </div>
            <div className="mb-4 p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-offwhite font-heading">{cancelTarget.customer?.full_name || 'Guest'}</div>
              <div className="text-offwhite/50 text-sm">{cancelTarget.service?.name || 'Service'}</div>
            </div>
            <p className="text-offwhite/50 text-sm mb-3">Add a cancellation note (optional):</p>
            <textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Reason for cancellation..." rows={3} className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite placeholder-offwhite/20 rounded-lg focus:border-red-500/50 focus:outline-none text-sm resize-none" style={{ backgroundColor: '#111' }} />
            <p className="text-offwhite/30 text-xs mt-3 mb-6">This can be reactivated later from the Past section.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)} className="flex-1 py-3 bg-offwhite/10 text-offwhite rounded-lg hover:bg-offwhite/20 transition-colors text-sm">Keep Booking</button>
              <button onClick={executeCancel} disabled={cancelling} className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50">
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-sm h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#111] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-red-500/30 shadow-2xl" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-red-900/30 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
                <div>
                  <h2 className="font-heading text-xl text-offwhite mb-0">Delete Booking?</h2>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-left">
              <p className="text-offwhite/50 text-sm mb-3">{deleteTarget.customer?.full_name || 'Guest'} — {deleteTarget.service?.name || 'Service'}</p>
              <p className="text-red-400/60 text-xs mb-4">This action cannot be undone.</p>
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 mb-4">
                <p className="text-yellow-300 text-xs"><strong>Tip:</strong> Export your bookings before deleting.</p>
              </div>
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <div className="flex gap-3 p-4 sm:p-6 border-t border-red-500/10 bg-[#0d0d0d]">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-offwhite/10 text-offwhite rounded-lg hover:bg-offwhite/20 text-sm">Cancel</button>
              <button onClick={executeDelete} disabled={deleting} className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#1a1a1a] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-gold/10 shadow-2xl" style={{ borderColor: 'rgba(197,160,89,0.4)' }}>
            <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gold/10">
              <h2 className="font-heading text-2xl text-gold">New Booking</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-offwhite/40 hover:text-offwhite text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Customer Phone *</label>
                <input type="tel" value={createForm.phone} onChange={(e) => handlePhoneChange(e.target.value)} className="w-full p-3 bg-offwhite/10 border border-offwhite/10 text-offwhite rounded-lg focus:border-gold focus:outline-none" placeholder="10-digit phone" maxLength={10} />
                {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
                {customerName && <div className="mt-2 p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(197,160,89,0.1)', border: '1px solid rgba(197,160,89,0.2)' }}><span className="text-gold font-heading text-sm">{customerName}</span></div>}
              </div>
              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Service *</label>
                <select value={createForm.service_id} onChange={(e) => setCreateForm({ ...createForm, service_id: e.target.value })} className="w-full p-3 border rounded-lg focus:border-gold focus:outline-none" style={{ backgroundColor: '#111', borderColor: 'rgba(197,160,89,0.3)', color: '#f0d78c' }}>
                  <option value="" style={{ backgroundColor: '#111', color: '#888' }}>Select service</option>
                  {services.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: '#111', color: '#f0d78c' }}>{s.name} — ${s.price}</option>)}
                </select>
              </div>
              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Technician</label>
                <select value={createForm.tech_id} onChange={(e) => setCreateForm({ ...createForm, tech_id: e.target.value })} className="w-full p-3 border rounded-lg focus:border-gold focus:outline-none" style={{ backgroundColor: '#111', borderColor: 'rgba(197,160,89,0.3)', color: '#f0d78c' }}>
                  <option value="" style={{ backgroundColor: '#111', color: '#888' }}>Auto-assign</option>
                  {technicians.map(t => <option key={t.id} value={t.id} style={{ backgroundColor: '#111', color: '#f0d78c' }}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Date *</label>
                {createForm.date ? (
                  <div className="p-3 rounded-lg text-offwhite font-heading text-sm flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(197,160,89,0.3)' }}>
                    {new Date(createForm.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    <button onClick={() => setCreateForm(p => ({ ...p, date: '' }))} className="text-red-400 text-xs hover:text-red-300 ml-2">Change</button>
                  </div>
                ) : (
                  <DatePicker value={createForm.date} onChange={(v) => setCreateForm(p => ({ ...p, date: v }))} />
                )}
              </div>
              <div>
                <label className="text-offwhite/40 text-xs uppercase tracking-widest block mb-2">Time</label>
                {createForm.time ? (
                  <div className="p-3 rounded-lg text-offwhite font-heading text-sm flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(197,160,89,0.3)' }}>
                    {fmtTimeInput(createForm.time)}
                    <button onClick={() => setCreateForm(p => ({ ...p, time: '' }))} className="text-red-400 text-xs hover:text-red-300 ml-2">Change</button>
                  </div>
                ) : (
                  <TimePicker value={createForm.time} onChange={(v) => setCreateForm(p => ({ ...p, time: v }))} />
                )}
              </div>
              {createError && <p className="text-red-400 text-sm">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-offwhite/10 text-offwhite rounded-lg hover:bg-offwhite/20 transition-colors">Cancel</button>
                <button type="button" onClick={saveCreate} disabled={creating} className="flex-1 py-3 bg-gold text-charcoal rounded-lg hover:bg-gold/90 font-medium disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}