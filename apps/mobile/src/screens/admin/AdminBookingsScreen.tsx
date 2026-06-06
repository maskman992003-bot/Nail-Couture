import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '@nail-couture/shared/utils/appointmentHelpers.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { AppModal, ModalButton } from '../../components/AppModal';
import { ScrollSelect } from '../../components/forms/ScrollSelect';
import { Icon } from '../../components/icons/Icon';
import { useThemeStyles } from '../../theme/useThemeStyles';

type BookingRecord = {
  id: string;
  status: string;
  scheduled_at?: string;
  checked_in_at?: string;
  booking_type?: string;
  final_price?: number;
  customer_id?: string;
  service_id?: string;
  technician_id?: string;
  customer?: { full_name?: string; phone?: string };
  service?: { name?: string; price?: number };
  tech?: { full_name?: string };
};

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const UPCOMING_STATUSES = new Set(['confirmed', 'waiting', 'serving', 'ready_for_checkout']);
const PAST_STATUSES = new Set(['completed', 'cancelled', 'missed']);

function getDateBounds(range: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (range === 'today') {
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return { start: today, end };
  }
  if (range === 'week') {
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  const start = new Date(today);
  start.setMonth(start.getMonth() - 1);
  const end = new Date(today);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function AdminBookingsScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState('upcoming');
  const [dateRange, setDateRange] = useState('today');
  const [technicians, setTechnicians] = useState<{ id: string; full_name?: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; price?: number }[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ phone: '', service_id: '', tech_id: '', date: '', time: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editTechId, setEditTechId] = useState('');
  const [editServiceId, setEditServiceId] = useState('');
  const [cancelTarget, setCancelTarget] = useState<BookingRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookingRecord | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await getSupabase().from('appointments').select('*').order('scheduled_at', { ascending: true });
      if (error) throw error;
      const bookingList = (data as BookingRecord[]) || [];
      const profileIds = [...new Set(bookingList.map((b) => b.customer_id).filter(Boolean))];
      const serviceIds = [...new Set(bookingList.map((b) => b.service_id).filter(Boolean))];
      const techIds = [...new Set(bookingList.map((b) => b.technician_id).filter(Boolean))];
      const [profilesRes, servicesRes, techsRes] = await Promise.all([
        profileIds.length ? getSupabase().from('profiles').select('id, full_name, phone').in('id', profileIds) : { data: [] },
        serviceIds.length ? getSupabase().from('services').select('id, name, price').in('id', serviceIds) : { data: [] },
        techIds.length ? getSupabase().from('profiles').select('id, full_name').in('id', techIds) : { data: [] },
      ]);
      const profileMap = Object.fromEntries((profilesRes.data || []).map((p: { id: string }) => [p.id, p]));
      const serviceMap = Object.fromEntries((servicesRes.data || []).map((s: { id: string }) => [s.id, s]));
      const techMap = Object.fromEntries((techsRes.data || []).map((t: { id: string }) => [t.id, t]));
      setBookings(bookingList.map((b) => ({
        ...b,
        customer: profileMap[b.customer_id || ''] || null,
        service: serviceMap[b.service_id || ''] || null,
        tech: techMap[b.technician_id || ''] || null,
      })));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const [techsRes, svcsRes] = await Promise.all([
        getSupabase().from('profiles').select('id, full_name').in('role', ['technician', 'admin']),
        getSupabase().from('services').select('id, name, price').order('name'),
      ]);
      setTechnicians((techsRes.data as typeof technicians) || []);
      setServices((svcsRes.data as typeof services) || []);
      fetchBookings();
    };
    init();
    const channel = getSupabase()
      .channel('booking-management')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchBookings())
      .subscribe();
    return () => { getSupabase().removeChannel(channel); };
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    const { start, end } = getDateBounds(dateRange);
    return bookings.filter((b) => {
      const matchesSearch = !searchTerm || (
        (b.customer?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.customer?.phone || '').includes(searchTerm) ||
        (b.service?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      const dateVal = b.scheduled_at || b.checked_in_at;
      const inRange = !dateVal || (new Date(dateVal) >= start && new Date(dateVal) < end);
      const statusMatch = statusTab === 'all' ? true
        : statusTab === 'upcoming' ? UPCOMING_STATUSES.has(b.status)
        : PAST_STATUSES.has(b.status);
      return matchesSearch && (statusTab === 'upcoming' || inRange) && statusMatch;
    });
  }, [bookings, searchTerm, statusTab, dateRange]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayBookings = bookings.filter((b) => {
      const d = b.scheduled_at || b.checked_in_at;
      return d && new Date(d) >= today;
    });
    const revenue = todayBookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + (b.final_price || b.service?.price || 0), 0);
    return {
      total: bookings.length,
      upcoming: bookings.filter((b) => UPCOMING_STATUSES.has(b.status)).length,
      revenue,
      completed: todayBookings.filter((b) => b.status === 'completed').length,
    };
  }, [bookings]);

  const handlePhoneChange = async (phone: string) => {
    setCreateForm((prev) => ({ ...prev, phone }));
    setCustomerName('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      const { data } = await getSupabase().from('profiles').select('full_name').eq('phone', phone).single();
      if (data) setCustomerName((data as { full_name?: string }).full_name || '');
      else setCreateError('Phone not registered');
    }
  };

  const saveCreate = async () => {
    if (!createForm.phone || !createForm.service_id || !createForm.date) {
      setCreateError('Phone, service, and date are required');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const { data: profileData } = await getSupabase().from('profiles').select('id').eq('phone', createForm.phone).single();
      if (!profileData) throw new Error('Phone not registered');
      const scheduledTime = createForm.time
        ? new Date(`${createForm.date}T${createForm.time}:00`).toISOString()
        : null;
      const svc = services.find((s) => s.id === createForm.service_id);
      const { error } = await getSupabase().from('appointments').insert({
        customer_id: (profileData as { id: string }).id,
        service_id: createForm.service_id,
        technician_id: createForm.tech_id || null,
        scheduled_at: scheduledTime,
        status: 'confirmed',
        booking_type: 'online',
        final_price: svc?.price || 0,
      });
      if (error) throw error;
      setShowCreateModal(false);
      fetchBookings();
    } catch (err) {
      setCreateError((err as Error).message);
    }
    setCreating(false);
  };

  const saveEdit = async () => {
    if (!editingBooking || !editDate || !editTime) return;
    const newScheduled = new Date(`${editDate}T${editTime}:00`).toISOString();
    const { error } = await getSupabase().rpc('update_appointment', {
      caller_phone: user?.phone,
      appointment_id: editingBooking.id,
      p_scheduled_at: newScheduled,
      p_service_id: editServiceId || null,
      p_technician_id: editTechId || null,
    });
    if (!error) {
      setEditingBooking(null);
      fetchBookings();
    }
  };

  const executeCancel = async () => {
    if (!cancelTarget) return;
    await getSupabase().rpc('cancel_appointment', { caller_phone: user?.phone, appointment_id: cancelTarget.id });
    setCancelTarget(null);
    fetchBookings();
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    await getSupabase().rpc('delete_appointment', { caller_phone: user?.phone, appointment_id: deleteTarget.id });
    setDeleteTarget(null);
    fetchBookings();
  };

  const exportCSV = async () => {
    const headers = ['Customer', 'Phone', 'Service', 'Status', 'Technician', 'Price'];
    const rows = filteredBookings.map((b) => [
      b.customer?.full_name || '',
      b.customer?.phone || '',
      b.service?.name || '',
      b.status,
      b.tech?.full_name || '',
      String(b.final_price || b.service?.price || ''),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    await Clipboard.setStringAsync(csv);
  };

  const inputStyle = {
    backgroundColor: styles.tokens.inputBg,
    borderColor: styles.tokens.borderLight,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: styles.tokens.textPrimary,
    marginBottom: 12,
  };

  const serviceOptions = services.map((s) => ({ value: s.id, label: `${s.name} ($${s.price})` }));
  const techOptions = [{ value: '', label: 'Unassigned' }, ...technicians.map((t) => ({ value: t.id, label: t.full_name || 'Tech' }))];

  if (loading) {
    return (
      <StaffScreenLayout>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </StaffScreenLayout>
    );
  }

  return (
    <StaffScreenLayout
      title="Bookings"
      subtitle="Manage appointments"
      headerRight={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={exportCSV} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: styles.tokens.borderLight, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="download" size={16} color={styles.tokens.goldStrong} />
            <Text style={styles.textGold}>Export</Text>
          </Pressable>
          <Pressable onPress={() => setShowCreateModal(true)} style={{ backgroundColor: styles.tokens.goldStrong, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="plus" size={16} color="#121212" />
            <Text style={{ color: '#121212', fontWeight: '600' }}>New</Text>
          </Pressable>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Total', value: stats.total },
          { label: 'Upcoming', value: stats.upcoming },
          { label: 'Revenue', value: `$${stats.revenue.toFixed(0)}` },
          { label: 'Done', value: stats.completed },
        ].map((s) => (
          <View key={s.label} style={[styles.card, { padding: 12, minWidth: 72, alignItems: 'center' }]}>
            <Text style={[styles.textGold, { fontWeight: '600' }]}>{s.value}</Text>
            <Text style={[styles.textSecondary, { fontSize: 11 }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <TextInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Search..." placeholderTextColor={styles.tokens.textMuted} style={inputStyle} />

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {STATUS_TABS.map((tab) => (
          <Pressable key={tab.value} onPress={() => setStatusTab(tab.value)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: statusTab === tab.value ? styles.tokens.goldStrong : styles.tokens.cardBg }}>
            <Text style={{ color: statusTab === tab.value ? '#121212' : styles.tokens.textSecondary, fontSize: 13 }}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
      {statusTab === 'past' && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {DATE_RANGES.map((r) => (
            <Pressable key={r.value} onPress={() => setDateRange(r.value)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: dateRange === r.value ? styles.tokens.goldStrong : styles.tokens.borderLight }}>
              <Text style={{ color: dateRange === r.value ? styles.tokens.goldStrong : styles.tokens.textSecondary, fontSize: 12 }}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {filteredBookings.length === 0 ? (
        <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
          <Text style={styles.textSecondary}>No bookings found</Text>
        </View>
      ) : (
        filteredBookings.map((booking) => {
          const statusStyle = APPOINTMENT_STATUS_COLORS[booking.status as keyof typeof APPOINTMENT_STATUS_COLORS] || APPOINTMENT_STATUS_COLORS.confirmed;
          const dateVal = booking.scheduled_at || booking.checked_in_at;
          return (
            <View key={booking.id} style={[styles.card, { padding: 14, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textPrimary, { fontWeight: '600' }]}>{booking.customer?.full_name || 'Guest'}</Text>
                  <Text style={styles.textSecondary}>{booking.service?.name || 'Service'}</Text>
                  {dateVal && (
                    <Text style={[styles.textSecondary, { fontSize: 11 }]}>
                      {new Date(dateVal).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderWidth: 1,
                      borderColor: (booking.booking_type || 'online') === 'online' ? `${styles.tokens.goldStrong}66` : '#ca8a0433',
                      backgroundColor: (booking.booking_type || 'online') === 'online' ? `${styles.tokens.goldStrong}22` : '#ca8a0422',
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        marginRight: 6,
                        backgroundColor: (booking.booking_type || 'online') === 'online' ? styles.tokens.goldStrong : '#facc15',
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color: (booking.booking_type || 'online') === 'online' ? styles.tokens.goldStrong : '#ca8a04',
                      }}
                    >
                      {(booking.booking_type || 'online') === 'online' ? 'Online' : 'Walk-in'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: statusStyle.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: statusStyle.text, fontSize: 11 }}>{APPOINTMENT_STATUS_LABELS[booking.status as keyof typeof APPOINTMENT_STATUS_LABELS] || booking.status}</Text>
                  </View>
                  <Text style={[styles.textGold, { marginTop: 4, fontWeight: '600' }]}>
                    ${booking.final_price || booking.service?.price || 0}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                {!['completed', 'cancelled', 'missed'].includes(booking.status) && (
                  <Pressable onPress={() => {
                    const d = new Date(booking.scheduled_at || Date.now());
                    setEditDate(d.toISOString().split('T')[0]);
                    setEditTime(d.toTimeString().slice(0, 5));
                    setEditTechId(booking.technician_id || '');
                    setEditServiceId(booking.service_id || '');
                    setEditingBooking(booking);
                  }}>
                    <Text style={styles.textGold}>Edit</Text>
                  </Pressable>
                )}
                {!['completed', 'cancelled'].includes(booking.status) && (
                  <Pressable onPress={() => setCancelTarget(booking)}>
                    <Text style={{ color: '#f87171' }}>Cancel</Text>
                  </Pressable>
                )}
                {booking.status === 'cancelled' && (
                  <Pressable onPress={async () => {
                    await getSupabase().rpc('update_appointment', { caller_phone: user?.phone, appointment_id: booking.id, p_status: 'confirmed' });
                    fetchBookings();
                  }}>
                    <Text style={styles.textGold}>Reactivate</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setDeleteTarget(booking)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="trash" size={14} color="#f87171" />
                  <Text style={{ color: '#f87171' }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <AppModal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Booking" scrollBody footer={<><ModalButton label="Cancel" onPress={() => setShowCreateModal(false)} /><ModalButton label={creating ? 'Creating...' : 'Create'} onPress={saveCreate} disabled={creating} /></>}>
        <Text style={styles.textSecondary}>Phone (10 digits)</Text>
        <TextInput value={createForm.phone} onChangeText={handlePhoneChange} keyboardType="phone-pad" style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
        {customerName ? <Text style={styles.textGold}>{customerName}</Text> : null}
        <Text style={styles.textSecondary}>Service</Text>
        <ScrollSelect options={serviceOptions} value={createForm.service_id} onChange={(v) => setCreateForm({ ...createForm, service_id: v })} />
        <Text style={[styles.textSecondary, { marginTop: 8 }]}>Technician</Text>
        <ScrollSelect options={techOptions} value={createForm.tech_id} onChange={(v) => setCreateForm({ ...createForm, tech_id: v })} />
        <Text style={[styles.textSecondary, { marginTop: 8 }]}>Date (YYYY-MM-DD)</Text>
        <TextInput value={createForm.date} onChangeText={(v) => setCreateForm({ ...createForm, date: v })} style={inputStyle} placeholder="2026-06-06" placeholderTextColor={styles.tokens.textMuted} />
        <Text style={styles.textSecondary}>Time (HH:MM)</Text>
        <TextInput value={createForm.time} onChangeText={(v) => setCreateForm({ ...createForm, time: v })} style={inputStyle} placeholder="14:30" placeholderTextColor={styles.tokens.textMuted} />
        {createError ? <Text style={{ color: '#f87171' }}>{createError}</Text> : null}
      </AppModal>

      <AppModal open={!!editingBooking} onClose={() => setEditingBooking(null)} title="Edit Booking" scrollBody footer={<><ModalButton label="Cancel" onPress={() => setEditingBooking(null)} /><ModalButton label="Save" onPress={saveEdit} /></>}>
        <Text style={styles.textSecondary}>Date</Text>
        <TextInput value={editDate} onChangeText={setEditDate} style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
        <Text style={styles.textSecondary}>Time</Text>
        <TextInput value={editTime} onChangeText={setEditTime} style={inputStyle} placeholderTextColor={styles.tokens.textMuted} />
        <Text style={styles.textSecondary}>Service</Text>
        <ScrollSelect options={serviceOptions} value={editServiceId} onChange={setEditServiceId} />
        <Text style={[styles.textSecondary, { marginTop: 8 }]}>Technician</Text>
        <ScrollSelect options={techOptions} value={editTechId} onChange={setEditTechId} />
      </AppModal>

      <AppModal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Booking?" footer={<><ModalButton label="Keep" onPress={() => setCancelTarget(null)} /><ModalButton label="Cancel Booking" variant="danger" onPress={executeCancel} /></>} />
      <AppModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Permanently?" subtitle="This cannot be undone." footer={<><ModalButton label="Keep" onPress={() => setDeleteTarget(null)} /><ModalButton label="Delete" variant="danger" onPress={executeDelete} /></>} />
    </StaffScreenLayout>
  );
}
