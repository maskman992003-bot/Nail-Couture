import { supabase } from '../lib/supabase';

export async function fetchLobbyAutoAssignEnabled() {
  try {
    const { data, error } = await supabase.rpc('get_lobby_auto_assign_enabled');
    if (error) {
      if (error.message?.includes('get_lobby_auto_assign_enabled')) {
        return { enabled: true, error: null };
      }
      return { enabled: true, error: error.message };
    }
    return { enabled: data !== false, error: null };
  } catch {
    return { enabled: true, error: null };
  }
}

export async function setLobbyAutoAssignEnabled(callerPhone, enabled) {
  if (!callerPhone) return { success: false, error: 'Missing phone' };
  try {
    const { data, error } = await supabase.rpc('set_lobby_auto_assign_enabled', {
      caller_phone: callerPhone,
      p_enabled: enabled,
    });
    if (error) {
      if (error.message?.includes('set_lobby_auto_assign_enabled')) {
        return { success: false, error: 'Run sql/128_lobby_auto_assign_toggle.sql in Supabase.' };
      }
      return { success: false, error: error.message };
    }
    return {
      success: Boolean(data?.success),
      enabled: data?.enabled ?? enabled,
      dispatch: data?.dispatch,
      error: null,
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update auto-assign' };
  }
}
