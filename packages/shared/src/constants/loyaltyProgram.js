export const LOYALTY_TIER_IDS = {
  REGULAR: 'regular_customer',
  PEARL: 'pearl',
  ATELIER: 'atelier',
  DIAMOND: 'diamond_couture',
};

export const TIER_CONFIG = {
  regular_customer: {
    id: 'regular_customer',
    name: 'Regular Customer',
    spendThreshold: 0,
    earnMultiplier: 1.0,
    bookingWindowDays: 0,
    color: '#9CA3AF',
    tagline: 'Welcome to Nail Couture.',
    benefits: [
      'Standard earn rate on visits',
      'Access to The Vault rewards',
      'Birthday promotions when eligible',
    ],
  },
  pearl: {
    id: 'pearl',
    name: 'Pearl',
    spendThreshold: 500,
    earnMultiplier: 1.1,
    bookingWindowDays: 0,
    color: '#E8E4DF',
    tagline: 'Your introduction to the Nail Couture experience.',
    benefits: [
      'Birthday gift ($10 reward)',
      'Exclusive seasonal promotions',
      'Save favorite nail colors in profile',
      'Early access to new color collections',
    ],
  },
  atelier: {
    id: 'atelier',
    name: 'Atelier',
    spendThreshold: 1500,
    earnMultiplier: 1.2,
    bookingWindowDays: 14,
    color: '#C17B6E',
    tagline: 'For clients who make self-care part of their lifestyle.',
    benefits: [
      'Everything in Pearl',
      'Priority waitlist placement',
      'Complimentary nail repair (1 per visit)',
      'Quarterly surprise gift',
      'Bring-a-friend bonus',
      'Exclusive Atelier events',
      'Book 14 days before public release',
    ],
  },
  diamond_couture: {
    id: 'diamond_couture',
    name: 'Diamond',
    spendThreshold: 3000,
    earnMultiplier: 1.5,
    bookingWindowDays: 30,
    color: '#1A1A1F',
    tagline: 'Reserved for our most valued clients.',
    benefits: [
      'Everything in Atelier',
      'Concierge priority booking',
      'First access to holiday appointments',
      'Complimentary upgrade 4× per year',
      'VIP birthday experience',
      'Private product previews',
      'Dedicated support',
      'Book 30 days before public release',
    ],
  },
};

/** Vault point expiry by tier at earn time (months) */
export const POINT_EXPIRY_MONTHS = {
  regular_customer: 3,
  pearl: 3,
  atelier: 6,
  diamond_couture: 12,
};

/** Birthday bonus points by tier (100 pts = $5 reward value) */
export const BIRTHDAY_BONUS_POINTS = {
  regular_customer: 0,
  pearl: 200,
  atelier: 300,
  diamond_couture: 500,
};

export const VAULT_MILESTONES = [
  { points: 100, rewardLabel: '$5 reward', rewardValue: 5 },
  { points: 250, rewardLabel: '$12 reward', rewardValue: 12 },
  { points: 500, rewardLabel: '$25 reward', rewardValue: 25 },
  { points: 1000, rewardLabel: '$60 reward', rewardValue: 60 },
];

export const VAULT_MAX_POINTS = VAULT_MILESTONES.reduce(
  (max, milestone) => Math.max(max, milestone.points),
  0,
);

export function getVaultMaxPoints(milestones = VAULT_MILESTONES) {
  const source = milestones?.length ? milestones : VAULT_MILESTONES;
  return source.reduce((max, milestone) => Math.max(max, milestone.points ?? 0), 0) || VAULT_MAX_POINTS;
}

export const TIER_ORDER = ['regular_customer', 'pearl', 'atelier', 'diamond_couture'];

/** First 25 checkout founding spots — Vanguard tier */
export const FOUNDING_VANGUARD_CAP = 25;
/** Legacy founding spots after Vanguard (26th–100th member overall) */
export const FOUNDING_LEGACY_CAP = 75;
/** Total founding program capacity */
export const FOUNDING_TOTAL_CAP = FOUNDING_VANGUARD_CAP + FOUNDING_LEGACY_CAP;

export function formatFoundingBadge(type, spot) {
  if (!type || spot == null) return null;
  const spotNumber = Number(spot);
  if (type === 'vanguard') {
    return `${String(spotNumber).padStart(2, '0')}/${FOUNDING_VANGUARD_CAP}`;
  }
  if (type === 'legacy') {
    const legacyIndex = spotNumber - FOUNDING_VANGUARD_CAP;
    if (legacyIndex < 1 || legacyIndex > FOUNDING_LEGACY_CAP) return null;
    return `${legacyIndex}/${FOUNDING_LEGACY_CAP}`;
  }
  return null;
}

export function getTierConfig(tierId) {
  return TIER_CONFIG[tierId] || TIER_CONFIG.regular_customer;
}

export function getNextTier(tierId) {
  const idx = TIER_ORDER.indexOf(tierId);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

export function getFoundingFloorTier(foundingType) {
  if (foundingType === 'vanguard') return LOYALTY_TIER_IDS.DIAMOND;
  if (foundingType === 'legacy') return LOYALTY_TIER_IDS.ATELIER;
  return null;
}
