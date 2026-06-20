import { TIER_CONFIG } from '../constants/loyaltyProgram.js';
import {
  buildMembershipFillCss,
  getMembershipCardTheme,
  MEMBERSHIP_CARD_THEMES,
} from './membershipCardThemes.js';

/** @deprecated Prefer membershipCardThemes.js — kept for wallet deck compatibility */
export const TIER_HERO_STYLES = {
  pearl: {
    gradient: 'linear-gradient(135deg, #FAF8F5 0%, #F0EBE6 40%, #E8DFE8 70%, #DFE8F0 100%)',
    titleColor: '#3D3D3D',
    borderColors: ['#C5A059', '#8B6914'],
    gradientStops: [
      { offset: '0%', color: '#FAF8F5' },
      { offset: '40%', color: '#F0EBE6' },
      { offset: '70%', color: '#E8DFE8' },
      { offset: '100%', color: '#DFE8F0' },
    ],
  },
  atelier: {
    gradient: 'linear-gradient(145deg, #D4A574 0%, #C9897A 45%, #B8735A 100%)',
    titleColor: '#4A2C24',
    borderColors: ['#C5A059', '#8B6914'],
    gradientStops: [
      { offset: '0%', color: '#D4A574' },
      { offset: '45%', color: '#C9897A' },
      { offset: '100%', color: '#B8735A' },
    ],
  },
  diamond_couture: {
    gradient: 'linear-gradient(160deg, #1A1A22 0%, #121218 50%, #0A0A0E 100%)',
    titleColor: '#E8E8EC',
    borderColors: ['#A8C8FF', '#7080A0'],
    gradientStops: [
      { offset: '0%', color: '#1A1A22' },
      { offset: '50%', color: '#121218' },
      { offset: '100%', color: '#0A0A0E' },
    ],
  },
};

export function getTierHeroStyle(tierId) {
  return TIER_HERO_STYLES[tierId] || TIER_HERO_STYLES.pearl;
}

export function getTierHeroCopy(tierId) {
  const config = TIER_CONFIG[tierId] || TIER_CONFIG.pearl;
  return {
    title: config.name.toUpperCase(),
    subtitle: 'Private Member',
    tagline: config.tagline,
  };
}

/** @deprecated Use getMembershipCardTheme from membershipCardThemes.js */
export function getMembershipHeroTheme(tierId, options = {}) {
  const theme = getMembershipCardTheme(tierId, options);
  const cardTheme = MEMBERSHIP_CARD_THEMES[tierId] || MEMBERSHIP_CARD_THEMES.pearl;
  return {
    background: buildMembershipFillCss(theme),
    gradientStops: cardTheme.fillLayers.find((l) => l.type === 'linear')?.stops?.map((s) => ({
      offset: `${Math.round(s.offset * 100)}%`,
      color: s.color,
    })) || [],
    borderColor: theme.insetBorder,
    boxShadow: theme.boxShadow,
    titleColor: theme.brandColor,
    titleGradient: tierId === 'diamond_couture'
      ? `linear-gradient(180deg, ${theme.metallicGradient.join(', ')})`
      : null,
    subtitleColor: theme.subtitleColor,
  };
}

export { getMembershipCardTheme, buildMembershipFillCss } from './membershipCardThemes.js';
