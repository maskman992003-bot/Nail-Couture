import { supabase } from '../lib/supabase';

export const SCHEDULABLE_ROLES = ['admin', 'cashier', 'technician'];

/** Normalize shift rows from either get_staff_schedule RPC signature */export function normalizeShift(row) {
  if (!row) return null;
  return {
    id: row.id || row.shift_id,
    employee_id: row.employee_id || row.staff_id,
    shift_date: row.shift_date,
    shift_type: row.shift_type,
    start_time: row.start_time,
    end_time: row.end_time,
    full_name: row.full_name || row.staff_name,
    appointment_count: row.appointment_count ?? null,
    confirmed_online_count: row.confirmed_online_count ?? null,
  };
}

/** Normalize time-off rows from either get_time_off_requests RPC signature */
export function normalizeTimeOffRequest(row) {
  if (!row) return null;
  return {
    id: row.id || row.request_id,
    staff_id: row.staff_id,
    staff_name: row.staff_name,
    start_date: row.start_date,
    end_date: row.end_date,
    reason: row.reason,
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewer_name: row.reviewer_name,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
  };
}

export async function fetchSchedulableStaff() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone, created_at')
    .in('role', SCHEDULABLE_ROLES)
    .order('full_name');
  if (error) throw error;
  return data || [];
}

/**
 * PostgREST cannot resolve overloaded get_staff_schedule signatures.
 * Always target the 4-arg overload (p_employee_id + p_staff_id).
 */
export async function fetchStaffShifts(staffId, startDate, endDate) {
  const { data, error } = await supabase.rpc('get_staff_schedule', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_employee_id: staffId || null,
    p_staff_id: staffId || null,
  });
  if (error) throw error;
  return (data || []).map(normalizeShift).filter(Boolean);
}

/**
 * PostgREST cannot resolve overloaded get_time_off_requests signatures.
 * Use the 2-arg overload when filtering by staff; otherwise call with no args.
 */
export async function fetchTimeOffRequests({ status = null, staffId = null } = {}) {
  const rpcCall = staffId
    ? supabase.rpc('get_time_off_requests', { p_status: status, p_staff_id: staffId })
    : supabase.rpc('get_time_off_requests');

  const { data, error } = await rpcCall;
  if (error) throw error;
  return (data || []).map(normalizeTimeOffRequest).filter(Boolean);
}
export async function submitTimeOffRequest(staffId, startDate, endDate, reason) {
  const { error } = await supabase.rpc('create_time_off_request', {
    p_staff_id: staffId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_reason: reason || null,
  });
  if (error) throw error;
}

export async function reviewTimeOffRequest(requestId, status, reviewedBy) {
  const { error } = await supabase.rpc('review_time_off_request', {
    p_request_id: requestId,
    p_status: status,
    p_reviewed_by: reviewedBy,
  });
  if (error) throw error;
}

export async function fetchTechnicianAppointments(staffId, startDate, endDate) {
  const { data, error } = await supabase.rpc('get_technician_appointments', {
    p_staff_id: staffId,
    p_start_date: startDate,
    p_end_date: endDate,
  });  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id || row.appointment_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    service_name: row.service_name,
    appointment_time: row.appointment_time,
    status: row.status,
    source: row.source,
    final_price: row.final_price,
  }));
}
