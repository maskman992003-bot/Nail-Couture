export const LOYALTY_TIER_IDS = {
  PEARL: 'pearl',
  ATELIER: 'atelier',
  DIAMOND: 'diamond_couture',
};

export const TIER_CONFIG = {
  pearl: {
    id: 'pearl',
    name: 'Pearl',
    spendThreshold: 500,
    earnMultiplier: 1.0,
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
    earnMultiplier: 1.25,
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
    name: 'Diamond Couture',
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

export const VAULT_MILESTONES = [
  { points: 100, rewardLabel: '$5 reward', rewardValue: 5 },
  { points: 250, rewardLabel: '$15 reward', rewardValue: 15 },
  { points: 500, rewardLabel: '$35 reward', rewardValue: 35 },
  { points: 1000, rewardLabel: '$75 reward', rewardValue: 75 },
];

export const VAULT_MAX_POINTS = VAULT_MILESTONES.reduce(
  (max, milestone) => Math.max(max, milestone.points),
  0,
);

export function getVaultMaxPoints(milestones = VAULT_MILESTONES) {
  const source = milestones?.length ? milestones : VAULT_MILESTONES;
  return source.reduce((max, milestone) => Math.max(max, milestone.points ?? 0), 0) || VAULT_MAX_POINTS;
}

export const TIER_ORDER = ['pearl', 'atelier', 'diamond_couture'];

export function formatFoundingBadge(type, spot) {
  if (!type || spot == null) return null;
  if (type === 'vanguard') return `${String(spot).padStart(2, '0')}/25`;
  if (type === 'legacy') return `${spot}/250`;
  return null;
}

export function getTierConfig(tierId) {
  return TIER_CONFIG[tierId] || TIER_CONFIG.pearl;
}

export function getNextTier(tierId) {
  const idx = TIER_ORDER.indexOf(tierId);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}
