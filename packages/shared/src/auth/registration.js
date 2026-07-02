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
