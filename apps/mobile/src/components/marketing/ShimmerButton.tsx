import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../theme/useThemeStyles';

type ShimmerButtonProps = {
  label: string;
  onPress: () => void;
  shimmerActive?: boolean;
  variant?: 'primary' | 'secondary';
};

export function ShimmerButton({
  label,
  onPress,
  shimmerActive = false,
  variant = 'secondary',
}: ShimmerButtonProps) {
  const styles = useThemeStyles();
  const isPrimary = variant === 'primary';
  const pulse = useMemo(() => new Animated.Value(1), []);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!shimmerActive || !isPrimary || reduceMotion) return undefined;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.88,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerActive, isPrimary, pulse, reduceMotion]);

  return (
    <Animated.View style={{ flex: 1, minWidth: 140, opacity: shimmerActive && isPrimary && !reduceMotion ? pulse : 1 }}>
      <Pressable
        onPress={onPress}
        style={{
          borderRadius: 999,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: styles.tokens.borderColor,
          backgroundColor: isPrimary ? styles.tokens.goldStrong : `${styles.tokens.textPrimary}08`,
          paddingVertical: 14,
          paddingHorizontal: 12,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: isPrimary ? '#121212' : styles.tokens.textPrimary,
            fontSize: 11,
            letterSpacing: 2,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
