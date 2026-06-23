import { normalizeMembershipTierId } from './membershipCardImages.js';
import { formatFoundingBadge } from './loyaltyProgram.js';
export const MEMBERSHIP_CARD_ASPECT_RATIO = 1.586;

/** Compact hero card dimensions (beside profile avatar) */
export const MEMBERSHIP_CARD_HERO = {
  heightPx: 116,
  borderRadiusPx: 20,
};

export function getMembershipCardHeroWidth() {
  return Math.round(MEMBERSHIP_CARD_HERO.heightPx * MEMBERSHIP_CARD_ASPECT_RATIO);
}

/** Space reserved at card bottom when founding badge is shown (overlay padding) */
export const MEMBERSHIP_CARD_FOUNDING_RESERVE = '28%';

/** Founding wax seal inset from card edges (ratio of card height + minimum px) */
export const MEMBERSHIP_CARD_FOUNDING_SEAL_INSET = {
  top: { ratio: 0.008, minPx: 2 },
  right: { ratio: 0.04, minPx: 16 },
};

export function getMembershipCardFoundingSealInset(cardHeightPx) {
  const height = cardHeightPx || MEMBERSHIP_CARD_HERO.heightPx;
  return {
    top: Math.max(
      MEMBERSHIP_CARD_FOUNDING_SEAL_INSET.top.minPx,
      height * MEMBERSHIP_CARD_FOUNDING_SEAL_INSET.top.ratio,
    ),
    right: Math.max(
      MEMBERSHIP_CARD_FOUNDING_SEAL_INSET.right.minPx,
      height * MEMBERSHIP_CARD_FOUNDING_SEAL_INSET.right.ratio,
    ),
  };
}

/** Card-height-relative font sizes for web (container query units — CSS fallback) */
export const MEMBERSHIP_CARD_FONT = {
  name: 'clamp(6px, 4.2cqh, 17px)',
  id: 'clamp(5px, 3.2cqh, 10px)',
  founding: 'clamp(8px, 5.2cqh, 14px)',
};

/** Default font scale ratios (% of card height) with px bounds */
export const MEMBERSHIP_CARD_FIELD_FONT = {
  name: { ratio: 0.042, min: 6, max: 17 },
  id: { ratio: 0.032, min: 5, max: 10 },
  founding: { ratio: 0.052, min: 8, max: 14 },
};

/** Max width for name overlay as fraction of card width (leaves room for seal) */
export const MEMBERSHIP_CARD_NAME_MAX_WIDTH = 0.58;

/** Minimum font scale when shrinking long names to fit */
export const MEMBERSHIP_CARD_NAME_MIN_SCALE = 0.65;

/** Resolve font scale config for a field, with optional per-tier overrides */
export function getMembershipCardFieldFontScale(tierId, fieldKey) {
  const layout = getMembershipCardLayout(tierId);
  const fieldStyle = fieldKey === 'id' ? layout.id : fieldKey === 'founding' ? null : layout.name;
  const defaults = MEMBERSHIP_CARD_FIELD_FONT[fieldKey] || MEMBERSHIP_CARD_FIELD_FONT.name;
  return fieldStyle?.fontScale || defaults;
}

/** Compute pixel font size for one overlay field */
export function getMembershipCardFieldFontSize(cardHeightPx, fieldKey, tierId) {
  const height = cardHeightPx || MEMBERSHIP_CARD_HERO.heightPx;
  const { ratio, min, max } = getMembershipCardFieldFontScale(tierId, fieldKey);
  return Math.min(max, Math.max(min, height * ratio));
}

/** Compute pixel font sizes from measured card height */
export function getMembershipCardFontSizes(cardHeightPx, tierId) {
  const height = cardHeightPx || MEMBERSHIP_CARD_HERO.heightPx;
  const resolvedTier = tierId || 'pearl';
  return {
    name: getMembershipCardFieldFontSize(height, 'name', resolvedTier),
    id: getMembershipCardFieldFontSize(height, 'id', resolvedTier),
    founding: getMembershipCardFieldFontSize(height, 'founding', resolvedTier),
    seal: Math.min(88, Math.max(56, height * 0.20)),
  };
}

/**
 * Per-tier overlay layout for GIMP-exported card assets.
 * Adjust `positions` top/left percentages to align with clear zones on each PNG.
 *
 * Tier names (PEARL, ATELIER, DIAMOND COUTURE) are baked into the artwork —
 * only member name and ID are rendered dynamically.
 */
export const MEMBERSHIP_CARD_TIER_LAYOUT = {
  pearl: {
    positions: {
      name: { top: '57%', left: '18%' },
      id: { top: '65%', left: '38%' },
    },
    name: {
      color: '#D4AF37',
      fontFamily: 'heading',
      fontWeight: 600,
      letterSpacing: '0.08em',
      letterSpacingMobile: 0.8,
      textTransform: 'uppercase',
      fontSizeWeb: MEMBERSHIP_CARD_FONT.name,
      fontSizeMobile: 9,
    },
    id: {
      color: '#B8960C',
      fontFamily: 'body',
      fontWeight: 500,
      letterSpacing: '0.16em',
      letterSpacingMobile: 1,
      textTransform: 'uppercase',
      fontSizeWeb: MEMBERSHIP_CARD_FONT.id,
      fontSizeMobile: 7,
    },
    textShadow: '0 1px 2px rgba(0,0,0,0.45), 0 0 5px rgba(255,255,255,0.25)',
  },
  atelier: {
    positions: {
      name: { top: '53%', left: '20%' },
      id: { top: '60%', left: '45%' },
    },
    name: {
      color: '#C8895A',
      fontFamily: 'heading',
      fontWeight: 600,
      letterSpacing: '0.1em',
      letterSpacingMobile: 1,
      textTransform: 'uppercase',
      fontSizeWeb: MEMBERSHIP_CARD_FONT.name,
      fontSizeMobile: 8.5,
    },
    id: {
      color: '#9A6840',
      fontFamily: 'body',
      fontWeight: 500,
      letterSpacing: '0.18em',
      letterSpacingMobile: 1.2,
      textTransform: 'uppercase',
      fontSizeWeb: MEMBERSHIP_CARD_FONT.id,
      fontSizeMobile: 6.5,
    },
    textShadow: '0 1px 3px rgba(0,0,0,0.65), 0 0 6px rgba(0,0,0,0.35)',
  },
  diamond_couture: {
    positions: {
      name: { top: '58%', left: '23%' },
      id: { top: '22%', right: '3%', textAlign: 'right' },
    },
    name: {
      color: '#F4F4F6',
      fontFamily: "'Playfair Display', serif",
      fontWeight: 400,
      letterSpacing: '.20em',
      letterSpacingMobile: 1.5,
      textTransform: 'uppercase',
      fontSizeWeb: MEMBERSHIP_CARD_FONT.name,
      fontSizeMobile: 9,
      textShadow: '1px 1px 0px rgba(0,0,0,0.5), -1px -1px 0px rgba(255,255,255,0.1)',
    },
    id: {
      color: '#FFFFFF',
      fontFamily: "'Montserrat', sans-serif",
      fontWeight: 500,
      letterSpacing: '0.22em',
      letterSpacingMobile: 1.5,
      textTransform: 'uppercase',
      fontSizeWeb: 'clamp(6px, 3.8cqh, 12px)',
      fontSizeMobile: 8,
      fontScale: { ratio: 0.038, min: 6, max: 12 },
      textStroke: '0.6px rgba(0,0,0,0.95)',
      textShadow:
        '-1px -1px 0 rgba(0,0,0,0.95), 1px -1px 0 rgba(0,0,0,0.95), -1px 1px 0 rgba(0,0,0,0.95), 1px 1px 0 rgba(0,0,0,0.95), 0 -1px 0 rgba(0,0,0,0.95), 0 1px 0 rgba(0,0,0,0.95), -1px 0 0 rgba(0,0,0,0.95), 1px 0 0 rgba(0,0,0,0.95)',
    },
    textShadow: '1px 1px 0px rgba(0,0,0,0.5), -1px -1px 0px rgba(255,255,255,0.1)',
  },
};

/** @deprecated Use getMembershipCardLayout(tierId).positions */
export const MEMBERSHIP_CARD_TEXT_POSITIONS = MEMBERSHIP_CARD_TIER_LAYOUT.pearl.positions;

/** @deprecated Use tier layout name.color */
export const MEMBERSHIP_CARD_GOLD = '#D4AF37';

/** @deprecated Use tier layout textShadow */
export const MEMBERSHIP_CARD_TEXT_SHADOW =
  '0 1px 2px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.35)';

const WEB_FONT_FAMILIES = {
  heading: "'Playfair Display', Georgia, serif",
  body: "'Inter', system-ui, sans-serif",
};

const MOBILE_FONT_FAMILIES = {
  heading: 'Playfair Display',
  body: 'System',
};

export function getMembershipCardLayout(tierId) {
  const key = normalizeMembershipTierId(tierId);
  return MEMBERSHIP_CARD_TIER_LAYOUT[key] || MEMBERSHIP_CARD_TIER_LAYOUT.pearl;
}

export function getMembershipCardWebTextStyle(fieldStyle, cardHeightPx, fieldKey, tierId) {
  const fontFamily = WEB_FONT_FAMILIES[fieldStyle.fontFamily]
    || (fieldStyle.fontFamily?.includes("'") || fieldStyle.fontFamily?.includes(',')
      ? fieldStyle.fontFamily
      : WEB_FONT_FAMILIES.heading);

  const fontSize = cardHeightPx && fieldKey
    ? getMembershipCardFieldFontSize(cardHeightPx, fieldKey, tierId)
    : fieldStyle.fontSizeWeb;

  return {
    color: fieldStyle.color,
    fontFamily,
    fontWeight: fieldStyle.fontWeight,
    letterSpacing: fieldStyle.letterSpacing,
    textTransform: fieldStyle.textTransform,
    fontSize,
    ...(fieldStyle.border && { border: fieldStyle.border, display: 'inline-block' }),
    ...(fieldStyle.borderRadius && { borderRadius: fieldStyle.borderRadius }),
    ...(fieldStyle.padding && { padding: fieldStyle.padding }),
    ...(fieldStyle.textStroke && {
      WebkitTextStroke: fieldStyle.textStroke,
      paintOrder: 'stroke fill',
    }),
  };
}

export function getMembershipCardMobileTextStyle(fieldStyle, cardHeightPx, fieldKey, tierId) {
  const fontSize = cardHeightPx && fieldKey
    ? getMembershipCardFieldFontSize(cardHeightPx, fieldKey, tierId)
    : fieldStyle.fontSizeMobile;

  return {
    color: fieldStyle.color,
    fontFamily: MOBILE_FONT_FAMILIES[fieldStyle.fontFamily] || MOBILE_FONT_FAMILIES.heading,
    fontWeight: fieldStyle.fontWeight,
    letterSpacing: fieldStyle.letterSpacingMobile ?? 1,
    textTransform: fieldStyle.textTransform,
    fontSize,
    ...(fieldStyle.border && {
      borderWidth: 1,
      borderColor: 'rgba(212, 175, 55, 0.9)',
      alignSelf: 'flex-start',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    }),
  };
}

/** Founding member number for card overlay (e.g. 01/25 or 42/75) */
export function getMembershipCardMemberId(profile) {
  const badge = formatFoundingBadge(profile?.founding_type, profile?.founding_spot);
  if (!badge) return '—';
  return badge;
}

/** Display member ID line on the card */
export function formatMembershipCardId(id) {
  const value = String(id || '').trim();
  if (!value || value === '—') return '—';
  return value;
}

export function getMembershipCardAlt({ name, tier }) {
  const displayName = name?.trim() || 'Member';
  const tierLabel = tier?.trim() || 'membership';
  return `${displayName} — Nail Couture ${tierLabel} membership card`;
}
