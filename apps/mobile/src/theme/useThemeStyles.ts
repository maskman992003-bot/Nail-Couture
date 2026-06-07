import { useMemo } from 'react';
import type { DimensionValue, TextStyle, ViewStyle } from 'react-native';
import { colors, fontFamilies, getThemeTokens } from '@nail-couture/shared/theme/tokens.js';
import { borderRadius, spacing } from '@nail-couture/shared/theme/layout.js';
import { useTheme } from '../contexts/ThemeContext';
import { flex, layout } from './layoutStyles';

const primaryButtonShadow: ViewStyle = {
  shadowColor: colors.gold,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.18,
  shadowRadius: 20,
  elevation: 8,
};

export function useThemeStyles() {
  const { theme } = useTheme();

  return useMemo(() => {
    const tokens = getThemeTokens(theme);
    const headingFont: TextStyle = { fontFamily: fontFamilies.heading };
    const bodyFont: TextStyle = { fontFamily: fontFamilies.body };

    return {
      theme,
      tokens,
      spacing,
      flex,
      layout,
      fonts: fontFamilies,
      screen: {
        flex: 1,
        width: '100%' as DimensionValue,
        backgroundColor: tokens.bgPrimary,
      },
      staffScreen: {
        flex: 1,
        width: '100%' as DimensionValue,
        backgroundColor: tokens.staffBg,
      },
      card: {
        backgroundColor: tokens.cardBg,
        borderColor: tokens.cardBorder,
        borderWidth: 1,
        borderRadius: borderRadius['2xl'],
      },
      authCard: {
        backgroundColor: tokens.authCardBg,
        borderColor: tokens.cardBorder,
        borderWidth: 1,
        borderRadius: borderRadius['2xl'],
      },
      textPrimary: { color: tokens.textPrimary, ...bodyFont },
      textSecondary: { color: tokens.textSecondary, ...bodyFont },
      textGold: { color: tokens.goldStrong, ...bodyFont },
      textHeading: { color: tokens.goldStrong, ...headingFont },
      pageTitle: {
        color: tokens.textPrimary,
        fontFamily: fontFamilies.heading,
        fontSize: 32,
        fontWeight: '600' as const,
      },
      pageTitleGold: {
        color: tokens.goldStrong,
        fontFamily: fontFamilies.heading,
        fontSize: 32,
        fontWeight: '600' as const,
      },
      sectionLabel: {
        color: tokens.goldStrong,
        fontFamily: fontFamilies.heading,
        fontSize: 14,
        letterSpacing: 2,
        fontWeight: '600' as const,
        textTransform: 'uppercase' as const,
      },
      sectionTitle: {
        color: tokens.goldStrong,
        fontFamily: fontFamilies.heading,
        fontSize: 16,
        fontWeight: '600' as const,
      },
      panelTitle: {
        color: tokens.goldStrong,
        fontFamily: fontFamilies.heading,
        fontSize: 18,
        fontWeight: '600' as const,
      },
      cardTitleLg: {
        color: tokens.textPrimary,
        fontFamily: fontFamilies.heading,
        fontSize: 20,
        fontWeight: '600' as const,
      },
      cardTitle: {
        color: tokens.textPrimary,
        fontFamily: fontFamilies.heading,
        fontSize: 18,
        fontWeight: '600' as const,
      },
      statValueLg: {
        color: tokens.goldStrong,
        fontFamily: fontFamilies.heading,
        fontSize: 28,
        fontWeight: '600' as const,
      },
      statValue: {
        color: tokens.goldStrong,
        fontFamily: fontFamilies.heading,
        fontSize: 22,
        fontWeight: '600' as const,
      },
      priceText: {
        color: tokens.goldStrong,
        fontFamily: fontFamilies.heading,
        fontSize: 18,
        fontWeight: '600' as const,
      },
      priceTextLg: {
        color: tokens.goldStrong,
        fontFamily: fontFamilies.heading,
        fontSize: 22,
        fontWeight: '600' as const,
      },
      kioskTitle: {
        color: tokens.goldStrong,
        fontFamily: fontFamilies.heading,
        fontSize: 32,
        fontWeight: '600' as const,
        letterSpacing: 2,
        textTransform: 'uppercase' as const,
      },
      input: {
        backgroundColor: tokens.inputBg,
        borderColor: tokens.inputBorder,
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        color: tokens.textPrimary,
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        ...bodyFont,
      },
      buttonPrimary: {
        backgroundColor: tokens.goldStrong,
        borderRadius: borderRadius.full,
        paddingVertical: spacing[3],
        alignItems: 'center' as const,
        ...primaryButtonShadow,
      },
      buttonPrimaryText: {
        color: colors.charcoal,
        fontFamily: fontFamilies.heading,
        fontWeight: '600' as const,
        letterSpacing: 3.4,
        textTransform: 'uppercase' as const,
      },
    };
  }, [theme]);
}
