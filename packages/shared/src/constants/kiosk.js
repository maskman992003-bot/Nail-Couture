import { CHECK_IN_ROLE } from '../utils/routes.js';

export const KIOSK_PHONE = '1118111888';

export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function isKioskPhone(phone) {
  return normalizePhone(phone) === KIOSK_PHONE;
}

export async function verifyKioskPin(supabase, profileId, pin) {
  const { data, error } = await supabase
    .from('profiles')
    .select('pin')
    .eq('id', profileId)
    .single();

  if (error) return false;
  return Boolean(data?.pin && data.pin === pin);
}

export async function fetchKioskProfile(supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, pin, role, full_name, phone')
    .eq('phone', KIOSK_PHONE)
    .eq('role', CHECK_IN_ROLE)
    .maybeSingle();

  if (error) throw error;
  return data;
}
