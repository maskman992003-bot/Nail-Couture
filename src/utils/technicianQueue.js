import { supabase } from '../lib/supabase';
import { fetchTechnicianAppointments } from './staffSchedule';

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
    if (a.status === 'completed') {
      return isToday(a.checked_in_at) || isToday(a.start_time) || isToday(a.scheduled_at);
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
    status_filter: 'assigned_pending,serving,completed',
    order_asc: true,
  });
  if (error) throw error;
  return filterMyQueueForToday(data || []);
}

export async function fetchFloorSnapshot(callerPhone) {
  if (!callerPhone) throw new Error('Missing caller phone for staff RPC');
  const { data, error } = await supabase.rpc('get_appointments', {
    caller_phone: callerPhone,
    status_filter: 'waiting,serving,assigned_pending',
    order_asc: true,
  });
  if (error) throw error;
  return data || [];
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

  const revenueToday = completed.reduce((sum, a) => {
    const price = Number(a.final_price ?? a.services?.price ?? 0);
    return sum + (Number.isFinite(price) ? price : 0);
  }, 0);

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

  return {
    completedToday: completed.length,
    pendingCount: pending.length,
    revenueToday,
    avgServiceMinutes,
    nextClient: nextUp,
    currentAppointment: serving,
    pendingAssignments: pending,
  };
}

export function computeWeekStats(weekAppointments) {
  const byDay = Array(7).fill(0);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  weekStart.setHours(0, 0, 0, 0);

  let completed = 0;
  let scheduled = 0;

  for (const appt of weekAppointments) {
    scheduled += 1;
    if (appt.status === 'completed') completed += 1;
    if (appt.appointment_time) {
      const d = new Date(appt.appointment_time);
      const dayIndex = Math.floor((d - weekStart) / 86400000);
      if (dayIndex >= 0 && dayIndex < 7) byDay[dayIndex] += 1;
    }
  }

  const max = Math.max(...byDay, 1);
  return { byDay, max, completed, scheduled };
}

export async function decrementRefreshmentInventory(refreshmentName) {
  if (!refreshmentName) return;
  try {
    const { data: item, error } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('item_name', refreshmentName)
      .eq('category', 'refreshment')
      .maybeSingle();

    if (error || !item || item.quantity <= 0) return;

    await supabase
      .from('inventory')
      .update({ quantity: item.quantity - 1 })
      .eq('id', item.id);
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
