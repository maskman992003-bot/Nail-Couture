import { Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type WalletStatsRowProps = {
  points: number;
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

export function WalletStatsRow({ points, rewardsAvailable, onViewRewards }: WalletStatsRowProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <StatCard
        label="POINTS BALANCE"
        value={Number(points || 0).toLocaleString()}
        suffix="Points"
      />
      <StatCard
        label="REWARDS AVAILABLE"
        value={`$${rewardsAvailable}`}
        footerLabel="View Rewards"
        onFooterPress={onViewRewards}
      />
    </View>
  );
}
