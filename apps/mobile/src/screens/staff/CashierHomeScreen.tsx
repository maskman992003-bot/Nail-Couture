import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { AppScreenName } from '../../navigation/screenRegistry';

type TransactionRecord = {
  id: string;
  final_amount?: number;
  amount?: number;
  payment_method?: string;
  appointments?: {
    add_ons?: string;
    services?: { name?: string };
  };
  customer?: { full_name?: string };
};

export function CashierHomeScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const navigation = useNavigation<BottomTabNavigationProp<Record<AppScreenName, undefined>>>();
  const [loading, setLoading] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [paidToday, setPaidToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);

  const fetchData = useCallback(async () => {
    if (!user?.id || !user?.phone) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const dateFrom = `${todayIso.split('T')[0]}T00:00:00`;

      const [queueResult, paymentsResult] = await Promise.all([
        getSupabase().rpc('get_appointments', {
          caller_phone: user.phone,
          status_filter: 'ready_for_checkout',
          date_from: dateFrom,
        }),
        getSupabase()
          .from('payment_transactions')
          .select(
            `id, final_amount, amount, payment_method, created_at, status,
            appointments ( id, add_ons, services ( name, price ) ),
            customer:profiles!payment_transactions_customer_id_fkey ( full_name )`,
          )
          .eq('cashier_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', todayIso)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const queue = (queueResult.data as unknown[]) || [];
      setQueueCount(queue.length);

      const payments = (paymentsResult.data as TransactionRecord[]) || [];
      setPaidToday(payments.length);
      setRevenueToday(
        payments.reduce((sum, p) => sum + Number(p.final_amount || p.amount || 0), 0),
      );
      setRecentTransactions(payments);
    } catch {
      // ignore load errors
    }
    setLoading(false);
  }, [user?.id, user?.phone]);

  useEffect(() => {
    fetchData();

    const channel = getSupabase()
      .channel('cashier-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () =>
        fetchData(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payment_transactions' },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <StaffScreenLayout>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </StaffScreenLayout>
    );
  }

  const statCard = [styles.card, { padding: 16, flex: 1, alignItems: 'center' as const }];
  const linkCard = [styles.card, { padding: 20, marginBottom: 12, alignItems: 'center' as const }];

  return (
    <StaffScreenLayout
      title="Cashier Dashboard"
      subtitle={`Welcome, ${user?.full_name || 'Cashier'}`}
    >
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <View style={statCard}>
          <Text style={{ fontSize: 28, fontWeight: '600', color: '#fbbf24' }}>{queueCount}</Text>
          <Text style={styles.textSecondary}>In Queue</Text>
        </View>
        <View style={statCard}>
          <Text style={{ fontSize: 28, fontWeight: '600', color: '#4ade80' }}>{paidToday}</Text>
          <Text style={styles.textSecondary}>Paid Today</Text>
        </View>
        <View style={statCard}>
          <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>
            ${revenueToday.toFixed(0)}
          </Text>
          <Text style={styles.textSecondary}>Revenue</Text>
        </View>
      </View>

      <Pressable
        onPress={() => navigation.navigate('Checkout')}
        style={[
          styles.card,
          {
            padding: 20,
            marginBottom: 12,
            borderColor: styles.tokens.goldStrong,
            borderWidth: 2,
            alignItems: 'center',
          },
        ]}
      >
        {queueCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: '#f59e0b',
              borderRadius: 12,
              minWidth: 24,
              height: 24,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 6,
            }}
          >
            <Text style={{ color: '#121212', fontSize: 12, fontWeight: '700' }}>{queueCount}</Text>
          </View>
        )}
        <Text style={{ fontSize: 32, marginBottom: 8 }}>💳</Text>
        <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>Checkout</Text>
        <Text style={[styles.textSecondary, { marginTop: 4, textAlign: 'center' }]}>
          Process payments and settlements
        </Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Lobby')} style={linkCard}>
        <Text style={{ fontSize: 32, marginBottom: 8 }}>👥</Text>
        <Text style={[styles.textPrimary, { fontSize: 20, fontWeight: '600' }]}>Lobby</Text>
        <Text style={[styles.textSecondary, { marginTop: 4, textAlign: 'center' }]}>
          Monitor floor and assist check-ins
        </Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Reports')} style={linkCard}>
        <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
        <Text style={[styles.textPrimary, { fontSize: 20, fontWeight: '600' }]}>Daily Reports</Text>
        <Text style={[styles.textSecondary, { marginTop: 4, textAlign: 'center' }]}>
          View transactions and revenue
        </Text>
      </Pressable>

      <View style={[styles.card, { padding: 16, marginTop: 8 }]}>
        <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', marginBottom: 12 }]}>
          Today&apos;s Transactions
        </Text>
        {recentTransactions.length > 0 ? (
          recentTransactions.map((tx) => {
            const appt = tx.appointments;
            const serviceLabel = appt?.add_ons || appt?.services?.name || 'Service';
            return (
              <View
                key={tx.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: styles.tokens.borderLight,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.textPrimary}>{tx.customer?.full_name || 'Guest'}</Text>
                  <Text style={styles.textSecondary}>{serviceLabel}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600' }]}>
                    ${Number(tx.final_amount || tx.amount || 0).toFixed(2)}
                  </Text>
                  <Text style={{ color: '#4ade80', fontSize: 11, textTransform: 'capitalize' }}>
                    {tx.payment_method || 'paid'}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={[styles.textSecondary, { textAlign: 'center', paddingVertical: 24 }]}>
            No transactions today
          </Text>
        )}
      </View>
    </StaffScreenLayout>
  );
}
