import { supabase } from '../lib/supabase'
import { logInventoryUsage } from '../utils/inventoryUsage'
import { buildAppointmentServicePayload } from '../utils/appointmentServices'

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

function isRpcNotFoundError(error) {
  if (!error) return false
  const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
  return (
    error.code === '42883'
    || error.code === 'PGRST202'
    || message.includes('could not find the function')
    || message.includes('complete_kiosk_check_in')
  )
}

function buildCompleteKioskCheckInArgs(cleanPhone, appointmentId, options = null) {
  const args = {
    caller_phone: cleanPhone,
    appointment_id: appointmentId,
  }

  if (!options) return args

  const { services = [], addOns = [], refreshmentPref = null } = options

  if (refreshmentPref) {
    args.p_refreshment_pref = refreshmentPref
  }

  if (services.length > 0 || addOns.length > 0) {
    const { add_ons: addOnsValue, selected_service_names: selectedServiceNames } =
      buildAppointmentServicePayload(services, addOns)
    const totalPrice =
      services.reduce((sum, s) => sum + (s.price || 0), 0) +
      addOns.reduce((sum, a) => sum + (a.price || 0), 0)
    Object.assign(args, {
      p_service_id: services[0]?.id || null,
      p_add_ons: addOnsValue,
      p_selected_service_names: selectedServiceNames,
      p_final_price: totalPrice,
    })
  }

  return args
}

async function saveKioskVisitDetails(callerPhone, appointmentId, options = {}) {
  const { services = [], addOns = [], refreshmentPref = null } = options
  const rpcArgs = {
    caller_phone: callerPhone,
    appointment_id: appointmentId,
    p_refreshment_pref: refreshmentPref || null,
  }

  if (services.length > 0 || addOns.length > 0) {
    const { add_ons: addOnsValue, selected_service_names: selectedServiceNames } =
      buildAppointmentServicePayload(services, addOns)
    const totalPrice =
      services.reduce((sum, s) => sum + (s.price || 0), 0) +
      addOns.reduce((sum, a) => sum + (a.price || 0), 0)
    Object.assign(rpcArgs, {
      p_service_id: services[0]?.id || null,
      p_add_ons: addOnsValue,
      p_selected_service_names: selectedServiceNames,
      p_final_price: totalPrice,
    })
  }

  const { error } = await supabase.rpc('update_my_appointment', rpcArgs)
  if (error) throw error
}

async function ensureKioskRefreshmentDeducted(cleanPhone, appointmentId, options, data) {
  const refreshmentPref =
    options?.refreshmentPref
    || data?.appointment?.refreshment_pref
    || null

  if (!refreshmentPref || data?.refreshment_deducted === true) {
    return data
  }

  const { data: deductData, error: deductError } = await supabase.rpc(
    'deduct_kiosk_check_in_refreshment',
    {
      caller_phone: cleanPhone,
      appointment_id: appointmentId,
      p_refreshment_pref: refreshmentPref,
    },
  )

  if (deductError) {
    if (!isRpcNotFoundError(deductError)) {
      console.warn('Kiosk refreshment deduction failed:', deductError)
    }
    return data
  }

  if (deductData?.deducted) {
    return { ...data, refreshment_deducted: true }
  }

  return data
}

export async function completeCheckIn(phoneNumber, appointmentId, options = null) {
  const cleanPhone = phoneNumber.replace(/\D/g, '')
  const callerPhone = options?.profilePhone || cleanPhone
  const fullArgs = buildCompleteKioskCheckInArgs(cleanPhone, appointmentId, options)
  const minimalArgs = {
    caller_phone: cleanPhone,
    appointment_id: appointmentId,
  }

  if (options && (options.refreshmentPref || options.services?.length || options.addOns?.length)) {
    try {
      await saveKioskVisitDetails(callerPhone, appointmentId, options)
    } catch (detailError) {
      console.warn('Kiosk visit detail save failed:', detailError)
    }
  }

  let { data, error } = await supabase.rpc('complete_kiosk_check_in', fullArgs)

  if (error && Object.keys(fullArgs).length > 2) {
    const retry = await supabase.rpc('complete_kiosk_check_in', minimalArgs)
    data = retry.data
    error = retry.error
  }

  if (error) {
    if (isRpcNotFoundError(error)) {
      throw new Error(
        'Check-in completion is not set up in Supabase. Run sql/096_kiosk_checking_in_status.sql, sql/111_kiosk_check_in_fix.sql, and sql/113_kiosk_refreshment_inventory.sql in the SQL Editor.',
      )
    }
    throw error
  }

  const status = data?.appointment?.status
  if (status && status !== 'waiting') {
    throw new Error(`Check-in did not reach the lobby (status: ${status}). Run sql/111_kiosk_check_in_fix.sql in Supabase.`)
  }

  data = await ensureKioskRefreshmentDeducted(cleanPhone, appointmentId, options, data)

  return data
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

  const { data: inventoryItems, error: inventoryError } = await supabase
    .from('inventory')
    .select('id, quantity')
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

  const { error: stockError } = await supabase
    .from('inventory')
    .update({ quantity: Math.max((inventoryItem.quantity ?? 0) + quantityChanged, 0) })
    .eq('id', inventoryItem.id);

  if (stockError) throw stockError;
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
