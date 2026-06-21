import { Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import { ProfileMembershipCard, type ProfileLike } from './MembershipHeroCard';

type WalletStatsRowProps = {
  profile: ProfileLike;
  onCardPress?: () => void;
  rewardsAvailable: number;
  onViewRewards?: () => void;
};

function StatCard({
  label,
  value,
  suffix,
  footerLabel,
  onFooterPress,
}: {
  label: string;
  value: string;
  suffix?: string;
  footerLabel?: string;
  onFooterPress?: () => void;
}) {
  const styles = useThemeStyles();

  return (
    <View style={[styles.card, { flex: 1, padding: 16 }]}>
      <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2, marginBottom: 6 }]}>{label}</Text>
      <Text style={[styles.textPrimary, { fontSize: 24, fontWeight: '700' }]}>
        {value}
        {suffix ? <Text style={[styles.textSecondary, { fontSize: 14 }]}> {suffix}</Text> : null}
      </Text>
      {footerLabel && onFooterPress ? (
        <Pressable onPress={onFooterPress} style={{ marginTop: 10 }}>
          <Text style={[styles.textGold, { fontSize: 12 }]}>{footerLabel} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PointsBalanceBar({ points }: { points: number }) {
  const styles = useThemeStyles();

  return (
    <View style={[styles.card, { padding: 16 }]}>
      <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 2, marginBottom: 6 }]}>
        POINTS BALANCE
      </Text>
      <Text style={[styles.textPrimary, { fontSize: 24, fontWeight: '700' }]}>
        {Number(points || 0).toLocaleString()}
        <Text style={[styles.textSecondary, { fontSize: 14 }]}> Points</Text>
      </Text>
    </View>
  );
}

export function WalletStatsRow({
  profile,
  onCardPress,
  rewardsAvailable,
  onViewRewards,
}: WalletStatsRowProps) {
  const styles = useThemeStyles();

  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
      <View
        style={[
          styles.card,
          {
            flex: 1,
            padding: 12,
            position: 'relative',
          },
        ]}
      >
        <ProfileMembershipCard profile={profile} onPress={onCardPress} fillSlot />
      </View>
      <StatCard
        label="REWARDS AVAILABLE"
        value={`$${rewardsAvailable}`}
        footerLabel="View Rewards"
        onFooterPress={onViewRewards}
      />
    </View>
  );
}
