import { supabase } from '../lib/supabase';

function getCallerPhone(author) {
  if (author?.phone) return author.phone;
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

export async function fetchStaffNotes(customerId, limit = 50, callerPhone) {
  const phone = callerPhone || getCallerPhone();
  if (!phone || !customerId) {
    return { rows: [], available: false };
  }

  const { data, error } = await supabase.rpc('get_staff_notes', {
    caller_phone: phone,
    p_customer_id: customerId,
    p_limit: limit,
  });

  if (error) {
    if (
      error.message?.includes('get_staff_notes')
      || error.message?.includes('customer_staff_notes')
      || error.code === '42883'
      || error.code === '42P01'
    ) {
      return { rows: [], available: false };
    }
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];
  return { rows, available: true };
}

export async function addStaffNote(customerId, note, author, options = {}) {
  const trimmed = note?.trim();
  if (!trimmed) return { success: false, error: 'Note cannot be empty' };
  if (!customerId) return { success: false, error: 'Missing customer' };

  const phone = getCallerPhone(author);
  if (!phone) return { success: false, error: 'Missing staff phone for authorization' };

  const { data, error } = await supabase.rpc('add_staff_note', {
    caller_phone: phone,
    p_customer_id: customerId,
    p_note: trimmed,
    p_appointment_id: options.appointmentId || null,
  });

  if (error) {
    if (
      error.message?.includes('add_staff_note')
      || error.message?.includes('customer_staff_notes')
      || error.code === '42883'
      || error.code === '42P01'
    ) {
      return { success: false, error: 'Notes unavailable. Run sql/027_staff_notes_rpc.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Failed to save note' };
  }

  const payload = data || {};
  if (!payload.success || !payload.note) {
    return { success: false, error: 'Failed to save note' };
  }

  return { success: true, note: payload.note };
}
