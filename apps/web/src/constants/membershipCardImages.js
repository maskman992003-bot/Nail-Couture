import pearlImage from '../assets/membership/001.png';
import atelierImage from '../assets/membership/002.png';
import diamondImage from '../assets/membership/003.png';
import { normalizeMembershipTierId } from '@nail-couture/shared/constants/membershipCardImages.js';

const WEB_MEMBERSHIP_CARD_IMAGES = {
  pearl: pearlImage,
  atelier: atelierImage,
  diamond_couture: diamondImage,
};

export function getMembershipCardWebSrc(tierId) {
  const key = normalizeMembershipTierId(tierId);
  return WEB_MEMBERSHIP_CARD_IMAGES[key] || WEB_MEMBERSHIP_CARD_IMAGES.pearl;
}
