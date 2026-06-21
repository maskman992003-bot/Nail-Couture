/** Static membership card artwork paths (web: public URL, mobile: require()) */
export const MEMBERSHIP_CARD_IMAGES = {
  pearl: {
    web: '/membership/pearl.png',
    mobile: 'pearl.png',
    alt: 'Nail Couture Pearl Member card',
  },
  atelier: {
    web: '/membership/atelier.png',
    mobile: 'atelier.png',
    alt: 'Nail Couture Atelier Member card',
  },
  diamond_couture: {
    web: '/membership/diamond.png',
    mobile: 'diamond.png',
    alt: 'Nail Couture Diamond Couture Member card',
  },
};

/** Map profile tier ids / legacy values to a known membership card key. */
export function normalizeMembershipTierId(tierId) {
  if (!tierId) return 'pearl';

  const normalized = String(tierId).toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (MEMBERSHIP_CARD_IMAGES[normalized]) return normalized;
  if (normalized.includes('diamond')) return 'diamond_couture';
  if (normalized.includes('atelier')) return 'atelier';
  return 'pearl';
}

export function getMembershipCardImage(tierId) {
  const key = normalizeMembershipTierId(tierId);
  return MEMBERSHIP_CARD_IMAGES[key] || MEMBERSHIP_CARD_IMAGES.pearl;
}

export function getMembershipCardWebSrc(tierId) {
  return getMembershipCardImage(tierId).web;
}
