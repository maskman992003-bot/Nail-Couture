import { useMemo } from 'react';
import type { DimensionValue } from 'react-native';
import { getThemeTokens } from '@nail-couture/shared/theme/tokens.js';
import { borderRadius, spacing } from '@nail-couture/shared/theme/layout.js';
import { useTheme } from '../contexts/ThemeContext';
import { flex, layout } from './layoutStyles';

export function useThemeStyles() {
  const { theme } = useTheme();

  return useMemo(() => {
    const tokens = getThemeTokens(theme);
    return {
      theme,
      tokens,
      spacing,
      flex,
      layout,
      screen: {
        flex: 1,
        width: '100%' as DimensionValue,
        backgroundColor: tokens.bgPrimary,
      },
      card: {
        backgroundColor: tokens.cardBg,
        borderColor: tokens.cardBorder,
        borderWidth: 1,
        borderRadius: borderRadius['2xl'],
      },
      textPrimary: { color: tokens.textPrimary },
      textSecondary: { color: tokens.textSecondary },
      textGold: { color: tokens.goldStrong },
      input: {
        backgroundColor: tokens.inputBg,
        borderColor: tokens.inputBorder,
        borderWidth: 1,
        borderRadius: 12,
        color: tokens.textPrimary,
        paddingHorizontal: 16,
        paddingVertical: 12,
      },
      buttonPrimary: {
        backgroundColor: tokens.goldStrong,
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center' as const,
      },
      buttonPrimaryText: {
        color: '#121212',
        fontWeight: '600' as const,
        letterSpacing: 2,
        textTransform: 'uppercase' as const,
      },
    };
  }, [theme]);
}
