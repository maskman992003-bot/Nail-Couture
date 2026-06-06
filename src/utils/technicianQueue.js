import { supabase } from '../lib/supabase';
import { fetchTechnicianAppointments } from './staffSchedule';
import { logRefreshmentUsage } from './inventoryUsage';
import { getWorkstationStatus, WORKSTATION_ON_BREAK } from './technicianWorkstation';

export function getCallerPhone(fallbackPhone) {
  try {
    const stored = localStorage.getItem('salon_user_data');
    if (stored) {
      const phone = JSON.parse(stored).phone;
      if (phone) return phone;
    }
  } catch {
    // ignore parse errors
  }
  return fallbackPhone || '';
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate()
  );
}

/** Keep active assignments; only scope completed rows to today. */
export function filterMyQueueForToday(appointments) {
  return (appointments || []).filter((a) => {
    if (a.status === 'assigned_pending' || a.status === 'serving') return true;
    if (a.status === 'ready_for_checkout' || a.status === 'completed') {
      return isToday(a.checked_in_at) || isToday(a.start_time) || isToday(a.scheduled_at)
        || isToday(a.completed_at) || isToday(a.end_time);
    }
    return false;
  });
}

export function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

export function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export async function fetchMyQueue(technicianId, callerPhone) {
  if (!callerPhone) throw new Error('Missing caller phone for staff RPC');
  // No date_from — lobby assigns by technician_id; date filter on checked_in_at
  // would hide assigned_pending rows (AdminLobby fetches the same way).
  const { data, error } = await supabase.rpc('get_appointments', {
    caller_phone: callerPhone,
    technician_id_filter: technicianId,
    status_filter: 'assigned_pending,serving,ready_for_checkout,completed',
    order_asc: true,
  });
  if (error) throw error;
  return filterMyQueueForToday(data || []);
}

export async function fetchFloorTechnicians() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, preferences')
    .eq('role', 'technician')
    .order('full_name');

  if (error) return [];
  return data || [];
}

export async function fetchFloorSnapshot(callerPhone) {
  if (!callerPhone) throw new Error('Missing caller phone for staff RPC');
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.rpc('get_appointments', {
    caller_phone: callerPhone,
    status_filter: 'waiting,serving,assigned_pending,ready_for_checkout',
    date_from: `${today}T00:00:00`,
    order_asc: true,
  });
  if (error) throw error;
  return data || [];
}

/** Map waiting appointment id → queue position (1-based). */
export function computeWaitPositions(appointments) {
  const waiting = (appointments || [])
    .filter((a) => a.status === 'waiting')
    .sort((a, b) => new Date(a.checked_in_at) - new Date(b.checked_in_at));
  const positions = new Map();
  waiting.forEach((a, i) => positions.set(a.id, i + 1));
  return positions;
}

export function requestNotificationPermission() {
  if (typeof Notification === 'undefined') {
    return Promise.resolve('denied');
  }
  if (Notification.permission !== 'default') {
    return Promise.resolve(Notification.permission);
  }
  return Notification.requestPermission();
}

export function getTodayStartDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function fetchTechnicianDayPayments(technicianId) {
  if (!technicianId) return [];
  const todayStart = getTodayStartDate().toISOString();
  const { data, error } = await supabase
    .from('payment_transactions')
    .select(`
      id,
      appointment_id,
      extras_amount,
      amount,
      final_amount,
      created_at,
      customer:profiles!payment_transactions_customer_id_fkey ( full_name )
    `)
    .eq('technician_id', technicianId)
    .eq('status', 'completed')
    .gte('created_at', todayStart)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Technician tips fetch failed:', error);
    return [];
  }
  return data || [];
}

export function sumTipsFromPayments(payments) {
  return (payments || []).reduce((sum, p) => {
    const tip = Number(p.extras_amount ?? 0);
    return sum + (Number.isFinite(tip) ? tip : 0);
  }, 0);
}

export function mapPaymentsByAppointment(payments) {
  const map = new Map();
  for (const p of payments || []) {
    if (p.appointment_id) map.set(p.appointment_id, p);
  }
  return map;
}

export function getTodayWorkAppointments(myAppointments) {
  return (myAppointments || []).filter(
    (a) => a.status === 'completed' || a.status === 'ready_for_checkout'
  );
}

export function formatServiceDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const mins = Math.round((new Date(endTime) - new Date(startTime)) / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function playAssignmentChime() {
  if (localStorage.getItem('tech_alert_sound') === 'false') return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // ignore unsupported environments
  }
}

export function buildTechnicianFloorRows(technicians, floorAppointments, currentTechnicianId) {
  const serving = floorAppointments.filter((a) => a.status === 'serving');
  const pending = floorAppointments.filter((a) => a.status === 'assigned_pending');

  return (technicians || []).map((tech) => {
    const isMe = tech.id === currentTechnicianId;
    const activeCustomer = serving.find((a) => a.technician_id === tech.id);
    const pendingCustomer = pending.find((a) => a.technician_id === tech.id);
    const onBreak = getWorkstationStatus(tech.preferences) === WORKSTATION_ON_BREAK;
    const isBusy = !!activeCustomer;
    const isPending = !!pendingCustomer;
    const client = activeCustomer || pendingCustomer;

    const statusLabel = isBusy
      ? 'Busy'
      : onBreak
        ? 'On Break'
        : isPending
          ? 'Pending'
          : 'Available';

    const statusClass = isBusy
      ? 'bg-red-400/15 text-red-400 border-red-400/30'
      : onBreak
        ? 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30'
        : isPending
          ? 'bg-blue-400/15 text-blue-400 border-blue-400/30'
          : 'bg-green-400/15 text-green-400 border-green-400/30';

    return { tech, isMe, statusLabel, statusClass, client, onBreak };
  });
}

export function notifyNewAssignment(appointment) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const name = appointment.customer?.full_name || 'A client';
  const service = appointment.services?.name || appointment.add_ons || 'service';
  const body = `${name} — ${service}`;

  try {
    new Notification('New assignment', { body, tag: `assignment-${appointment.id}` });
  } catch {
    // ignore unsupported environments
  }
}

export async function fetchPendingAssignmentCount(technicianId, callerPhone) {
  if (!technicianId || !callerPhone) return 0;
  try {
    const mine = await fetchMyQueue(technicianId, callerPhone);
    return mine.filter((a) => a.status === 'assigned_pending').length;
  } catch {
    return 0;
  }
}

export async function fetchWeekAppointments(technicianId) {
  if (!technicianId) return [];
  try {
    const { start, end } = getWeekRange();
    return await fetchTechnicianAppointments(technicianId, start, end);
  } catch (err) {
    console.warn('Week stats unavailable:', err);
    return [];
  }
}

export function computeQueueStats(myAppointments) {
  const completed = myAppointments.filter((a) => a.status === 'completed');
  const pending = myAppointments.filter((a) => a.status === 'assigned_pending');
  const serving = myAppointments.find((a) => a.status === 'serving') || null;
  const nextUp = pending[0] || null;

  const durations = completed
    .filter((a) => a.start_time && (a.end_time || a.completed_at))
    .map((a) => {
      const end = new Date(a.end_time || a.completed_at);
      const start = new Date(a.start_time);
      return (end - start) / 60000;
    })
    .filter((m) => m > 0 && m < 480);

  const avgServiceMinutes = durations.length
    ? Math.round(durations.reduce((s, m) => s + m, 0) / durations.length)
    : null;

  const nextService = nextUp
    ? (nextUp.add_ons || nextUp.services?.name || 'Service')
    : null;

  return {
    completedToday: completed.length,
    pendingCount: pending.length,
    avgServiceMinutes,
    completedAppointments: completed,
    todayWorkAppointments: getTodayWorkAppointments(myAppointments),
    nextClient: nextUp,
    nextClientService: nextService,
    currentAppointment: serving,
    pendingAssignments: pending,
  };
}

export function computeWeekStats(weekAppointments) {
  const byDay = Array(7).fill(0);
  const byDayCompleted = Array(7).fill(0);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  let completed = 0;
  let scheduled = 0;
  let weekRevenue = 0;

  for (const appt of weekAppointments) {
    scheduled += 1;
    if (appt.status === 'completed') {
      completed += 1;
      const price = Number(appt.final_price ?? 0);
      if (Number.isFinite(price)) weekRevenue += price;
    }
    if (appt.appointment_time) {
      const d = new Date(appt.appointment_time);
      const dayIndex = Math.floor((d - weekStart) / 86400000);
      if (dayIndex >= 0 && dayIndex < 7) {
        byDay[dayIndex] += 1;
        if (appt.status === 'completed') byDayCompleted[dayIndex] += 1;
      }
    }
  }

  const max = Math.max(...byDay, 1);
  const completionRate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : null;
  return { byDay, byDayCompleted, max, completed, scheduled, weekRevenue, completionRate };
}

export async function decrementRefreshmentInventory(refreshmentName, callerPhone, appointmentId, customerId) {
  if (!refreshmentName || !callerPhone) return;
  try {
    await logRefreshmentUsage(callerPhone, refreshmentName, appointmentId, customerId);
  } catch {
    // Non-blocking inventory update
  }
}

export function formatElapsedMinutes(startTime) {
  if (!startTime) return null;
  const mins = Math.floor((Date.now() - new Date(startTime)) / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
