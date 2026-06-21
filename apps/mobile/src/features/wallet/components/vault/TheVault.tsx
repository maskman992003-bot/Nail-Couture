import { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { getVaultMaxPoints, VAULT_MILESTONES } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { mergeVaultMilestones } from '@nail-couture/shared/utils/vaultMilestones.js';
import { useThemeStyles } from '../../../../theme/useThemeStyles';
import type { WalletMilestone } from '../../types';

type TheVaultProps = {
  points: number;
  milestones?: WalletMilestone[];
  onMilestonePress?: (points: number) => void;
};

const VIAL_HEIGHT = 220;
const VIAL_WIDTH = 72;

export function TheVault({ points, milestones = [], onMilestonePress }: TheVaultProps) {
  const styles = useThemeStyles();
  const fillHeight = useSharedValue(0);
  const maxPoints = useMemo(() => getVaultMaxPoints(milestones), [milestones]);
  const fillRatio = Math.min(1, points / maxPoints);

  useEffect(() => {
    fillHeight.value = withSpring(VIAL_HEIGHT * fillRatio, { damping: 18, stiffness: 120 });
  }, [fillRatio, fillHeight]);

  const liquidStyle = useAnimatedStyle(() => ({
    height: fillHeight.value,
  }));

  const mergedMilestones = useMemo(
    () => mergeVaultMilestones(milestones, points, VAULT_MILESTONES),
    [milestones, points],
  );

  return (
    <View style={[styles.card, { padding: 20, flexDirection: 'row', gap: 20, alignItems: 'center' }]}>
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2, marginBottom: 12 }]}>THE VAULT</Text>
        <View style={{ width: VIAL_WIDTH, height: VIAL_HEIGHT, position: 'relative' }}>
          <Svg width={VIAL_WIDTH} height={VIAL_HEIGHT}>
            <Defs>
              <LinearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                <Stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
                <Stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
              </LinearGradient>
              <LinearGradient id="liquid" x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor="#8B6914" />
                <Stop offset="100%" stopColor="#C5A059" />
              </LinearGradient>
            </Defs>
            <Rect x={4} y={4} width={VIAL_WIDTH - 8} height={VIAL_HEIGHT - 8} rx={20} fill="rgba(0,0,0,0.25)" stroke="url(#glass)" strokeWidth={2} />
          </Svg>
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 8,
                left: 10,
                width: VIAL_WIDTH - 20,
                borderRadius: 16,
                backgroundColor: '#C5A059',
                overflow: 'hidden',
              },
              liquidStyle,
            ]}
          />
          {mergedMilestones.map((m) => {
            const y = VIAL_HEIGHT - 8 - (m.points / maxPoints) * (VIAL_HEIGHT - 16);
            const glowing = m.canClaim;
            const used = Boolean(m.used_at);
            const dotColor = used
              ? `${styles.tokens.textSecondary}88`
              : m.canViewCode
                ? '#22c55e'
                : glowing
                  ? styles.tokens.goldStrong
                  : `${styles.tokens.textSecondary}44`;

            return (
              <Pressable
                key={m.points}
                disabled={!m.tappable}
                onPress={() => m.tappable && onMilestonePress?.(m.points)}
                style={{
                  position: 'absolute',
                  top: y - 10,
                  left: VIAL_WIDTH + 4,
                  maxWidth: 180,
                  opacity: m.tappable || used ? 1 : 0.85,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: glowing ? 14 : 8,
                      height: glowing ? 14 : 8,
                      borderRadius: 4,
                      backgroundColor: dotColor,
                      shadowColor: glowing ? styles.tokens.goldStrong : 'transparent',
                      shadowOpacity: glowing ? 0.8 : 0,
                      shadowRadius: 6,
                    }}
                  />
                  <Text style={[styles.textSecondary, { fontSize: 11, flexShrink: 1 }]}>
                    {m.points} pts · {m.rewardLabel}
                  </Text>
                </View>
                {m.tappable || used ? (
                  <Text
                    style={[
                      used ? styles.textSecondary : styles.textGold,
                      { fontSize: 10, marginLeft: 20, marginTop: 2, opacity: used ? 0.8 : 0.9 },
                    ]}
                  >
                    {m.statusLabel}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.textGold, { fontSize: 28, fontWeight: '700', marginTop: 12 }]}>{points}</Text>
        <Text style={styles.textSecondary}>points in vault</Text>
        <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 8, textAlign: 'center', maxWidth: 200 }]}>
          Claiming deducts points and gives a code for checkout.
        </Text>
      </View>
    </View>
  );
}
