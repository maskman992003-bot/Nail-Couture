import { supabase } from '../lib/supabase.js';

function mapRpcError(error, data) {
  if (data?.error === 'forbidden') {
    return 'Only super admins can manage stuck kiosk check-ins.';
  }
  if (data?.error === 'invalid_action') {
    return 'Invalid action. Use cancel or move_to_waiting.';
  }
  if (error?.message) {
    if (error.message.includes('get_stuck_kiosk_check_ins') || error.message.includes('clear_stuck_kiosk_check_ins')) {
      return 'Stuck check-in tools are not set up. Run sql/112_clear_stuck_kiosk_check_ins.sql in Supabase.';
    }
    return error.message;
  }
  return data?.error || 'Request failed';
}

export async function fetchStuckKioskCheckIns(callerPhone) {
  if (!callerPhone) {
    return { success: false, error: 'missing_caller_phone', appointments: [] };
  }

  const { data, error } = await supabase.rpc('get_stuck_kiosk_check_ins', {
    caller_phone: callerPhone,
  });

  if (error || data?.success === false) {
    return {
      success: false,
      error: mapRpcError(error, data),
      appointments: [],
      count: 0,
    };
  }

  return {
    success: true,
    appointments: data?.appointments || [],
    count: data?.count ?? (data?.appointments?.length || 0),
    checkingInCount: data?.checking_in_count ?? 0,
    waitingCount: data?.waiting_count ?? 0,
  };
}

export async function clearStuckKioskCheckIns(callerPhone, action = 'cancel', appointmentIds = null) {
  if (!callerPhone) {
    return { success: false, error: 'missing_caller_phone', affected_count: 0 };
  }

  const { data, error } = await supabase.rpc('clear_stuck_kiosk_check_ins', {
    caller_phone: callerPhone,
    p_action: action,
    p_appointment_ids: appointmentIds?.length ? appointmentIds : null,
  });

  if (error || data?.success === false) {
    return {
      success: false,
      error: mapRpcError(error, data),
      affected_count: 0,
    };
  }

  return {
    success: true,
    action: data?.action,
    affected_count: data?.affected_count ?? 0,
    appointments: data?.appointments || [],
  };
}
