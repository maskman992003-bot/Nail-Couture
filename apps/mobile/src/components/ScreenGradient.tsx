import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { isWindows } from '../platform';
import { useThemeStyles } from '../theme/useThemeStyles';

type ScreenGradientProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Hero/page background gradient — flat token fill on Windows when expo-linear-gradient is unavailable. */
export function ScreenGradient({ children, style }: ScreenGradientProps) {
  const { theme, tokens } = useThemeStyles();

  if (isWindows) {
    return (
      <View style={[{ backgroundColor: tokens.bgPrimary, flex: 1 }, style]}>
        {children}
      </View>
    );
  }

  const gradientColors =
    theme === 'dark'
      ? (['#121212', 'rgba(18,18,18,0.95)', '#121212'] as const)
      : (['#FDF8F0', 'rgba(253,248,240,0.95)', '#FDF8F0'] as const);

  return (
    <LinearGradient colors={gradientColors} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
}
