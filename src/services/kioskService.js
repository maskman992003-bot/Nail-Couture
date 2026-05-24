import { supabase } from '../lib/supabase'

export async function processCheckIn(phoneNumber, checkedInBy = null) {
  const cleanPhone = phoneNumber.replace(/\D/g, '')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', cleanPhone)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Profile search error:', profileError)
    throw profileError
  }

  if (profile) {
    const { data: existing } = await supabase
      .from('appointments')
      .select('id, status, service_id, scheduled_at')
      .eq('customer_id', profile.id)
      .in('status', ['confirmed', 'waiting', 'serving'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'waiting',
          checked_in_at: new Date().toISOString(),
          checked_in_by: checkedInBy || null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) throw updateError
      return { isNew: false, name: profile.full_name, appointment: updated }
    }

    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        customer_id: profile.id,
        status: 'waiting',
        checked_in_at: new Date().toISOString(),
        checked_in_by: checkedInBy || null,
        booking_type: 'walk_in',
      })
      .select()
      .single()

    if (appointmentError) throw appointmentError

    return { isNew: false, name: profile.full_name, appointment: appointments }
  }

  return { isNew: true }
}

export async function logInventoryUsageByRefreshmentName(refreshmentName, quantityChanged, appointmentId, customerId, reason) {
  if (!refreshmentName) return;
  const { data: inventoryItem, error: inventoryError } = await supabase
    .from('inventory')
    .select('id')
    .eq('item_name', refreshmentName)
    .eq('category', 'refreshment')
    .single();

  if (inventoryError) throw inventoryError;
  if (!inventoryItem) throw new Error(`Inventory item not found for refreshment: ${refreshmentName}`);

  const { error } = await supabase.from('inventory_logs').insert({
    inventory_id: inventoryItem.id,
    appointment_id: appointmentId,
    customer_id: customerId,
    quantity_changed: quantityChanged,
    reason,
  });

  if (error) throw error;
}

export async function getAppointmentCounts(employeeId, shiftDate) {
  const dateStart = `${shiftDate}T00:00:00`
  const dateEnd = `${shiftDate}T23:59:59`

  const walkInCount = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('technician_id', employeeId)
    .eq('booking_type', 'walk_in')
    .gte('scheduled_at', dateStart)
    .lt('scheduled_at', dateEnd)

  const onlineCount = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('technician_id', employeeId)
    .eq('booking_type', 'online')
    .gte('scheduled_at', dateStart)
    .lt('scheduled_at', dateEnd)

  return {
    walkIn: walkInCount.count || 0,
    online: onlineCount.count || 0,
  }
}