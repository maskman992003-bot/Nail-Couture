import { supabase } from '../lib/supabase';

const VISIT_NOTES_TTL_MS = 60 * 1000;
const visitNotesCache = new Map();

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

async function fetchStaffNotesForAppointment(appointmentId) {
  if (!appointmentId) return [];

  const { data, error } = await supabase
    .from('customer_staff_notes')
    .select('id, author_name, note, created_at')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load staff notes for appointment:', error);
    return [];
  }

  return data || [];
}

function buildVisitNoteEntries(appointment, staffRows, paymentNote) {
  const appointmentId = appointment.id;
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

  (staffRows || []).forEach((row) => {
    entries.push({
      id: row.id,
      source: 'Staff note',
      authorName: row.author_name || 'Staff',
      createdAt: row.created_at,
      body: row.note,
    });
  });

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

export function getImmediateVisitNotes(appointment) {
  if (!appointment?.id || !appointment.notes?.trim()) return [];
  return buildVisitNoteEntries(appointment, [], null);
}

/**
 * Collect all notes tied to a visit: appointment record, staff notes, checkout notes.
 */
export async function fetchAppointmentVisitNotes(appointment) {
  if (!appointment?.id) return [];

  const appointmentId = appointment.id;
  const cached = visitNotesCache.get(appointmentId);
  if (cached && Date.now() - cached.fetchedAt < VISIT_NOTES_TTL_MS) {
    return cached.entries;
  }

  const [staffRows, paymentNote] = await Promise.all([
    fetchStaffNotesForAppointment(appointmentId),
    fetchPaymentNote(appointmentId),
  ]);

  const entries = buildVisitNoteEntries(appointment, staffRows, paymentNote);
  visitNotesCache.set(appointmentId, { entries, fetchedAt: Date.now() });
  return entries;
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
