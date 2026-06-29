import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import {
  GIFT_CARD_MAX_AMOUNT,
  GIFT_CARD_MIN_AMOUNT,
  GIFT_CARD_PRESET_AMOUNTS,
  formatGiftCardCode,
  getGiftCardExpiryLabel,
  purchaseGiftCard,
  requestGiftCardSale,
  fetchGiftCardSaleRequests,
  canCompleteGiftCardSale,
  canRequestGiftCardSale,
  canAccessGiftCardSales,
  canViewGiftCardCode,
  stripGiftCardCodeFromSaleResult,
} from '@nail-couture/shared/utils/giftCards.js';
import { useAuth } from '../../contexts/AuthContext';
import { GiftCardSharePanel } from '../../components/giftCards/GiftCardSharePanel';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { ScrollSelect } from '../../components/forms/ScrollSelect';
import { useThemeStyles } from '../../theme/useThemeStyles';

export function GiftCardSaleScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const canComplete = canCompleteGiftCardSale(user?.role);
  const canRequest = canRequestGiftCardSale(user?.role);
  const canViewCode = canViewGiftCardCode(user?.role);

  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [giftToOther, setGiftToOther] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [requestResult, setRequestResult] = useState<Record<string, unknown> | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Record<string, unknown>[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null);
  const [recipientPendingClaim, setRecipientPendingClaim] = useState(false);

  const loadQueue = useCallback(async () => {
    if (!user?.phone || !canComplete) return;
    setLoadingQueue(true);
    try {
      const data = await fetchGiftCardSaleRequests(user.phone, 'pending');
      setPendingRequests((data.requests as Record<string, unknown>[]) || []);
    } catch {
      setPendingRequests([]);
    } finally {
      setLoadingQueue(false);
    }
  }, [user?.phone, canComplete]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  if (!user || !canAccessGiftCardSales(user.role)) {
    return (
      <StaffScreenLayout title="Gift Cards" subtitle="Not available for your role">
        <Text style={styles.textSecondary}>
          Gift card sales are handled by cashiers. Management can send requests to the front desk.
        </Text>
      </StaffScreenLayout>
    );
  }

  const lookupBuyer = async () => {
    const phone = buyerPhone.trim();
    if (!phone) return;
    setLookingUp(true);
    setError('');
    try {
      const { data, error: lookupError } = await getSupabase()
        .from('profiles')
        .select('full_name, role')
        .eq('phone', phone)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!data || data.role !== 'customer') {
        setBuyerName('');
        setError('Customer not found or not registered.');
        return;
      }
      setBuyerName(data.full_name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookingUp(false);
    }
  };

  const lookupRecipient = async () => {
    const phone = recipientPhone.trim();
    if (!phone) return;
    setLookingUp(true);
    setError('');
    try {
      const { data, error: lookupError } = await getSupabase()
        .from('profiles')
        .select('full_name, role')
        .eq('phone', phone.replace(/\D/g, ''))
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!data) {
        setRecipientName('');
        setRecipientPendingClaim(true);
        return;
      }
      setRecipientPendingClaim(false);
      if (data.role !== 'customer') {
        setRecipientName('');
        setError('Recipient must be a registered customer.');
        return;
      }
      setRecipientName(data.full_name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookingUp(false);
    }
  };

  const validateForm = () => {
    const value = parseFloat(amount);
    if (!buyerPhone.trim()) {
      setError('Enter buyer phone.');
      return null;
    }
    if (!Number.isFinite(value) || value < GIFT_CARD_MIN_AMOUNT || value > GIFT_CARD_MAX_AMOUNT) {
      setError(`Amount must be between $${GIFT_CARD_MIN_AMOUNT} and $${GIFT_CARD_MAX_AMOUNT}.`);
      return null;
    }
    if (giftToOther && !recipientPhone.trim()) {
      setError('Enter recipient phone.');
      return null;
    }
    return value;
  };

  const handleRequest = async () => {
    setError('');
    const value = validateForm();
    if (value == null) return;

    setSaving(true);
    try {
      const response = await requestGiftCardSale({
        callerPhone: user.phone,
        buyerPhone: buyerPhone.trim(),
        amount: value,
        ownerPhone: giftToOther ? recipientPhone.trim() : null,
        recipientName: giftToOther ? recipientName : null,
        giftMessage: giftToOther ? giftMessage : null,
        notes: notes || null,
      });
      if (!response.success) {
        setError(String(response.error || 'Request failed'));
        return;
      }
      setRequestResult(response as Record<string, unknown>);
      setBuyerPhone('');
      setBuyerName('');
      setAmount('');
      setGiftToOther(false);
      setRecipientPhone('');
      setRecipientName('');
      setGiftMessage('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePurchase = async () => {
    setError('');
    const value = validateForm();
    if (value == null) return;

    setSaving(true);
    try {
      const response = await purchaseGiftCard({
        callerPhone: user.phone,
        buyerPhone: buyerPhone.trim(),
        amount: value,
        paymentMethod,
        ownerPhone: giftToOther ? recipientPhone.trim() : null,
        recipientName: giftToOther ? recipientName : null,
        giftMessage: giftToOther ? giftMessage : null,
        notes: notes || null,
      });
      if (!response.success) {
        setError(String(response.error || 'Purchase failed'));
        return;
      }
      setResult(stripGiftCardCodeFromSaleResult(response, user.role) as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteRequest = async (request: Record<string, unknown>) => {
    setError('');
    setCompletingRequestId(String(request.id));
    setSaving(true);
    try {
      const response = await purchaseGiftCard({
        callerPhone: user!.phone,
        buyerPhone: String(request.buyer_phone || ''),
        amount: Number(request.amount || 0),
        paymentMethod,
        requestId: String(request.id),
        notes: request.notes ? String(request.notes) : null,
      });
      if (!response.success) {
        setError(String(response.error || 'Purchase failed'));
        return;
      }
      setResult(stripGiftCardCodeFromSaleResult(response, user.role) as Record<string, unknown>);
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setSaving(false);
      setCompletingRequestId(null);
    }
  };

  const giftCard = result?.gift_card as Record<string, unknown> | undefined;

  if (result && giftCard) {
    return (
      <StaffScreenLayout
        title="Gift Card Created"
        subtitle={canViewCode ? 'Share the code with the customer' : 'The code was sent to the customer in the app'}
      >
        <View style={[styles.card, { padding: 16, gap: 12 }]}>
          {!canViewCode ? (
            <Text style={styles.textSecondary}>
              Sale completed. Cashiers cannot view gift card codes — the customer will find theirs in the app.
            </Text>
          ) : (
            <>
              <Text style={styles.textSecondary}>Code</Text>
              <Text style={[styles.textGold, { fontSize: 24, fontFamily: 'monospace' }]}>
                {formatGiftCardCode(String(giftCard.code || ''))}
              </Text>
            </>
          )}
          <Text style={styles.textPrimary}>
            ${Number(giftCard.initial_amount || 0).toFixed(2)} — {String(result.owner_name || '')}
          </Text>
          {getGiftCardExpiryLabel(giftCard) ? (
            <Text style={styles.textSecondary}>{getGiftCardExpiryLabel(giftCard)}</Text>
          ) : null}
          {canViewCode ? (
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(String(giftCard.code || ''));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={[styles.card, { padding: 12, alignItems: 'center' }]}
            >
              <Text style={styles.textGold}>{copied ? 'Copied!' : 'Copy Code'}</Text>
            </Pressable>
          ) : null}
          {(result.pending_claim || result.claim_token) && (
            <GiftCardSharePanel
              claimToken={String(result.claim_token || giftCard.claim_token || '')}
              amount={Number(giftCard.initial_amount || 0)}
              recipientName={String(result.owner_name || recipientName || '')}
              pendingRecipientPhone={String(giftCard.pending_recipient_phone || recipientPhone || '')}
              compact
            />
          )}
          <Pressable
            onPress={() => {
              setResult(null);
              setBuyerPhone('');
              setBuyerName('');
              setAmount('');
            }}
            style={{ alignItems: 'center', paddingVertical: 8 }}
          >
            <Text style={styles.textSecondary}>{canComplete ? 'Sell another' : 'Done'}</Text>
          </Pressable>
        </View>
      </StaffScreenLayout>
    );
  }

  const title = canComplete ? 'Gift Cards' : 'Gift Card Requests';
  const subtitle = canComplete
    ? 'Complete queued sales after payment, or walk-in sale.'
    : 'Send to cashier — payment collected at front desk.';

  return (
    <StaffScreenLayout title={title} subtitle={subtitle}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
        {requestResult && (
          <View style={[styles.card, { padding: 16, gap: 8 }]}>
            <Text style={[styles.textGold, { fontWeight: '600' }]}>Sent to Cashier</Text>
            <Text style={styles.textSecondary}>
              ${Number(requestResult.amount || 0).toFixed(2)} for {String(requestResult.owner_name || requestResult.buyer_name || '')}.
              Front desk will collect payment and issue the code.
            </Text>
            <Pressable onPress={() => setRequestResult(null)} style={{ paddingVertical: 8 }}>
              <Text style={styles.textGold}>Send another</Text>
            </Pressable>
          </View>
        )}

        {canComplete && (
          <View style={[styles.card, { padding: 16, gap: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.textGold, { fontWeight: '600' }]}>Cashier Queue</Text>
              <Pressable onPress={loadQueue}>
                <Text style={styles.textGold}>{loadingQueue ? '…' : 'Refresh'}</Text>
              </Pressable>
            </View>
            {loadingQueue ? (
              <ActivityIndicator color={styles.tokens.goldStrong} />
            ) : pendingRequests.length === 0 ? (
              <Text style={styles.textSecondary}>No pending gift card sales.</Text>
            ) : (
              pendingRequests.map((req) => (
                <View
                  key={String(req.id)}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: styles.tokens.borderLight,
                    gap: 6,
                  }}
                >
                  <Text style={styles.textPrimary}>
                    ${Number(req.amount || 0).toFixed(2)} — {String(req.owner_name || req.buyer_name || '')}
                  </Text>
                  <Text style={styles.textSecondary}>
                    Buyer: {String(req.buyer_name || '')} · By {String(req.requested_by_name || '')}
                  </Text>
                  <Pressable
                    onPress={() => handleCompleteRequest(req)}
                    disabled={saving}
                    style={[styles.card, { padding: 10, alignItems: 'center', borderColor: styles.tokens.goldStrong }]}
                  >
                    {saving && completingRequestId === req.id ? (
                      <ActivityIndicator color={styles.tokens.goldStrong} />
                    ) : (
                      <Text style={[styles.textGold, { fontWeight: '600' }]}>Collect Payment & Complete</Text>
                    )}
                  </Pressable>
                </View>
              ))
            )}
            <Text style={styles.textSecondary}>Payment method for queue</Text>
            <ScrollSelect
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={[
                { value: 'Card', label: 'Card' },
                { value: 'Cash', label: 'Cash' },
                { value: 'Transfer', label: 'Transfer' },
              ]}
            />
          </View>
        )}

        {(canRequest || canComplete) && (
          <>
            {canComplete && (
              <Text style={[styles.textGold, { fontWeight: '600', marginTop: 4 }]}>Walk-in Sale</Text>
            )}

            <Text style={styles.textSecondary}>Buyer phone</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={buyerPhone}
                onChangeText={setBuyerPhone}
                keyboardType="phone-pad"
                placeholder="Customer phone"
                placeholderTextColor={styles.tokens.textMuted}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
              />
              <Pressable onPress={lookupBuyer} style={[styles.card, { paddingHorizontal: 14, justifyContent: 'center' }]}>
                <Text style={styles.textGold}>{lookingUp ? '…' : 'Lookup'}</Text>
              </Pressable>
            </View>
            {buyerName ? <Text style={styles.textGold}>{buyerName}</Text> : null}

            <Text style={styles.textSecondary}>Amount</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GIFT_CARD_PRESET_AMOUNTS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setAmount(String(preset))}
                  style={[
                    styles.card,
                    {
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderColor: amount === String(preset) ? styles.tokens.goldStrong : styles.tokens.borderLight,
                    },
                  ]}
                >
                  <Text style={amount === String(preset) ? styles.textGold : styles.textPrimary}>${preset}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="Custom amount"
              placeholderTextColor={styles.tokens.textMuted}
              style={styles.input}
            />

            {canComplete && (
              <>
                <Text style={styles.textSecondary}>Payment method</Text>
                <ScrollSelect
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={[
                    { value: 'Card', label: 'Card' },
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Transfer', label: 'Transfer' },
                  ]}
                />
              </>
            )}

            <Pressable onPress={() => setGiftToOther((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.card, { width: 22, height: 22, marginBottom: 0, alignItems: 'center', justifyContent: 'center' }]}>
                {giftToOther ? <Text style={styles.textGold}>✓</Text> : null}
              </View>
              <Text style={styles.textPrimary}>Gift to another customer</Text>
            </Pressable>

            {giftToOther && (
              <>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={recipientPhone}
                    onChangeText={(value) => {
                      setRecipientPhone(value);
                      setRecipientName('');
                      setRecipientPendingClaim(false);
                    }}
                    keyboardType="phone-pad"
                    placeholder="Recipient phone"
                    placeholderTextColor={styles.tokens.textMuted}
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  />
                  <Pressable onPress={lookupRecipient} style={[styles.card, { paddingHorizontal: 14, justifyContent: 'center' }]}>
                    <Text style={styles.textGold}>{lookingUp ? '…' : 'Lookup'}</Text>
                  </Pressable>
                </View>
                {recipientName ? <Text style={styles.textGold}>{recipientName}</Text> : null}
                {recipientPendingClaim ? (
                  <Text style={{ color: '#fbbf24', fontSize: 13 }}>
                    Not registered yet — share the claim link after sale.
                  </Text>
                ) : null}
                <TextInput
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="Recipient name (optional)"
                  placeholderTextColor={styles.tokens.textMuted}
                  style={styles.input}
                />
                <TextInput
                  value={giftMessage}
                  onChangeText={setGiftMessage}
                  placeholder="Gift message (optional)"
                  placeholderTextColor={styles.tokens.textMuted}
                  style={styles.input}
                />
              </>
            )}

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Internal notes (optional)"
              placeholderTextColor={styles.tokens.textMuted}
              style={styles.input}
            />

            {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}

            <Pressable
              onPress={canComplete ? handlePurchase : handleRequest}
              disabled={saving}
              style={[styles.card, { padding: 16, alignItems: 'center', borderColor: styles.tokens.goldStrong }]}
            >
              {saving ? (
                <ActivityIndicator color={styles.tokens.goldStrong} />
              ) : (
                <Text style={[styles.textGold, { fontWeight: '600' }]}>
                  {canComplete ? 'Complete Sale' : 'Send to Cashier'}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </StaffScreenLayout>
  );
}
