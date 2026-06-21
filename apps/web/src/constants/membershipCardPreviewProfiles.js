import { TIER_ORDER } from '@nail-couture/shared/constants/loyaltyProgram.js';

/** Dummy profiles for dev membership-card layout tuning */
export const MEMBERSHIP_CARD_PREVIEW_PROFILES = {
  regular_customer: {
    full_name: 'Alex Regular',
    loyalty_tier: 'regular_customer',
    rolling_spend_12m: 250,
    calendar_spend_ytd: 250,
    founding_spot: null,
    founding_type: null,
  },
  pearl: {
    full_name: 'Alex Pearl',
    loyalty_tier: 'pearl',
    rolling_spend_12m: 650,
    calendar_spend_ytd: 650,
    founding_spot: null,
    founding_type: null,
  },
  atelier: {
    full_name: 'Alex Atelier',
    loyalty_tier: 'atelier',
    rolling_spend_12m: 1500,
    calendar_spend_ytd: 1500,
    founding_spot: null,
    founding_type: null,
  },
  diamond_couture: {
    full_name: 'Alex Diamond',
    loyalty_tier: 'diamond_couture',
    rolling_spend_12m: 3000,
    calendar_spend_ytd: 3000,
    founding_spot: null,
    founding_type: null,
  },
};

export const MEMBERSHIP_CARD_PREVIEW_TIERS = TIER_ORDER;

export function getMembershipCardPreviewProfile(tierId, { founding = false } = {}) {
  const base = MEMBERSHIP_CARD_PREVIEW_PROFILES[tierId] || MEMBERSHIP_CARD_PREVIEW_PROFILES.regular_customer;
  if (!founding) return base;
  return {
    ...base,
    founding_spot: 12,
    founding_type: 'vanguard',
  };
}
