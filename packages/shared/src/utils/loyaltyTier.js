import {
  getNextTier,
  getTierConfig,
  TIER_CONFIG,
  formatFoundingBadge,
  getFoundingFloorTier,
} from '../constants/loyaltyProgram.js';

/** @deprecated Use TIER_CONFIG from loyaltyProgram.js */
export const tierDetails = {
  Silver: { points: 0, next: 100, reward: 'Gold status (10% off + free refreshment)' },
  Gold: { points: 100, next: 500, reward: 'Platinum status (15% off + priority booking + free refreshment)' },
  Platinum: { points: 500, next: 1000, reward: 'Diamond status (20% off + VIP priority + free premium service)' },
  Diamond: { points: 1000, next: null, reward: 'Maximum tier — enjoy all premium perks!' },
};

/**
 * Resolve tier display info from a profile object (preferred) or legacy points number.
 */
export function getTierInfo(input) {
  if (input && typeof input === 'object') {
    return getTierFromProfile(input);
  }
  return getTierFromLegacyPoints(input || 0);
}

export function resolveRollingSpend(profile) {
  return Number(
    profile?.rolling_spend_12m
    ?? profile?.calendar_spend_ytd
    ?? 0,
  ) || 0;
}

function resolveFmFloor(profile) {
  const active = Boolean(profile?.fm_floor_active);
  const until = profile?.fm_floor_until || null;
  if (active && until) {
    return { fmFloorActive: true, fmFloorUntil: until };
  }

  const awardedAt = profile?.founding_awarded_at;
  const foundingType = profile?.founding_type;
  if (!profile?.founding_spot || !awardedAt || !foundingType) {
    return { fmFloorActive: false, fmFloorUntil: null };
  }

  const floorUntil = new Date(awardedAt);
  floorUntil.setFullYear(floorUntil.getFullYear() + 1);
  const floorActive = floorUntil.getTime() > Date.now();

  return {
    fmFloorActive: floorActive,
    fmFloorUntil: floorActive ? floorUntil.toISOString() : null,
    fmFloorTier: floorActive ? getFoundingFloorTier(foundingType) : null,
  };
}

function getTierFromProfile(profile) {
  const tierId = profile.loyalty_tier || 'regular_customer';
  const earnedTierId = profile.loyalty_tier_earned || profile.tier_earned || tierId;
  const config = getTierConfig(tierId);
  const earnedConfig = getTierConfig(earnedTierId);
  const nextTierId = getNextTier(tierId);
  const nextConfig = nextTierId ? getTierConfig(nextTierId) : null;
  const spend = resolveRollingSpend(profile);
  const nextThreshold = nextConfig?.spendThreshold ?? null;
  const progress = nextThreshold != null
    ? Math.min(100, (spend / nextThreshold) * 100)
    : 100;

  const fm = resolveFmFloor(profile);

  return {
    id: tierId,
    name: config.name,
    earnedTierId,
    earnedTierName: earnedConfig.name,
    color: `text-[${config.color}]`,
    hexColor: config.color,
    benefit: config.benefits[0] || config.tagline,
    tagline: config.tagline,
    benefits: config.benefits,
    earnMultiplier: config.earnMultiplier,
    nextTier: nextConfig?.name || null,
    nextTierId,
    nextThreshold,
    progress,
    rollingSpend: spend,
    calendarSpend: spend,
    isFounding: Boolean(profile.founding_spot),
    foundingBadge: formatFoundingBadge(profile.founding_type, profile.founding_spot),
    hasMembershipCard: tierId !== 'regular_customer',
    ...fm,
    fmFloorTier: fm.fmFloorTier || (fm.fmFloorActive ? getFoundingFloorTier(profile.founding_type) : null),
  };
}

/** Legacy points-based tiers for callers not yet on wallet v2 */
function getTierFromLegacyPoints(points) {
  const pts = points || 0;
  if (pts >= 1000) {
    return {
      id: 'diamond_couture',
      name: 'Diamond',
      color: 'text-cyan-400',
      hexColor: TIER_CONFIG.diamond_couture.color,
      benefit: TIER_CONFIG.diamond_couture.benefits[0],
      nextTier: null,
      nextThreshold: null,
      progress: 100,
      hasMembershipCard: true,
    };
  }
  if (pts >= 500) {
    return {
      id: 'atelier',
      name: 'Atelier',
      color: 'text-gray-300',
      hexColor: TIER_CONFIG.atelier.color,
      benefit: TIER_CONFIG.atelier.benefits[0],
      nextTier: 'Diamond',
      nextThreshold: 1000,
      progress: ((pts - 500) / 500) * 100,
      hasMembershipCard: true,
    };
  }
  if (pts >= 100) {
    return {
      id: 'pearl',
      name: 'Pearl',
      color: 'text-gold',
      hexColor: TIER_CONFIG.pearl.color,
      benefit: TIER_CONFIG.pearl.benefits[0],
      nextTier: 'Atelier',
      nextThreshold: 500,
      progress: ((pts - 100) / 400) * 100,
      hasMembershipCard: true,
    };
  }
  return {
    id: 'regular_customer',
    name: 'Regular Customer',
    color: 'text-gray-400',
    hexColor: TIER_CONFIG.regular_customer.color,
    benefit: TIER_CONFIG.regular_customer.benefits[0],
    nextTier: 'Pearl',
    nextThreshold: 500,
    progress: (pts / 100) * 100,
    hasMembershipCard: false,
  };
}

export function generateReferralCode(fullName) {
  const cleanName = (fullName || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${random}`;
}

export function isBirthdayMonth(birthday) {
  if (!birthday) return false;
  const month = birthday.split('-')[0];
  const now = new Date();
  return month === String(now.getMonth() + 1).padStart(2, '0');
}

export function getTierBenefitsList(tierInfo) {
  if (!tierInfo) return [];
  if ('benefits' in tierInfo && Array.isArray(tierInfo.benefits) && tierInfo.benefits.length > 0) {
    return tierInfo.benefits;
  }
  return tierInfo.benefit ? [tierInfo.benefit] : [];
}
