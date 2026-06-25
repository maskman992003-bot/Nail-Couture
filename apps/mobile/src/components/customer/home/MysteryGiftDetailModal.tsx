import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import {
  MYSTERY_GIFT_TEASER_COPY,
  formatMysteryGiftCountdown,
} from '@nail-couture/shared/utils/mysteryGift';
import { AppModal, ModalButton } from '../AppModal';
import { ShimmerSurface } from '../../marketing/ShimmerSurface';
import { useThemeStyles } from '../../theme/useThemeStyles';

type MysteryGiftDetailModalProps = {
  open: boolean;
  status?: { days_remaining?: number } | null;
  onClose: () => void;
};

const MODAL_SPARKLE_POINTS = [
  { top: '8%', left: '5%' },
  { top: '6%', left: '55%' },
  { top: '18%', left: '88%' },
  { top: '35%', left: '12%' },
];

function MysteryGiftModalHeaderExtra({ countdown }: { countdown: string }) {
  const styles = useThemeStyles();
  const [reduceMotion, setReduceMotion] = useState(false);
  const countdownPulse = useRef(new Animated.Value(1)).current;
  const iconWiggle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;

    const countdownLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(countdownPulse, {
          toValue: 0.55,
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

    countdownLoop.start();
    iconLoop.start();

    return () => {
      countdownLoop.stop();
      iconLoop.stop();
    };
  }, [countdownPulse, iconWiggle, reduceMotion]);

  const iconRotate = iconWiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
      <Animated.View
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: `${styles.tokens.goldStrong}55`,
          backgroundColor: `${styles.tokens.goldStrong}22`,
          alignItems: 'center',
          justifyContent: 'center',
          transform: reduceMotion ? undefined : [{ rotate: iconRotate }, { scale: 1.05 }],
        }}
      >
        <Text style={{ fontSize: 16 }}>🎁</Text>
      </Animated.View>
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
              inputRange: [0.55, 1],
              outputRange: [1.12, 1],
            }),
          }],
        }}
      >
        <Text style={[styles.textGold, { fontSize: 11, fontWeight: '600' }]}>{countdown}</Text>
      </Animated.View>
    </View>
  );
}

export function MysteryGiftDetailModal({ open, status, onClose }: MysteryGiftDetailModalProps) {
  const styles = useThemeStyles();
  const countdown = formatMysteryGiftCountdown(status?.days_remaining ?? 0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const sparkleAnims = useMemo(
    () => MODAL_SPARKLE_POINTS.map(() => new Animated.Value(0)),
    [],
  );

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (!open || reduceMotion) return undefined;

    const sparkleLoops = sparkleAnims.map((anim, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 400),
        Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ));

    sparkleLoops.forEach((loop) => loop.start());
    return () => sparkleLoops.forEach((loop) => loop.stop());
  }, [open, reduceMotion, sparkleAnims]);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={MYSTERY_GIFT_TEASER_COPY.modalTitle}
      headerExtra={<MysteryGiftModalHeaderExtra countdown={countdown} />}
      scrollBody
      panelStyle={{
        borderColor: `${styles.tokens.goldStrong}66`,
        backgroundColor: `${styles.tokens.goldStrong}10`,
        overflow: 'hidden',
      }}
      footer={<ModalButton label="Got it" onPress={onClose} />}
    >
      <ShimmerSurface active={!reduceMotion} borderRadius={0} style={{ overflow: 'hidden', minHeight: 120 }}>
        {!reduceMotion ? (
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, zIndex: 4 }}>
            {MODAL_SPARKLE_POINTS.map((point, index) => (
              <Animated.View
                key={`${point.top}-${point.left}`}
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
                      outputRange: [0, -10],
                    }),
                  }],
                }}
              />
            ))}
          </View>
        ) : null}

        <View style={{ gap: 16, zIndex: 3 }}>
          <Text style={[styles.textSecondary, { fontSize: 14, lineHeight: 21 }]}>
            {MYSTERY_GIFT_TEASER_COPY.modalIntro}
          </Text>

          <View
            style={[
              styles.card,
              {
                padding: 14,
                gap: 10,
                borderColor: `${styles.tokens.goldStrong}33`,
                backgroundColor: `${styles.tokens.goldStrong}10`,
              },
            ]}
          >
            <Text style={[styles.textGold, { fontSize: 10, letterSpacing: 2 }]}>HOW IT WORKS</Text>
            {MYSTERY_GIFT_TEASER_COPY.modalRules.map((rule) => (
              <View key={rule} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={styles.textGold}>•</Text>
                <Text style={[styles.textSecondary, { flex: 1, fontSize: 13, lineHeight: 19 }]}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>
      </ShimmerSurface>
    </AppModal>
  );
}
