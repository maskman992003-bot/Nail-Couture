import { supabase } from '../lib/supabase';

export const WORKSTATION_AVAILABLE = 'available';
export const WORKSTATION_ON_BREAK = 'on_break';

export function getWorkstationStatus(preferences) {
  if (!preferences || typeof preferences !== 'object') return WORKSTATION_AVAILABLE;
  return preferences.workstation_status === WORKSTATION_ON_BREAK
    ? WORKSTATION_ON_BREAK
    : WORKSTATION_AVAILABLE;
}

export async function fetchWorkstationStatus(profileId) {
  if (!profileId) {
    return { status: WORKSTATION_AVAILABLE, preferences: {} };
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', profileId)
      .single();
    if (error) {
      return { status: WORKSTATION_AVAILABLE, preferences: {} };
    }
    const preferences = data?.preferences || {};
    return { status: getWorkstationStatus(preferences), preferences };
  } catch {
    return { status: WORKSTATION_AVAILABLE, preferences: {} };
  }
}

export async function setWorkstationStatus(profileId, status, currentPreferences = {}) {
  if (!profileId) return { success: false, error: 'Missing profile' };
  const prefs = { ...(currentPreferences || {}), workstation_status: status };
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ preferences: prefs })
      .eq('id', profileId);
    if (error) {
      if (error.message?.includes('preferences')) {
        return { success: false, error: 'Run sql/023_add_profile_preferences.sql in Supabase.' };
      }
      return { success: false, error: error.message };
    }
    return { success: true, preferences: prefs };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update status' };
  }
}
