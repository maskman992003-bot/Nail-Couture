import { Text, View } from 'react-native';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getTierProgressSummary } from '@nail-couture/shared/utils/tierProgress.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import type { ProfileLike } from './MembershipHeroCard';

type TierProgressBannerProps = {
  profile: ProfileLike;
  snapshot?: { rolling_spend_12m?: number; calendar_spend_ytd?: number } | null;
};

export function TierProgressBanner({ profile, snapshot }: TierProgressBannerProps) {
  const styles = useThemeStyles();
  const tier = getTierInfo(profile);
  const progress = getTierProgressSummary(tier, profile, snapshot);

  return (
    <View style={[styles.card, { padding: 14, gap: 8 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2 }]}>
          {tier.name.toUpperCase()} · TIER PROGRESS
        </Text>
        <Text style={[styles.textSecondary, { fontSize: 11 }]}>{progress.progressLabel}</Text>
      </View>
      {tier.nextTier ? (
        <>
          <View
            style={{
              height: 6,
              borderRadius: 999,
              backgroundColor: `${styles.tokens.textPrimary}18`,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 6,
                borderRadius: 999,
                width: `${Math.min(100, tier.progress ?? 0)}%`,
                backgroundColor: styles.tokens.goldStrong,
              }}
            />
          </View>
          <Text style={[styles.textSecondary, { fontSize: 12 }]}>{progress.progressDetail}</Text>
        </>
      ) : (
        <Text style={[styles.textSecondary, { fontSize: 12 }]}>{progress.progressDetail}</Text>
      )}
    </View>
  );
}
