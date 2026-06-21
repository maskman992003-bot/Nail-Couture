import { getMembershipCardWebTextStyle } from './membershipCardLayout.js';

export { MEMBERSHIP_CARD_ASPECT_RATIO as GIFT_CARD_ASPECT_RATIO } from './membershipCardLayout.js';
export { MEMBERSHIP_CARD_HERO as GIFT_CARD_FRAME } from './membershipCardLayout.js';

/** Card-height-relative font sizes for web (container query units) */
export const GIFT_CARD_FONT = {
  balance: 'clamp(18px, 7.5cqh, 34px)',
  code: 'clamp(8px, 2.8cqh, 11px)',
  owner: 'clamp(8px, 3cqh, 10px)',
};

/**
 * Overlay layout for GIMP-exported gift card asset (000.png).
 * "GIFT CARD" branding is baked into the artwork — balance, code, and owner are dynamic.
 */
export const GIFT_CARD_LAYOUT = {
  positions: {
    balance: { top: '57%', left: '28%' },
    code: { top: '4.5%', left: '56%' },
    owner: { top: '77%', left: '16%' },
  },
  balance: {
    color: '#D4AF37',
    fontFamily: 'heading',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'none',
    fontSizeWeb: GIFT_CARD_FONT.balance,
  },
  code: {
    color: '#C9A227',
    fontFamily: 'body',
    fontWeight: 500,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontSizeWeb: GIFT_CARD_FONT.code,
  },
  owner: {
    color: 'rgba(212, 175, 55, 0.85)',
    fontFamily: 'body',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'none',
    fontSizeWeb: GIFT_CARD_FONT.owner,
  },
  textShadow: '0 1px 2px rgba(0,0,0,0.55), 0 0 5px rgba(0,0,0,0.35)',
};

export function getGiftCardLayout() {
  return GIFT_CARD_LAYOUT;
}

export function getGiftCardWebTextStyle(fieldStyle) {
  return getMembershipCardWebTextStyle(fieldStyle);
}

export function formatGiftCardBalance(balance) {
  if (balance == null || !Number.isFinite(Number(balance))) return '$—';
  return `$${Number(balance).toFixed(2)}`;
}

export function getGiftCardAlt({ ownerName }) {
  const name = ownerName?.trim();
  return name
    ? `${name} — Nail Couture gift card`
    : 'Nail Couture gift card';
}
