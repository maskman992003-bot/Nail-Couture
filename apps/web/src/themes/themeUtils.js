import { LANDING_SERVICES } from './landingContent.js';
import { normalizeColorScheme } from './resolveThemePalette.js';

export function isClassicLanding(themeConfig) {
  return themeConfig?.landing?.layout === 'classic';
}

export function isMarketingLanding(themeConfig) {
  const layout = themeConfig?.landing?.layout;
  return layout === 'premium' || layout === 'boutique';
}

export function isDarkColorScheme(colorScheme) {
  return normalizeColorScheme(colorScheme) === 'dark';
}

export function isDarkTheme(themeConfig) {
  return isDarkColorScheme(themeConfig?.colorScheme);
}

export function getLegacyTheme(colorScheme) {
  return isDarkColorScheme(colorScheme) ? 'dark' : 'light';
}

export function themeColors(themeConfig) {
  return {
    background: themeConfig.backgroundColor,
    backgroundSecondary: themeConfig.backgroundSecondary,
    accent: themeConfig.accentColor,
    text: themeConfig.textPrimary,
    textSecondary: themeConfig.textSecondary,
    textMuted: themeConfig.textMuted,
    border: themeConfig.borderColor,
    borderLight: themeConfig.borderLight,
    card: themeConfig.cardStyle.background,
    input: themeConfig.inputBg,
    inputBorder: themeConfig.inputBorder,
    modalOverlay: themeConfig.layout.modalOverlay,
    sidebar: themeConfig.layout.sidebarBackground,
  };
}

export function cardSurfaceStyle(themeConfig) {
  return {
    backgroundColor: themeConfig.cardStyle.background,
    border: themeConfig.cardStyle.border,
    borderRadius: themeConfig.cardStyle.borderRadius,
    backdropFilter: themeConfig.cardStyle.backdropFilter ?? undefined,
    boxShadow:
      themeConfig.cardStyle.boxShadow && themeConfig.cardStyle.boxShadow !== 'none'
        ? themeConfig.cardStyle.boxShadow
        : undefined,
  };
}

export function panelSurfaceStyle(themeConfig) {
  return {
    backgroundColor: themeConfig.backgroundSecondary,
    border: `1px solid ${themeConfig.borderColor}`,
    borderRadius: themeConfig.cardStyle.borderRadius,
  };
}

export function getLandingCssVars(themeConfig) {
  const light = !isDarkTheme(themeConfig);
  return {
    '--landing-bg': themeConfig.backgroundColor,
    '--landing-fg': themeConfig.textPrimary,
    '--landing-muted': themeConfig.textSecondary,
    '--landing-accent': themeConfig.accentColor,
    '--landing-accent-fg': light ? '#FFFFFF' : themeConfig.backgroundColor,
    '--landing-card': themeConfig.cardStyle.background,
    '--landing-border': themeConfig.borderColor,
    '--landing-border-strong': themeConfig.inputBorder,
    '--landing-accent-soft': light ? `${themeConfig.accentColor}14` : `${themeConfig.accentColor}1f`,
    '--landing-input-bg': themeConfig.inputBg,
    '--landing-body-font': themeConfig.fonts.body,
    '--landing-heading-font': themeConfig.fonts.heading,
    '--landing-btn-radius': themeConfig.landing?.layout === 'boutique' ? '0' : themeConfig.layout.cardRadius,
    '--landing-card-shadow': light ? '0 1px 4px rgba(42, 36, 31, 0.05)' : '0 4px 24px rgba(0, 0, 0, 0.25)',
  };
}

export function getLandingServices(themeConfig) {
  const assets = themeConfig.landing?.assets?.services ?? [];
  return LANDING_SERVICES.map((service, index) => ({
    ...service,
    ...(assets[index] ?? {}),
  }));
}

export function scrollToLandingHash(hash) {
  if (!hash || hash === '#home' || hash === '#top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
}

export function buildAppThemeContextValue({
  activeTheme,
  skinConfig,
  themeConfig,
  colorScheme,
  themeLoading,
  themeSaving,
  themeError,
  switchTheme,
  toggleTheme,
  availableThemes,
}) {
  const scheme = normalizeColorScheme(colorScheme);
  const isDark = isDarkColorScheme(scheme);
  const isLight = !isDark;
  const theme = getLegacyTheme(scheme);

  return {
    activeTheme,
    skinConfig,
    themeConfig,
    themeLoading,
    themeSaving,
    themeError,
    switchTheme,
    toggleTheme,
    availableThemes,
    theme,
    isDark,
    isLight,
    colorScheme: scheme,
    branding: themeConfig.branding,
    landing: themeConfig.landing,
    fonts: themeConfig.fonts,
    layout: themeConfig.layout,
    colors: themeColors(themeConfig),
    styles: {
      card: cardSurfaceStyle(themeConfig),
      panel: panelSurfaceStyle(themeConfig),
      landing: getLandingCssVars(themeConfig),
    },
    logoUrl: themeConfig.branding?.logoUrl ?? '/NC.jpg',
    getLandingServices: () => getLandingServices(themeConfig),
  };
}
