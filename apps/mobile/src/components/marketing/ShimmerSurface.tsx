import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';

type ShimmerSurfaceProps = {
  active?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
};

export function ShimmerSurface({
  active = false,
  children,
  style,
  borderRadius = 16,
}: ShimmerSurfaceProps) {
  const shimmer = useMemo(() => new Animated.Value(0), []);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!active || reduceMotion) return undefined;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 180],
  });

  return (
    <View style={[style, { overflow: 'hidden', borderRadius, position: 'relative' }]}>
      {children}
      {active && !reduceMotion ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -8,
            bottom: -8,
            width: '45%',
            backgroundColor: 'rgba(255,255,255,0.18)',
            transform: [{ translateX }, { skewX: '-12deg' }],
          }}
        />
      ) : null}
    </View>
  );
}
