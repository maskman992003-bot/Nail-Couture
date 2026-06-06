export const colors = {
  charcoal: '#121212',
  offwhite: '#F9F9F9',
  gold: '#C5A059',
  goldLight: '#F0D78C',
  cream: '#FDF8F0',
  softGray: '#E8E4DE',
};

/** Loaded via @expo-google-fonts in apps/mobile — keys match useFonts registration. */
export const fontFamilies = {
  heading: 'PlayfairDisplay_600SemiBold',
  headingBold: 'PlayfairDisplay_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
};

export const themeTokens = {
  dark: {
    bgPrimary: colors.charcoal,
    bgSecondary: '#1a1a1a',
    textPrimary: colors.offwhite,
    textSecondary: 'rgba(249, 249, 249, 0.6)',
    textMuted: 'rgba(249, 249, 249, 0.4)',
    goldStrong: colors.gold,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    borderLight: 'rgba(249, 249, 249, 0.1)',
    cardBg: '#1a1a1a',
    cardBorder: 'rgba(197, 160, 89, 0.2)',
    inputBg: 'rgba(249, 249, 249, 0.1)',
    inputBorder: 'rgba(249, 249, 249, 0.2)',
    sidebarBg: '#0a0a0a',
    sidebarBorder: 'rgba(197, 160, 89, 0.1)',
    staffBg: '#0B0B0C',
    authCardBg: '#111111',
  },
  light: {
    bgPrimary: colors.cream,
    bgSecondary: colors.offwhite,
    textPrimary: colors.charcoal,
    textSecondary: 'rgba(18, 18, 18, 0.82)',
    textMuted: 'rgba(18, 18, 18, 0.65)',
    goldStrong: '#7a5c24',
    borderColor: 'rgba(197, 160, 89, 0.5)',
    borderLight: 'rgba(18, 18, 18, 0.1)',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(197, 160, 89, 0.3)',
    inputBg: 'rgba(18, 18, 18, 0.1)',
    inputBorder: 'rgba(18, 18, 18, 0.2)',
    sidebarBg: colors.cream,
    sidebarBorder: 'rgba(197, 160, 89, 0.2)',
    staffBg: '#ffffff',
    authCardBg: '#ffffff',
  },
};

export const THEME_STORAGE_KEY = 'theme';

export function getThemeTokens(theme) {
  return themeTokens[theme] || themeTokens.dark;
}
