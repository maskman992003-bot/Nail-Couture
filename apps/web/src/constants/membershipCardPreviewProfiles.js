import { TIER_ORDER } from '@nail-couture/shared/constants/loyaltyProgram.js';

/** Dummy profiles for dev membership-card layout tuning */
export const MEMBERSHIP_CARD_PREVIEW_PROFILES = {
  pearl: {
    full_name: 'Alex Pearl',
    loyalty_tier: 'pearl',
    calendar_spend_ytd: 250,
    founding_spot: null,
    founding_type: null,
  },
  atelier: {
    full_name: 'Alex Atelier',
    loyalty_tier: 'atelier',
    calendar_spend_ytd: 1500,
    founding_spot: null,
    founding_type: null,
  },
  diamond_couture: {
    full_name: 'Alex Diamond',
    loyalty_tier: 'diamond_couture',
    calendar_spend_ytd: 3000,
    founding_spot: null,
    founding_type: null,
  },
};

export const MEMBERSHIP_CARD_PREVIEW_TIERS = TIER_ORDER;

export function getMembershipCardPreviewProfile(tierId, { founding = false } = {}) {
  const base = MEMBERSHIP_CARD_PREVIEW_PROFILES[tierId] || MEMBERSHIP_CARD_PREVIEW_PROFILES.pearl;
  if (!founding) return base;
  return {
    ...base,
    founding_spot: 12,
    founding_type: 'vanguard',
  };
}
