import { supabase } from '../lib/supabase';
import { fetchStaffNotes } from './staffCustomerNotes';

function getCallerPhone(callerPhone) {
  if (callerPhone) return callerPhone;
  try {
    const stored = localStorage.getItem('salon_user_data');
    if (stored) {
      const phone = JSON.parse(stored).phone;
      if (phone) return phone;
    }
  } catch {
    // ignore
  }
  return '';
}

async function fetchPaymentNote(appointmentId) {
  if (!appointmentId) return null;

  const { data, error } = await supabase
    .from('payment_transactions')
    .select('notes, created_at')
    .eq('appointment_id', appointmentId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.notes?.trim()) return null;
  return {
    notes: data.notes.trim(),
    created_at: data.created_at,
  };
}

export async function fetchAppointmentVisitNotes(appointment, callerPhone) {
  if (!appointment?.id) return [];

  const appointmentId = appointment.id;
  const customerId = appointment.customer_id || appointment.customer?.id;
  const phone = getCallerPhone(callerPhone);
  const entries = [];

  if (appointment.notes?.trim()) {
    entries.push({
      id: `appointment-${appointmentId}`,
      source: 'Visit record',
      authorName: null,
      createdAt: appointment.updated_at || appointment.checked_in_at || appointment.created_at || null,
      body: appointment.notes.trim(),
    });
  }

  if (customerId && phone) {
    const { rows } = await fetchStaffNotes(customerId, 100, phone);
    (rows || [])
      .filter((row) => row.appointment_id === appointmentId)
      .forEach((row) => {
        entries.push({
          id: row.id,
          source: 'Staff note',
          authorName: row.author_name || 'Staff',
          createdAt: row.created_at,
          body: row.note,
        });
      });
  }

  const paymentNote = await fetchPaymentNote(appointmentId);
  if (paymentNote) {
    entries.push({
      id: `payment-${appointmentId}`,
      source: 'Checkout',
      authorName: 'Cashier',
      createdAt: paymentNote.created_at,
      body: paymentNote.notes,
    });
  }

  return entries.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime - bTime;
  });
}

export function formatVisitNoteTimestamp(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
