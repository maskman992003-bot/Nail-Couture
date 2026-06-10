import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  fetchTechnicianTipPayments,
  sumTipsFromPayments,
  TIP_PERIOD_OPTIONS,
  getTipPeriodLabel,
  formatTipPeriodRange,
} from '@nail-couture/shared/utils/technicianQueue.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';

type TipPayment = {
  id: string;
  extras_amount?: number;
  created_at?: string;
  customer?: { full_name?: string };
};

function formatTipTime(timestamp?: string) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function TechnicianTipsScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [payments, setPayments] = useState<TipPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTips = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchTechnicianTipPayments(user.id, period);
      setPayments(data);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, period]);

  useEffect(() => {
    loadTips();
  }, [loadTips]);

  const totalTips = sumTipsFromPayments(payments);
  const periodLabel = getTipPeriodLabel(period);
  const periodRange = formatTipPeriodRange(period);

  return (
    <StaffScreenLayout
      title="My Tips"
      subtitle="Tips from completed checkouts"
      headerRight={
        <Pressable onPress={() => loadTips(true)} disabled={refreshing}>
          <Text style={styles.textGold}>{refreshing ? '…' : 'Refresh'}</Text>
        </Pressable>
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {TIP_PERIOD_OPTIONS.map(({ id, label }) => (
          <Pressable
            key={id}
            onPress={() => setPeriod(id as 'today' | 'week' | 'month')}
            style={[
              styles.card,
              {
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderColor: period === id ? styles.tokens.goldStrong : styles.tokens.cardBorder,
                backgroundColor: period === id ? styles.tokens.goldStrong : styles.tokens.cardBg,
              },
            ]}
          >
            <Text
              style={{
                color: period === id ? '#121212' : styles.tokens.textSecondary,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, { padding: 20, marginBottom: 16 }]}>
        <Text style={styles.textSecondary}>{periodLabel} total</Text>
        {periodRange ? (
          <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 2 }]}>{periodRange}</Text>
        ) : null}
        <Text style={[styles.textGold, { fontSize: 36, fontWeight: '600', marginTop: 4 }]}>
          ${totalTips.toFixed(2)}
        </Text>
        <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 8 }]}>
          {payments.length} tip{payments.length !== 1 ? 's' : ''} recorded
        </Text>
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      ) : payments.length === 0 ? (
        <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>💵</Text>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', marginBottom: 8 }]}>
            No tips yet
          </Text>
          <Text style={[styles.textSecondary, { textAlign: 'center' }]}>
            Tips appear here after cashier checkout for your visits.
          </Text>
        </View>
      ) : (
        payments.map((payment) => (
          <View
            key={payment.id}
            style={[
              styles.card,
              {
                padding: 16,
                marginBottom: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              },
            ]}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.textPrimary, { fontWeight: '600' }]} numberOfLines={1}>
                {payment.customer?.full_name || 'Guest'}
              </Text>
              <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
                {formatTipTime(payment.created_at)}
              </Text>
            </View>
            <Text style={[styles.textGold, { fontSize: 20, fontWeight: '600' }]}>
              ${Number(payment.extras_amount || 0).toFixed(2)}
            </Text>
          </View>
        ))
      )}
    </StaffScreenLayout>
  );
}
