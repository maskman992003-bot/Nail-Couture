import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View } from 'react-native';
import {
  MYSTERY_GIFT_TEASER_COPY,
  formatMysteryGiftCountdown,
} from '@nail-couture/shared/utils/mysteryGift';
import { ShimmerSurface } from '../../marketing/ShimmerSurface';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type MysteryGiftHeroProps = {
  status?: { days_remaining?: number } | null;
  onOpenDetail: () => void;
};

const SPARKLE_POINTS = [
  { top: '16%', left: '10%' },
  { top: '12%', left: '74%' },
  { top: '58%', left: '88%' },
  { top: '72%', left: '18%' },
];

export function MysteryGiftHero({ status, onOpenDetail }: MysteryGiftHeroProps) {
  const styles = useThemeStyles();
  const daysRemaining = status?.days_remaining ?? 0;
  const countdown = formatMysteryGiftCountdown(daysRemaining);
  const [reduceMotion, setReduceMotion] = useState(false);

  const countdownPulse = useRef(new Animated.Value(1)).current;
  const iconWiggle = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  const sparkleAnims = useMemo(
    () => SPARKLE_POINTS.map(() => new Animated.Value(0)),
    [],
  );

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;

    const countdownLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(countdownPulse, {
          toValue: 0.65,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(countdownPulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const iconLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconWiggle, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(iconWiggle, { toValue: -1, duration: 600, useNativeDriver: true }),
        Animated.timing(iconWiggle, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.delay(800),
      ]),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(glowPulse, { toValue: 0, duration: 1400, useNativeDriver: false }),
      ]),
    );

    const sparkleLoops = sparkleAnims.map((anim, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 400),
        Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ));

    countdownLoop.start();
    iconLoop.start();
    glowLoop.start();
    sparkleLoops.forEach((loop) => loop.start());

    return () => {
      countdownLoop.stop();
      iconLoop.stop();
      glowLoop.stop();
      sparkleLoops.forEach((loop) => loop.stop());
    };
  }, [countdownPulse, glowPulse, iconWiggle, reduceMotion, sparkleAnims]);

  const iconRotate = iconWiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const borderColor = reduceMotion
    ? `${styles.tokens.goldStrong}66`
    : glowPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [`${styles.tokens.goldStrong}55`, `${styles.tokens.goldStrong}99`],
    });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          padding: 0,
          overflow: 'hidden',
          borderColor,
          borderWidth: 1,
          backgroundColor: `${styles.tokens.goldStrong}14`,
        },
      ]}
    >
      <ShimmerSurface active={!reduceMotion} borderRadius={16} style={{ overflow: 'hidden' }}>
        {!reduceMotion ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', inset: 0, zIndex: 4 }}
          >
            {SPARKLE_POINTS.map((point, index) => (
              <Animated.View
                key={`${point.top}-${point.left}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: point.top,
                  left: point.left,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: styles.tokens.goldStrong,
                  opacity: sparkleAnims[index],
                  transform: [{
                    translateY: sparkleAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -12],
                    }),
                  }],
                }}
              />
            ))}
          </View>
        ) : null}

        <View style={{ padding: 18, gap: 12, zIndex: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <Animated.View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: `${styles.tokens.goldStrong}55`,
                  backgroundColor: `${styles.tokens.goldStrong}22`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: reduceMotion ? undefined : [{ rotate: iconRotate }, { scale: 1.05 }],
                }}
              >
                <Text style={{ fontSize: 18 }}>🎁</Text>
              </Animated.View>
              <Text style={[styles.textGold, { fontSize: 10, letterSpacing: 2, flex: 1 }]}>
                {MYSTERY_GIFT_TEASER_COPY.eyebrow.toUpperCase()}
              </Text>
            </View>
            <Animated.View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: `${styles.tokens.goldStrong}55`,
                backgroundColor: `${styles.tokens.goldStrong}18`,
                paddingHorizontal: 10,
                paddingVertical: 4,
                opacity: reduceMotion ? 1 : countdownPulse,
                transform: reduceMotion ? undefined : [{
                  scale: countdownPulse.interpolate({
                    inputRange: [0.65, 1],
                    outputRange: [1.06, 1],
                  }),
                }],
              }}
            >
              <Text style={[styles.textGold, { fontSize: 11, fontWeight: '600' }]}>{countdown}</Text>
            </Animated.View>
          </View>

          <Text style={[styles.textPrimary, { fontSize: 22, lineHeight: 28, fontWeight: '700' }]}>
            {MYSTERY_GIFT_TEASER_COPY.headline}
          </Text>
          <Text style={[styles.textSecondary, { fontSize: 14, lineHeight: 21 }]}>
            {MYSTERY_GIFT_TEASER_COPY.subhead}
          </Text>

          <Pressable
            onPress={onOpenDetail}
            style={[styles.buttonPrimary, { alignSelf: 'flex-start', paddingHorizontal: 18, borderRadius: 12 }]}
          >
            <Text style={styles.buttonPrimaryText}>{MYSTERY_GIFT_TEASER_COPY.cta.toUpperCase()}</Text>
          </Pressable>
        </View>
      </ShimmerSurface>
    </Animated.View>
  );
}
