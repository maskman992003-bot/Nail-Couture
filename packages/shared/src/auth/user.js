import { isStaffRole } from '../utils/routes.js';

export const AUTH_STORAGE_KEY = 'salon_user_data';

export function normalizeUser(profile) {
  const role = profile.role || 'customer';
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email || '',
    nail_goal: profile.nail_goal || '',
    refreshment_pref: profile.refreshment_pref || '',
    phone: profile.phone || '',
    birthday: profile.birthday || '',
    loyalty_points: profile.loyalty_points ?? 0,
    loyalty_tier: profile.loyalty_tier || 'regular_customer',
    loyalty_tier_earned: profile.loyalty_tier_earned || profile.loyalty_tier || 'regular_customer',
    rolling_spend_12m: profile.rolling_spend_12m ?? profile.calendar_spend_ytd ?? 0,
    calendar_spend_ytd: profile.rolling_spend_12m ?? profile.calendar_spend_ytd ?? 0,
    founding_type: profile.founding_type || null,
    founding_spot: profile.founding_spot ?? null,
    founding_awarded_at: profile.founding_awarded_at || null,
    tier_grace_until: profile.tier_grace_until || null,
    referral_code: profile.referral_code || '',
    avatar_url: profile.avatar_url || '',
    sms_reminders: profile.sms_reminders !== false,
    email_promotions: profile.email_promotions !== false,
    preferred_contact: profile.preferred_contact || 'phone',
    role,
    is_staff: isStaffRole(role),
    registration_complete: profile.registration_complete === true,
  };
}
