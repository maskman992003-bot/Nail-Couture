import { resolveThemeConfig, THEME_REGISTRY } from './themeRegistry.js';
import {
  getSkinDefaultColorScheme,
  mergeSkinWithPalette,
  normalizeColorScheme,
  readStoredColorScheme,
} from './resolveThemePalette.js';

export const THEME_ENGINE_STORAGE_KEY = 'app-theme';

const VALID_STORED_THEMES = new Set(Object.keys(THEME_REGISTRY));

export { resolveThemeConfig, THEME_REGISTRY, AVAILABLE_THEMES, getThemeOptions, getSkinConfig } from './themeRegistry.js';

export function readStoredAppTheme() {
  if (typeof window === 'undefined') return 'theme_01';
  const stored = window.localStorage.getItem(THEME_ENGINE_STORAGE_KEY);
  return VALID_STORED_THEMES.has(stored) ? stored : 'theme_01';
}

function extractBorderColor(border) {
  if (!border) return null;
  const match = border.match(/solid\s+(.+)$/);
  return match ? match[1] : border;
}

export function applyThemeEngineConfig(themeConfig, colorScheme) {
  if (typeof document === 'undefined' || !themeConfig) return;

  const resolved = colorScheme
    ? mergeSkinWithPalette(themeConfig, colorScheme)
    : themeConfig;

  const root = document.documentElement;
  const scheme = normalizeColorScheme(resolved.colorScheme);
  const dark = scheme === 'dark';

  root.setAttribute('data-app-theme', resolved.id);
  root.setAttribute('data-theme', scheme);
  root.setAttribute('data-landing-layout', resolved.landing?.layout ?? 'premium');
  root.style.colorScheme = scheme;

  root.style.setProperty('--gold-strong', resolved.accentColor);
  root.style.setProperty('--color-gold', resolved.accentColor);
  root.style.setProperty('--border-color', resolved.borderColor);
  root.style.setProperty('--border-light', resolved.borderLight);
  root.style.setProperty(
    '--card-border',
    extractBorderColor(resolved.cardStyle.border) || resolved.borderColor,
  );
  root.style.setProperty('--accent-gradient', resolved.accentGradient);
  root.style.setProperty('--modal-overlay', resolved.layout.modalOverlay);
  root.style.setProperty('--font-family-heading', resolved.fonts.heading);
  root.style.setProperty('--font-family-body', resolved.fonts.body);

  root.style.setProperty('--bg-primary', resolved.backgroundColor);
  root.style.setProperty('--bg-secondary', resolved.backgroundSecondary);
  root.style.setProperty('--text-primary', resolved.textPrimary);
  root.style.setProperty('--text-secondary', resolved.textSecondary);
  root.style.setProperty('--text-muted', resolved.textMuted);
  root.style.setProperty('--card-bg', resolved.cardStyle.background);
  root.style.setProperty('--input-bg', resolved.inputBg);
  root.style.setProperty('--input-border', resolved.inputBorder);
  root.style.setProperty('--sidebar-bg', resolved.layout.sidebarBackground);

  root.style.setProperty('--color-charcoal', dark ? resolved.backgroundColor : resolved.textPrimary);
  root.style.setProperty('--color-offwhite', dark ? resolved.textPrimary : resolved.backgroundSecondary);
  root.style.setProperty('--color-cream', dark ? resolved.backgroundSecondary : resolved.backgroundColor);
  root.style.setProperty('--color-soft-gray', resolved.borderLight);

  const assets = resolved.landing?.assets ?? {};
  root.style.setProperty('--landing-hero-image', `url(${assets.hero ?? ''})`);

  const backdrop = resolved.cardStyle.backdropFilter;
  if (backdrop) {
    root.style.setProperty('--card-backdrop-filter', backdrop);
  } else {
    root.style.removeProperty('--card-backdrop-filter');
  }

  const shadow = resolved.cardStyle.boxShadow;
  if (shadow && shadow !== 'none') {
    root.style.setProperty('--card-box-shadow', shadow);
  } else {
    root.style.removeProperty('--card-box-shadow');
  }

  try {
    localStorage.setItem(THEME_ENGINE_STORAGE_KEY, resolved.id);
  } catch {
    // ignore storage errors
  }
}

if (typeof document !== 'undefined') {
  const skin = THEME_REGISTRY[readStoredAppTheme()] ?? THEME_REGISTRY.theme_01;
  const colorScheme = readStoredColorScheme(getSkinDefaultColorScheme(skin));
  applyThemeEngineConfig(skin, colorScheme);
}
