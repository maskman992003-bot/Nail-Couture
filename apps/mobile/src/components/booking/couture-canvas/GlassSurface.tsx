import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { BLUR_INTENSITY, COUTURE_COLORS, COUTURE_RADIUS } from './constants';

type GlassSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  accentColor?: string;
  accentSide?: 'left' | 'none';
};

export function GlassSurface({
  children,
  style,
  borderRadius = COUTURE_RADIUS.card,
  accentColor,
  accentSide = 'none',
}: GlassSurfaceProps) {
  return (
    <View
      style={[
        styles.wrapper,
        {
          borderRadius,
          borderColor: COUTURE_COLORS.glassBorder,
          borderLeftColor: accentSide === 'left' && accentColor ? accentColor : COUTURE_COLORS.glassBorder,
          borderLeftWidth: accentSide === 'left' ? 3 : 1,
        },
        style,
      ]}
    >
      <BlurView
        intensity={BLUR_INTENSITY}
        tint="dark"
        style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}
      />
      <View style={[StyleSheet.absoluteFill, styles.overlay, { borderRadius }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: Platform.OS === 'android' ? 'rgba(26,26,26,0.92)' : 'transparent',
  },
  overlay: {
    backgroundColor: COUTURE_COLORS.glassFill,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
