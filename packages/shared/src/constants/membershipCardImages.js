/** Static membership card artwork paths (web: public URL, mobile: require()) */
export const MEMBERSHIP_CARD_IMAGES = {
  pearl: {
    web: '/membership/pearl-member.png',
    mobile: 'pearl-member.png',
    alt: 'Nail Couture Pearl Member card',
  },
  atelier: {
    web: '/membership/pearl-member.png',
    mobile: 'pearl-member.png',
    alt: 'Nail Couture Atelier Member card',
  },
  diamond_couture: {
    web: '/membership/pearl-member.png',
    mobile: 'pearl-member.png',
    alt: 'Nail Couture Diamond Couture Member card',
  },
};

export function getMembershipCardImage(tierId) {
  return MEMBERSHIP_CARD_IMAGES[tierId] || MEMBERSHIP_CARD_IMAGES.pearl;
}
