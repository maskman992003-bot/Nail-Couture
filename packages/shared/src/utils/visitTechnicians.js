import { supabase } from '../lib/supabase';

export const MAX_CO_TECHNICIANS = 3;

export async function fetchVisitTechnicianData(callerPhone, appointmentId) {
  const { data, error } = await supabase.rpc('get_visit_participating_technicians', {
    caller_phone: callerPhone,
    p_appointment_id: appointmentId,
  });
  if (error) throw error;
  return data || { technicians: [], primary_technician_id: null };
}

export function countCoTechnicians(technicians = [], primaryTechnicianId = null) {
  return technicians.filter(
    (t) => !(t.is_primary || t.technician_id === primaryTechnicianId),
  ).length;
}

export async function assignServiceTechnician(callerPhone, appointmentId, serviceItemId, technicianId) {
  const { data, error } = await supabase.rpc('assign_service_technician', {
    caller_phone: callerPhone,
    p_appointment_id: appointmentId,
    p_service_item_id: serviceItemId,
    p_technician_id: technicianId,
  });
  if (error) throw error;
  return data;
}

export async function addVisitCoTechnician(callerPhone, appointmentId, technicianId) {
  const { data, error } = await supabase.rpc('add_visit_co_technician', {
    caller_phone: callerPhone,
    p_appointment_id: appointmentId,
    p_technician_id: technicianId,
  });
  if (error) throw error;
  return data;
}

export async function handoffVisitTechnician(callerPhone, appointmentId, newTechnicianId) {
  const { data, error } = await supabase.rpc('handoff_visit_technician', {
    caller_phone: callerPhone,
    p_appointment_id: appointmentId,
    p_new_technician_id: newTechnicianId,
  });
  if (error) throw error;
  return data;
}

export async function removeVisitTechnician(callerPhone, appointmentId, technicianId) {
  const { data, error } = await supabase.rpc('remove_visit_technician', {
    caller_phone: callerPhone,
    p_appointment_id: appointmentId,
    p_technician_id: technicianId,
  });
  if (error) throw error;
  return data;
}
