import { supabase } from '../lib/supabase';

export async function logInventoryUsage(callerPhone, {
  inventoryId,
  quantityChanged,
  appointmentId = null,
  customerId = null,
  reason = null,
  logType = 'usage',
}) {
  const { data, error } = await supabase.rpc('log_inventory_usage', {
    caller_phone: callerPhone,
    p_inventory_id: inventoryId,
    p_quantity_changed: quantityChanged,
    p_appointment_id: appointmentId,
    p_customer_id: customerId,
    p_reason: reason,
    p_log_type: logType,
  });

  if (error) {
    if (error.message?.includes('log_inventory_usage') || error.code === '42883') {
      return { success: false, error: 'Run sql/030_technician_phase6.sql in Supabase.' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/** Log refreshment consumption by item name (unified RPC path). */
export async function logRefreshmentUsage(callerPhone, refreshmentName, appointmentId, customerId) {
  if (!refreshmentName || !callerPhone) return { success: false };

  const { data: items, error: fetchError } = await supabase
    .from('inventory')
    .select('id')
    .eq('item_name', refreshmentName)
    .eq('category', 'refreshment')
    .limit(1);

  if (fetchError || !items?.[0]) return { success: false };

  return logInventoryUsage(callerPhone, {
    inventoryId: items[0].id,
    quantityChanged: -1,
    appointmentId,
    customerId,
    reason: 'Consumed during service',
    logType: 'usage',
  });
}
