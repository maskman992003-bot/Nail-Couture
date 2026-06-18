import { THEME_STORAGE_KEY } from '@nail-couture/shared/theme/tokens.js';

export function getSkinDefaultColorScheme(skin) {
  return skin?.defaultColorScheme ?? skin?.colorScheme ?? 'dark';
}

export function normalizeColorScheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

export function readStoredColorScheme(fallback = 'dark') {
  if (typeof window === 'undefined') {
    return normalizeColorScheme(fallback);
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return normalizeColorScheme(fallback);
}

export function cacheColorScheme(colorScheme) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizeColorScheme(colorScheme));
  } catch {
    // ignore storage errors
  }
}

export function mergeSkinWithPalette(skin, colorScheme) {
  if (!skin) return skin;

  const scheme = normalizeColorScheme(colorScheme);
  const palette = skin.palettes?.[scheme];

  if (!palette) {
    const defaultScheme = getSkinDefaultColorScheme(skin);
    if (scheme === defaultScheme) {
      return { ...skin, colorScheme: scheme };
    }
    return { ...skin, colorScheme: scheme };
  }

  const { layoutOverrides, cardStyle: paletteCard, ...paletteColors } = palette;

  return {
    ...skin,
    ...paletteColors,
    colorScheme: scheme,
    layout: {
      ...skin.layout,
      ...(layoutOverrides ?? {}),
    },
    cardStyle: {
      ...skin.cardStyle,
      ...(paletteCard ?? {}),
    },
  };
}
