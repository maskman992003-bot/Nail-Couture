import pearlMemberCard from '../assets/membership/pearl-member.png';

/** Bundled card artwork URLs for web (Vite resolves these at build time). */
export const WEB_MEMBERSHIP_CARD_SRC = {
  pearl: pearlMemberCard,
  atelier: pearlMemberCard,
  diamond_couture: pearlMemberCard,
};

export function getWebMembershipCardSrc(tierId) {
  return WEB_MEMBERSHIP_CARD_SRC[tierId] || WEB_MEMBERSHIP_CARD_SRC.pearl;
}
