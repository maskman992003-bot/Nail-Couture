import { supabase } from '../lib/supabase';

export async function fetchStaffNotes(customerId, limit = 50) {
  const { data, error } = await supabase
    .from('customer_staff_notes')
    .select('id, author_id, author_name, note, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message?.includes('customer_staff_notes') || error.code === '42P01') {
      return { rows: [], available: false };
    }
    throw error;
  }

  return { rows: data || [], available: true };
}

export async function addStaffNote(customerId, note, author) {
  const trimmed = note?.trim();
  if (!trimmed) return { success: false, error: 'Note cannot be empty' };

  const { data, error } = await supabase
    .from('customer_staff_notes')
    .insert({
      customer_id: customerId,
      author_id: author?.id || null,
      author_name: author?.full_name || 'Staff',
      note: trimmed,
    })
    .select('id, author_id, author_name, note, created_at')
    .single();

  if (error) {
    if (error.message?.includes('customer_staff_notes') || error.code === '42P01') {
      return { success: false, error: 'Notes unavailable. Run sql/025_phase4_staff_crm.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Failed to save note' };
  }

  return { success: true, note: data };
}
