/**
 * Tailwind-aligned layout tokens shared between web reference and React Native.
 * Values mirror the default Tailwind v3/v4 spacing scale (1 unit = 4px).
 */

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
};

/** Tailwind default breakpoints (min-width in px). */
export const screens = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/** Web sidebar offsets: pl-sidebar (0 below lg, 16rem at lg+) */
export const sidebarOffset = {
  base: 0,
  md: 80,
  lg: 256,
};

/** Web page content padding: p-4 md:p-6 lg:p-8 */
export const pagePadding = {
  base: spacing[4],
  md: spacing[6],
  lg: spacing[8],
};

/** Web bottom nav clearance: pb-24 lg:pb-8 */
export const pageBottomPadding = {
  mobile: spacing[24],
  desktop: spacing[8],
};

/** Fixed bottom tab item width from web Sidebar.jsx */
export const bottomTabItemWidth = 72;

/** Approximate authenticated bottom nav height used for scroll clearance */
export const bottomTabBarHeight = 72;

export const maxWidth = {
  sm: 384,
  md: 448,
  lg: 512,
  xl: 576,
  '2xl': 672,
  '3xl': 768,
  '4xl': 896,
  '7xl': 1280,
};

export const borderRadius = {
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

/**
 * Resolve a responsive token map for the current viewport width.
 * @param {number} width
 * @param {{ base: number, md?: number, lg?: number, xl?: number }} map
 */
export function resolveResponsive(width, map) {
  if (map.xl != null && width >= screens.xl) return map.xl;
  if (map.lg != null && width >= screens.lg) return map.lg;
  if (map.md != null && width >= screens.md) return map.md;
  if (map.sm != null && width >= screens.sm) return map.sm;
  return map.base;
}

/**
 * @param {number} width
 * @returns {'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'}
 */
export function getBreakpoint(width) {
  if (width >= screens['2xl']) return '2xl';
  if (width >= screens.xl) return 'xl';
  if (width >= screens.lg) return 'lg';
  if (width >= screens.md) return 'md';
  if (width >= screens.sm) return 'sm';
  return 'base';
}

/**
 * Column count for CSS grid patterns on web, mapped to flex row wrap on RN.
 * @param {number} width
 * @param {{ base: number, sm?: number, md?: number, lg?: number, xl?: number }} columns
 */
export function resolveGridColumns(width, columns) {
  return resolveResponsive(width, columns);
}
