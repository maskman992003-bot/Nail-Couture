import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@nail-couture/shared/theme/tokens.js';
import { isWindows } from '../platform';

type GoldGradientBadgeProps = {
  children: ReactNode;
  style?: ViewStyle;
};

/** Gold gradient pill used for nav badges — solid gold fallback on Windows. */
export function GoldGradientBadge({ children, style }: GoldGradientBadgeProps) {
  if (isWindows) {
    return (
      <View
        style={[
          {
            backgroundColor: colors.gold,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.gold, colors.goldLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
