import { supabase } from '../lib/supabase'
import { logInventoryUsage } from '@nail-couture/shared/utils/inventoryUsage'

export async function processCheckIn(phoneNumber, checkedInBy = null) {
  const cleanPhone = phoneNumber.replace(/\D/g, '')

  const { data, error } = await supabase.rpc('process_kiosk_check_in', {
    p_phone: cleanPhone,
    p_checked_in_by: checkedInBy || null,
  })

  if (error) {
    if (error.message?.includes('process_kiosk_check_in') || error.code === '42883') {
      throw new Error('Check-in unavailable. Run sql/028_kiosk_check_in_rpc.sql in Supabase.')
    }
    throw error
  }

  if (!data) {
    throw new Error('Check-in failed. Please try again.')
  }

  if (data.is_new) {
    return { isNew: true }
  }

  return {
    isNew: false,
    name: data.name,
    profile: data.profile,
    appointment: data.appointment,
  }
}

export async function logInventoryUsageByRefreshmentName(refreshmentName, quantityChanged, appointmentId, customerId, reason, callerPhone) {
  if (!refreshmentName) return;

  let phone = callerPhone;
  if (!phone) {
    try {
      const stored = localStorage.getItem('salon_user_data');
      if (stored) phone = JSON.parse(stored).phone;
    } catch { /* ignore */ }
  }

  if (phone) {
    const { data: items } = await supabase
      .from('inventory')
      .select('id')
      .eq('item_name', refreshmentName)
      .eq('category', 'refreshment')
      .limit(1);

    if (items?.[0]) {
      const result = await logInventoryUsage(phone, {
        inventoryId: items[0].id,
        quantityChanged,
        appointmentId,
        customerId,
        reason,
        logType: 'usage',
      });
      if (result.success) return;
    }
  }

  // Fallback: log-only insert if RPC not yet migrated
  const { data: inventoryItems, error: inventoryError } = await supabase
    .from('inventory')
    .select('id')
    .eq('item_name', refreshmentName)
    .eq('category', 'refreshment')
    .limit(1);

  if (inventoryError) throw inventoryError;
  const inventoryItem = inventoryItems?.[0];
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
