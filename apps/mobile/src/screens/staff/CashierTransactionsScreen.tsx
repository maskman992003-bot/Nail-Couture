import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, Text, View } from 'react-native';
import {
  buildCashierReceiptContent,
  fetchCashierTransactions,
  getTransactionServiceLabel,
  sumTransactionTotals,
} from '@nail-couture/shared/utils/cashierTransactions.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';

type CashierTransaction = Awaited<ReturnType<typeof fetchCashierTransactions>>[number];

function formatTransactionTime(timestamp?: string) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMoney(value?: number | string | null) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function CashierTransactionsScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [period, setPeriod] = useState<'today' | 'week'>('today');
  const [transactions, setTransactions] = useState<CashierTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);

  const loadTransactions = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchCashierTransactions(user.id, period);
      setTransactions(data);
      setSelectedId((prev) => (prev && data.some((tx) => tx.id === prev) ? prev : null));
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, period]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const shareReceipt = async (tx: CashierTransaction) => {
    setReceiptLoadingId(tx.id);
    try {
      const { content } = await buildCashierReceiptContent(tx, user?.phone);
      await Share.share({ message: content, title: 'Nail Couture Receipt' });
    } catch {
      Alert.alert('Receipt unavailable', 'Unable to prepare receipt. Please try again.');
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const totalRevenue = sumTransactionTotals(transactions);
  const periodLabel = period === 'today' ? 'Today' : 'This week';

  return (
    <StaffScreenLayout
      title="My Transactions"
      subtitle="Checkouts you processed — review and share receipts"
      headerRight={
        <Pressable onPress={() => loadTransactions(true)} disabled={refreshing}>
          <Text style={styles.textGold}>{refreshing ? '…' : 'Refresh'}</Text>
        </Pressable>
      }
    >
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['today', 'week'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setPeriod(key)}
            style={[
              styles.card,
              {
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderColor: period === key ? styles.tokens.goldStrong : styles.tokens.cardBorder,
                backgroundColor: period === key ? styles.tokens.goldStrong : styles.tokens.cardBg,
              },
            ]}
          >
            <Text
              style={{
                color: period === key ? '#121212' : styles.tokens.textSecondary,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {key === 'today' ? 'Today' : 'This week'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, { padding: 20, marginBottom: 16 }]}>
        <Text style={styles.textSecondary}>{periodLabel} total</Text>
        <Text style={[styles.textGold, { fontSize: 36, fontWeight: '600', marginTop: 4 }]}>
          {formatMoney(totalRevenue)}
        </Text>
        <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 8 }]}>
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} processed
        </Text>
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🧾</Text>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', marginBottom: 8 }]}>
            No transactions yet
          </Text>
          <Text style={[styles.textSecondary, { textAlign: 'center' }]}>
            Completed checkouts will appear here for review and receipt sharing.
          </Text>
        </View>
      ) : (
        transactions.map((tx) => {
          const isSelected = selectedId === tx.id;
          const tip = Number(tx.extras_amount || 0);
          const discount = Number(tx.discount_amount || 0);
          return (
            <View key={tx.id} style={[styles.card, { marginBottom: 12, overflow: 'hidden' }]}>
              <Pressable
                onPress={() => setSelectedId(isSelected ? null : tx.id)}
                style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.textPrimary, { fontWeight: '600' }]} numberOfLines={1}>
                    {tx.customer?.full_name || 'Guest'}
                  </Text>
                  <Text style={[styles.textSecondary, { fontSize: 13, marginTop: 2 }]} numberOfLines={1}>
                    {getTransactionServiceLabel(tx)}
                  </Text>
                  <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 4 }]}>
                    {formatTransactionTime(tx.created_at)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.textGold, { fontSize: 20, fontWeight: '600' }]}>
                    {formatMoney(tx.final_amount || tx.amount)}
                  </Text>
                  <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 4, textTransform: 'capitalize' }]}>
                    {tx.payment_method || 'paid'}
                  </Text>
                </View>
              </Pressable>

              {isSelected && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: styles.tokens.cardBorder,
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                    <View>
                      <Text style={styles.textSecondary}>Subtotal</Text>
                      <Text style={styles.textPrimary}>{formatMoney(tx.amount)}</Text>
                    </View>
                    {tip > 0 && (
                      <View>
                        <Text style={styles.textSecondary}>Tip</Text>
                        <Text style={styles.textPrimary}>{formatMoney(tip)}</Text>
                      </View>
                    )}
                    {discount > 0 && (
                      <View>
                        <Text style={styles.textSecondary}>Discount</Text>
                        <Text style={{ color: '#22c55e' }}>-{formatMoney(discount)}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.textSecondary}>Total paid</Text>
                      <Text style={styles.textGold}>{formatMoney(tx.final_amount || tx.amount)}</Text>
                    </View>
                  </View>
                  {tx.notes ? (
                    <Text style={styles.textSecondary}>Note: {tx.notes}</Text>
                  ) : null}
                  <Pressable
                    onPress={() => shareReceipt(tx)}
                    disabled={receiptLoadingId === tx.id}
                    style={{
                      backgroundColor: styles.tokens.goldStrong,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      alignItems: 'center',
                      opacity: receiptLoadingId === tx.id ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: '#121212', fontWeight: '600' }}>
                      {receiptLoadingId === tx.id ? 'Preparing…' : 'Share Receipt'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}
    </StaffScreenLayout>
  );
}
