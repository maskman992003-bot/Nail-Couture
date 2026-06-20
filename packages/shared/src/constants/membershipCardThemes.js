import { TIER_CONFIG } from './loyaltyProgram.js';

export const MEMBERSHIP_CARD_PARALLAX = {
  fill: 8,
  decor: 14,
  border: 3,
};

const METALLIC_ROSE = {
  light: '#FFD3D9',
  mid: '#C9897A',
  dark: '#8B5E4A',
  deep: '#B76E79',
};

const PEARL_THEME = {
  id: 'pearl',
  aspectRatio: 1.58,
  minHeight: 200,
  outerBorder: '#F5F5F0',
  outerBorderWidth: 3,
  insetBorder: METALLIC_ROSE.mid,
  insetBorderWidth: 1,
  insetPadding: 10,
  fillLayers: [
    { type: 'radial', cx: '28%', cy: '18%', rx: '55%', ry: '45%', color: 'rgba(255,240,245,0.95)' },
    { type: 'radial', cx: '72%', cy: '78%', rx: '50%', ry: '42%', color: 'rgba(210,225,255,0.75)' },
    { type: 'radial', cx: '48%', cy: '52%', rx: '65%', ry: '55%', color: 'rgba(232,215,255,0.55)' },
    { type: 'radial', cx: '82%', cy: '28%', rx: '35%', ry: '30%', color: 'rgba(200,245,235,0.45)' },
    { type: 'linear', angle: 135, stops: [
      { offset: 0, color: '#F5F5F0' },
      { offset: 0.35, color: '#E8D7FF' },
      { offset: 0.65, color: '#FFF0F5' },
      { offset: 1, color: '#E0F5F0' },
    ] },
  ],
  metallicGradient: ['#FFD3D9', '#C9897A', '#8B5E4A', '#B76E79'],
  brandColor: METALLIC_ROSE.dark,
  tierScriptColor: METALLIC_ROSE.deep,
  subtitleColor: 'rgba(139,94,74,0.85)',
  accentColor: METALLIC_ROSE.mid,
  decorOpacity: 0.72,
  shadow: '0 12px 40px rgba(139,94,74,0.18), 0 2px 8px rgba(0,0,0,0.06)',
  foundingGlow: '0 0 28px rgba(197,160,89,0.28), inset 0 0 0 1px rgba(197,160,89,0.15)',
};

const ATELIER_THEME = {
  id: 'atelier',
  aspectRatio: 1.58,
  minHeight: 200,
  outerBorder: '#E8B4A0',
  outerBorderWidth: 2,
  insetBorder: '#C9897A',
  insetBorderWidth: 1,
  insetPadding: 10,
  fillLayers: [
    { type: 'radial', cx: '50%', cy: '45%', rx: '80%', ry: '70%', color: 'rgba(196,137,122,0.95)' },
    { type: 'linear', angle: 145, stops: [
      { offset: 0, color: '#D4A574' },
      { offset: 0.45, color: '#C4897A' },
      { offset: 1, color: '#B8735A' },
    ] },
  ],
  metallicGradient: ['#F0C4B0', '#E8B4A0', '#C9897A', '#8B5E4A'],
  brandColor: '#4A2C24',
  tierScriptColor: '#4A2C24',
  subtitleColor: 'rgba(74,44,36,0.85)',
  accentColor: '#8B5E4A',
  decorOpacity: 0.65,
  shadow: '0 12px 36px rgba(74,44,36,0.22)',
  foundingGlow: '0 0 28px rgba(197,160,89,0.32)',
};

const DIAMOND_THEME = {
  id: 'diamond_couture',
  aspectRatio: 1.58,
  minHeight: 200,
  outerBorder: '#7080A0',
  outerBorderWidth: 2,
  insetBorder: '#A8C8FF',
  insetBorderWidth: 1,
  insetPadding: 10,
  fillLayers: [
    { type: 'radial', cx: '50%', cy: '40%', rx: '90%', ry: '80%', color: 'rgba(20,20,24,0.98)' },
    { type: 'linear', angle: 160, stops: [
      { offset: 0, color: '#1A1A22' },
      { offset: 0.5, color: '#121218' },
      { offset: 1, color: '#0A0A0E' },
    ] },
  ],
  prismaticBorder: ['#E8E8EC', '#A8C8FF', '#7080A0', '#C0C0C0', '#E8E8EC'],
  metallicGradient: ['#F0F0F4', '#A8C8FF', '#7080A0', '#E8E8EC'],
  brandColor: '#E8E8EC',
  tierScriptColor: '#E8E8EC',
  subtitleColor: 'rgba(200,210,230,0.85)',
  accentColor: '#A8C8FF',
  decorOpacity: 0.55,
  shadow: '0 0 24px rgba(168,200,255,0.2), 0 12px 36px rgba(0,0,0,0.45)',
  foundingGlow: '0 0 32px rgba(197,160,89,0.35), inset 0 0 0 1px rgba(197,160,89,0.2)',
};

export const MEMBERSHIP_CARD_THEMES = {
  pearl: PEARL_THEME,
  atelier: ATELIER_THEME,
  diamond_couture: DIAMOND_THEME,
};

export const FOUNDING_SEAL_PALETTES = {
  vanguard: {
    outer: '#C0C0C8',
    mid: '#2A2A32',
    inner: '#1A1A22',
    text: '#E8E8EC',
    highlight: '#FFFFFF',
    shadow: 'rgba(192,192,200,0.55)',
  },
  legacy: {
    outer: '#E8B4A0',
    mid: '#8B5E4A',
    inner: '#5A3D32',
    text: '#FFF5EE',
    highlight: '#FFD3D9',
    shadow: 'rgba(232,180,160,0.55)',
  },
  default: {
    outer: '#C5A059',
    mid: '#8B6914',
    inner: '#1A1A1F',
    text: '#E8D5A3',
    highlight: '#F5E6C8',
    shadow: 'rgba(197,160,89,0.45)',
  },
};

export function getMembershipCardTheme(tierId, { isFounding = false, foundingType = null } = {}) {
  const base = MEMBERSHIP_CARD_THEMES[tierId] || MEMBERSHIP_CARD_THEMES.pearl;
  const tierConfig = TIER_CONFIG[tierId] || TIER_CONFIG.pearl;
  const sealKey = foundingType === 'vanguard' || foundingType === 'legacy'
    ? foundingType
    : 'default';

  return {
    ...base,
    tierName: tierConfig.name,
    tierNameUpper: tierConfig.name.toUpperCase(),
    isFounding,
    foundingType,
    foundingSealPalette: FOUNDING_SEAL_PALETTES[sealKey],
    boxShadow: isFounding ? base.foundingGlow : base.shadow,
  };
}

/** Build CSS background string for web fill layers with optional parallax offset */
export function buildMembershipFillCss(theme, shiftX = 0, shiftY = 0) {
  const layers = [];

  theme.fillLayers.forEach((layer) => {
    if (layer.type === 'radial') {
      const cx = `calc(${layer.cx} + ${shiftX}px)`;
      const cy = `calc(${layer.cy} + ${shiftY}px)`;
      layers.push(
        `radial-gradient(${layer.rx} ${layer.ry} at ${cx} ${cy}, ${layer.color} 0%, transparent 72%)`,
      );
    } else if (layer.type === 'linear') {
      const angle = layer.angle + shiftX * 0.4;
      const stops = layer.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
      layers.push(`linear-gradient(${angle}deg, ${stops})`);
    }
  });

  return layers.join(', ');
}

/** Flat gradient stops for Skia/mobile canvas */
export function getSkiaFillStops(theme) {
  const linear = theme.fillLayers.find((l) => l.type === 'linear');
  if (!linear) {
    return [
      { offset: 0, color: '#F5F5F0' },
      { offset: 1, color: '#E0F5F0' },
    ];
  }
  return linear.stops.map((s) => ({
    offset: s.offset,
    color: s.color,
  }));
}
