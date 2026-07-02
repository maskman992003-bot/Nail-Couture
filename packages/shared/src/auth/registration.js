export function isRegistrationComplete(profile) {
  if (!profile) return false;

  if (profile.registration_complete === true) return true;
  if (profile.registration_complete === false) return false;

  // Fallback for rows before migration 130
  return Boolean(
    profile.full_name?.trim()
    && profile.phone?.trim()
    && profile.email?.trim()
    && profile.birthday?.trim(),
  );
}

export function needsRegistrationCompletion(profile) {
  if (!profile) return true;
  const role = profile.role || 'customer';
  if (role !== 'customer') return false;
  return !isRegistrationComplete(profile);
}

export function generateCustomerReferralCode(name) {
  const cleanName = (name || 'CUST').replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${random}`;
}

function normalizeCallerPhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

function isRpcNotFoundError(error) {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  return (
    error.code === '42883'
    || error.code === 'PGRST202'
    || message.includes('could not find the function')
  );
}

const REGISTRATION_RPC_HINT =
  'Customer registration RPC is not set up in Supabase. Run sql/131_customer_registration_rpc.sql in the SQL Editor.';

/**
 * Complete an incomplete customer profile (kiosk or portal). Uses SECURITY DEFINER RPC
 * because anon clients cannot UPDATE profiles under RLS.
 */
export async function completeCustomerRegistration(supabase, phone, fields = {}) {
  const cleanPhone = normalizeCallerPhone(phone);
  const { data, error } = await supabase.rpc('complete_customer_registration', {
    caller_phone: cleanPhone,
    p_full_name: fields.fullName ?? null,
    p_email: fields.email ?? null,
    p_birthday: fields.birthday ?? null,
    p_nail_goal: fields.nailGoal ?? null,
    p_refreshment_pref: fields.refreshmentPref ?? null,
    p_referral_code: fields.referralCode ?? null,
  });

  if (error) {
    if (isRpcNotFoundError(error)) {
      throw new Error(REGISTRATION_RPC_HINT);
    }
    throw error;
  }

  return data?.profile ?? data;
}

/**
 * Save kiosk visit service selections on an existing checking_in appointment.
 */
export async function updateKioskAppointmentServices(supabase, phone, appointmentId, payload = {}) {
  const cleanPhone = normalizeCallerPhone(phone);
  const { error } = await supabase.rpc('update_my_appointment', {
    caller_phone: cleanPhone,
    appointment_id: appointmentId,
    p_service_id: payload.serviceId ?? null,
    p_add_ons: payload.addOns ?? null,
    p_selected_service_names: payload.selectedServiceNames ?? null,
    p_final_price: payload.finalPrice ?? null,
    p_refreshment_pref: payload.refreshmentPref ?? null,
  });

  if (error) {
    if (isRpcNotFoundError(error)) {
      throw new Error(
        'Kiosk appointment update is not set up in Supabase. Run sql/131_customer_registration_rpc.sql in the SQL Editor.',
      );
    }
    throw error;
  }

  return { id: appointmentId };
}
