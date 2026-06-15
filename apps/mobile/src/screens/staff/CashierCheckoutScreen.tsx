import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CASHIER_CHECKOUT, MULTI_TECH_VISITS } from '@nail-couture/shared/constants/featureFlags.js';
import { LOYALTY_REWARDS } from '@nail-couture/shared/utils/loyaltyTransactions.js';
import {
  getParticipatingTechnicians,
  computeEqualTipSplit,
  validateTipAllocations,
  getParticipatingTechnicianLabels,
} from '@nail-couture/shared/utils/appointmentServices.js';
import { canManageVisitTechnicians } from '@nail-couture/shared/utils/staffCustomerAccess.js';
import { fetchVisitTechnicianData } from '@nail-couture/shared/utils/visitTechnicians.js';
import {
  computeGiftCardCheckoutSplit,
  isGiftCardExpired,
  lookupGiftCardByCode,
} from '@nail-couture/shared/utils/giftCards.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { AppModal, ModalButton } from '../../components/AppModal';
import { ScrollSelect } from '../../components/forms/ScrollSelect';
import { VisitTechnicianManager } from '../../components/admin/VisitTechnicianManager';
import { useThemeStyles } from '../../theme/useThemeStyles';

type AppointmentRecord = {
  id: string;
  status: string;
  customer_id?: string;
  final_price?: number;
  add_ons?: string;
  selected_service_names?: string;
  checkout_ready_at?: string;
  start_time?: string;
  loyalty_reward_id?: string;
  loyalty_points_cost?: number;
  loyalty_discount_amount?: number;
  loyalty_reward_name?: string;
  services?: { name?: string; price?: number };
  technician?: { id?: string; full_name?: string };
  technician_id?: string;
  visit_technicians?: Array<{ technician_id: string; full_name?: string; participation_type?: string }>;
  customer?: { full_name?: string; loyalty_points?: number };
};

function computeTotals(
  basePrice: number,
  extras: number,
  discountAmount: string,
  discountType: string,
) {
  const serviceSubtotal = Number(basePrice) || 0;
  const tip = Number(extras) || 0;
  let discount = 0;
  const discVal = parseFloat(discountAmount) || 0;
  if (discVal > 0) {
    discount = discountType === 'percent' ? serviceSubtotal * (discVal / 100) : discVal;
  }
  discount = Math.min(Math.max(0, discount), serviceSubtotal);
  const finalTotal = Math.max(0, serviceSubtotal - discount) + tip;
  return { serviceSubtotal, tip, discount, finalTotal };
}

function formatTime(timestamp?: string) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

type CheckoutModalProps = {
  appointment: AppointmentRecord | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (appointmentId: string, data: Record<string, unknown>) => Promise<void>;
  callerPhone?: string;
  userRole?: string;
  floorTechnicians?: Array<{ id: string; full_name?: string; preferences?: Record<string, unknown> }>;
};

function CheckoutModal({ appointment, open, onClose, onConfirm, callerPhone, userRole, floorTechnicians }: CheckoutModalProps) {
  const styles = useThemeStyles();
  const [extrasAmount, setExtrasAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [loyaltyRewardId, setLoyaltyRewardId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [visitTechData, setVisitTechData] = useState<{
    technicians?: AppointmentRecord['visit_technicians'];
  } | null>(null);
  const [tipAllocations, setTipAllocations] = useState<Array<{ technician_id: string; amount: number }>>([]);
  const [showTechManager, setShowTechManager] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [appliedGiftCard, setAppliedGiftCard] = useState<Record<string, unknown> | null>(null);
  const [giftCardLookupError, setGiftCardLookupError] = useState('');
  const [lookingUpGiftCard, setLookingUpGiftCard] = useState(false);

  const hasReservedReward = Boolean(
    appointment?.loyalty_reward_id && appointment?.loyalty_points_cost,
  );
  const basePrice = appointment?.final_price || appointment?.services?.price || 0;
  const extras = parseFloat(extrasAmount) || 0;
  const { serviceSubtotal, tip, discount } = computeTotals(
    basePrice,
    extras,
    discountAmount,
    discountType,
  );
  const serviceDue = Math.max(0, serviceSubtotal - discount);
  const giftSplit = appliedGiftCard
    ? computeGiftCardCheckoutSplit({
      serviceDue,
      tip,
      balance: Number(appliedGiftCard.balance || 0),
    })
    : { totalDue: serviceDue + tip, giftCardAmount: 0, cashDue: serviceDue + tip };
  const finalTotal = giftSplit.cashDue;
  const visitTotal = giftSplit.totalDue;
  const customerPoints = appointment?.customer?.loyalty_points || 0;
  const selectedReward = LOYALTY_REWARDS.find((r) => r.id === loyaltyRewardId);

  const mergedAppointment = visitTechData && appointment
    ? {
      ...appointment,
      visit_technicians: visitTechData.technicians,
      technician_id: visitTechData.primary_technician_id ?? appointment?.technician_id,
    }
    : appointment;
  const participatingIds = MULTI_TECH_VISITS && mergedAppointment
    ? getParticipatingTechnicians(mergedAppointment)
    : [];
  const showTipSplit = MULTI_TECH_VISITS && participatingIds.length >= 2;
  const techLabels = showTipSplit && mergedAppointment
    ? getParticipatingTechnicianLabels(mergedAppointment, participatingIds)
    : [];
  const canManageTechs = MULTI_TECH_VISITS && canManageVisitTechnicians(userRole || '');

  useEffect(() => {
    if (!showTipSplit) {
      setTipAllocations([]);
      return;
    }
    setTipAllocations(computeEqualTipSplit(tip, participatingIds));
  }, [extrasAmount, showTipSplit, participatingIds.join(',')]);

  useEffect(() => {
    if (!MULTI_TECH_VISITS || !appointment?.id || !callerPhone) return;
    fetchVisitTechnicianData(callerPhone, appointment.id)
      .then(setVisitTechData)
      .catch(() => {});
  }, [appointment?.id, callerPhone]);

  useEffect(() => {
    if (!appointment) return;
    if (hasReservedReward) {
      const reservedDiscount = Number(appointment.loyalty_discount_amount || 0);
      if (reservedDiscount > 0) {
        setDiscountAmount(String(reservedDiscount));
        setDiscountType('amount');
      }
      setLoyaltyRewardId('');
      return;
    }
    setDiscountAmount('');
    setDiscountType('percent');
    setExtrasAmount('');
    setNotes('');
    setPaymentMethod('Card');
    setLoyaltyRewardId('');
    setGiftCardCode('');
    setAppliedGiftCard(null);
    setGiftCardLookupError('');
  }, [appointment?.id, hasReservedReward, appointment?.loyalty_discount_amount]);

  const handleLookupGiftCard = async () => {
    if (!giftCardCode.trim() || !callerPhone) return;
    setLookingUpGiftCard(true);
    setGiftCardLookupError('');
    try {
      const result = await lookupGiftCardByCode(callerPhone, giftCardCode.trim());
      if (!result.success) {
        setAppliedGiftCard(null);
        setGiftCardLookupError(result.error || 'Gift card not found');
        return;
      }
      const card = result.gift_card as Record<string, unknown>;
      if (card.owner_id && appointment.customer_id && card.owner_id !== appointment.customer_id) {
        setAppliedGiftCard(null);
        setGiftCardLookupError(`This card belongs to ${String(card.owner_name || 'another customer')}.`);
        return;
      }
      if (isGiftCardExpired(card)) {
        setAppliedGiftCard(null);
        setGiftCardLookupError('This gift card has expired.');
        return;
      }
      if (card.status !== 'active' || Number(card.balance) <= 0) {
        setAppliedGiftCard(null);
        setGiftCardLookupError('Gift card has no remaining balance.');
        return;
      }
      setAppliedGiftCard(card);
    } catch (err) {
      setGiftCardLookupError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookingUpGiftCard(false);
    }
  };

  const handleConfirm = async () => {
    if (!appointment) return;
    if (showTipSplit && tip > 0 && !validateTipAllocations(tip, tipAllocations)) {
      setError('Tip splits must sum to the total tip amount.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onConfirm(appointment.id, {
        amount: basePrice,
        discount_amount: discount,
        discount_type:
          discountType === 'percent'
            ? 'percentage'
            : discount > 0 && selectedReward
              ? 'loyalty'
              : 'fixed',
        final_amount: finalTotal,
        extras_amount: extras,
        notes,
        payment_method: paymentMethod,
        loyalty_points_redeem: hasReservedReward ? 0 : selectedReward?.points || 0,
        loyalty_reward_name: hasReservedReward ? null : selectedReward?.name || null,
        tip_allocations: showTipSplit && tip > 0 ? tipAllocations : null,
        gift_card_id: appliedGiftCard?.id || null,
        gift_card_amount: appliedGiftCard ? giftSplit.giftCardAmount : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) return null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Settle Payment"
      scrollBody
      footer={
        <>
          <ModalButton label="Cancel" onPress={onClose} />
          <ModalButton
            label={saving ? 'Processing…' : 'Confirm Payment'}
            variant="primary"
            disabled={saving}
            onPress={handleConfirm}
          />
        </>
      }
    >
      <View style={[styles.card, { padding: 12, marginBottom: 16 }]}>
        <CheckoutRow label="Customer" value={appointment.customer?.full_name || 'Guest'} />
        <CheckoutRow
          label="Service"
          value={
            appointment.selected_service_names ||
            appointment.add_ons ||
            appointment.services?.name ||
            'Service'
          }
          gold
        />
        <CheckoutRow label="Est. Price" value={`$${Number(basePrice).toFixed(2)}`} />
        {customerPoints > 0 && (
          <CheckoutRow label="Loyalty Points" value={`${customerPoints} pts`} gold />
        )}
      </View>

      <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>Extras / Tip</Text>
      <TextInput
        value={extrasAmount}
        onChangeText={setExtrasAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={styles.tokens.textMuted}
        style={[styles.input, { marginBottom: 12 }]}
      />

      {showTipSplit && tip > 0 && (
        <View style={[styles.card, { padding: 12, marginBottom: 12 }]}>
          <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 8 }]}>
            Split tip between technicians
          </Text>
          {techLabels.map((tech) => {
            const alloc = tipAllocations.find((a) => a.technician_id === tech.technician_id);
            return (
              <View key={tech.technician_id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <Text style={[styles.textPrimary, { flex: 1 }]}>{tech.full_name}</Text>
                <TextInput
                  value={alloc?.amount != null ? String(alloc.amount) : ''}
                  onChangeText={(val) => {
                    setTipAllocations((prev) => prev.map((a) =>
                      a.technician_id === tech.technician_id
                        ? { ...a, amount: parseFloat(val) || 0 }
                        : a,
                    ));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={styles.tokens.textMuted}
                  style={[styles.input, { width: 96, marginBottom: 0 }]}
                />
              </View>
            );
          })}
        </View>
      )}

      {canManageTechs && appointment && callerPhone && (
        <View style={{ marginBottom: 12 }}>
          <Pressable onPress={() => setShowTechManager((v) => !v)}>
            <Text style={styles.textGold}>
              {showTechManager ? 'Hide technician manager' : 'Manage technicians'}
            </Text>
          </Pressable>
          {showTechManager && (
            <View style={{ marginTop: 8 }}>
              <VisitTechnicianManager
                appointment={mergedAppointment || appointment}
                callerPhone={callerPhone}
                technicians={floorTechnicians || []}
                onUpdated={setVisitTechData}
              />
            </View>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>Discount</Text>
          <TextInput
            value={discountAmount}
            onChangeText={setDiscountAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={styles.tokens.textMuted}
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>Type</Text>
          <ScrollSelect
            value={discountType}
            onChange={setDiscountType}
            options={[
              { value: 'amount', label: '$ Amount' },
              { value: 'percent', label: '% Percent' },
            ]}
          />
        </View>
      </View>

      {customerPoints > 0 && !hasReservedReward && (
        <>
          <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>
            Redeem Loyalty Reward
          </Text>
          <ScrollSelect
            value={loyaltyRewardId}
            onChange={setLoyaltyRewardId}
            options={[
              { value: '', label: 'None' },
              ...LOYALTY_REWARDS.map((reward) => ({
                value: reward.id,
                label: `${reward.name} (${reward.points} pts)${customerPoints < reward.points ? ' — insufficient' : ''}`,
                disabled: customerPoints < reward.points,
              })),
            ]}
          />
        </>
      )}

      <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 4, marginTop: 12 }]}>
        Apply Gift Card
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput
          value={giftCardCode}
          onChangeText={(val) => setGiftCardCode(val.toUpperCase())}
          placeholder="GC-XXXX-XXXX"
          placeholderTextColor={styles.tokens.textMuted}
          autoCapitalize="characters"
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
        />
        <Pressable
          onPress={handleLookupGiftCard}
          disabled={lookingUpGiftCard}
          style={[styles.card, { paddingHorizontal: 14, justifyContent: 'center', marginBottom: 0 }]}
        >
          <Text style={styles.textGold}>{lookingUpGiftCard ? '…' : 'Apply'}</Text>
        </Pressable>
      </View>
      {appliedGiftCard && (
        <Text style={[styles.textGold, { fontSize: 12, marginBottom: 8 }]}>
          {String(appliedGiftCard.code)} — ${Number(appliedGiftCard.balance || 0).toFixed(2)} available
        </Text>
      )}
      {giftCardLookupError ? (
        <Text style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{giftCardLookupError}</Text>
      ) : null}

      <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 4, marginTop: 12 }]}>
        Notes
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        placeholder="Optional checkout notes…"
        placeholderTextColor={styles.tokens.textMuted}
        style={[styles.input, { minHeight: 72, textAlignVertical: 'top', marginBottom: 12 }]}
      />

      <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 4 }]}>Payment Method</Text>
      <ScrollSelect
        value={paymentMethod}
        onChange={setPaymentMethod}
        options={[
          { value: 'Card', label: 'Card' },
          { value: 'Cash', label: 'Cash' },
          { value: 'Transfer', label: 'Transfer' },
        ]}
      />

      <View
        style={[
          styles.card,
          { padding: 12, marginTop: 16, borderColor: styles.tokens.goldStrong },
        ]}
      >
        <CheckoutRow label="Services" value={`$${serviceSubtotal.toFixed(2)}`} />
        {tip > 0 && <CheckoutRow label="Tip" value={`$${tip.toFixed(2)}`} />}
        {discount > 0 && <CheckoutRow label="Discount" value={`-$${discount.toFixed(2)}`} green />}
        {appliedGiftCard && giftSplit.giftCardAmount > 0 && (
          <CheckoutRow label="Gift card" value={`-$${giftSplit.giftCardAmount.toFixed(2)}`} gold />
        )}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: styles.tokens.borderLight,
          }}
        >
          <Text style={[styles.textPrimary, { fontWeight: '600' }]}>
            {appliedGiftCard ? 'Due Now' : 'Final Total'}
          </Text>
          <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600' }]}>
            ${finalTotal.toFixed(2)}
          </Text>
        </View>
        {appliedGiftCard ? (
          <CheckoutRow label="Visit total" value={`$${visitTotal.toFixed(2)}`} />
        ) : null}
      </View>

      {error ? <Text style={{ color: '#f87171', marginTop: 12 }}>{error}</Text> : null}
    </AppModal>
  );
}

function CheckoutRow({
  label,
  value,
  gold,
  green,
}: {
  label: string;
  value: string;
  gold?: boolean;
  green?: boolean;
}) {
  const styles = useThemeStyles();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={styles.textSecondary}>{label}</Text>
      <Text
        style={[
          gold ? styles.textGold : green ? { color: '#4ade80' } : styles.textPrimary,
          { fontWeight: '500', flexShrink: 1, textAlign: 'right', maxWidth: '60%' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function AppointmentCard({
  appointment,
  onCheckout,
  highlight,
}: {
  appointment: AppointmentRecord;
  onCheckout: (appt: AppointmentRecord) => void;
  highlight?: boolean;
}) {
  const styles = useThemeStyles();
  const price = appointment.final_price || appointment.services?.price || 0;

  return (
    <View
      style={[
        styles.card,
        {
          padding: 16,
          marginBottom: 12,
          borderColor: highlight ? '#f59e0b66' : styles.tokens.cardBorder,
          backgroundColor: highlight ? '#f59e0b11' : styles.tokens.cardBg,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600' }]}>
          {appointment.customer?.full_name || 'Guest'}
        </Text>
        <Text
          style={{
            fontSize: 11,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 8,
            backgroundColor: appointment.status === 'ready_for_checkout' ? '#fbbf2422' : '#4ade8022',
            color: appointment.status === 'ready_for_checkout' ? '#fbbf24' : '#4ade80',
          }}
        >
          {appointment.status === 'ready_for_checkout' ? 'Ready' : 'In Chair'}
        </Text>
      </View>

      <CheckoutRow
        label="Service"
        value={appointment.add_ons || appointment.services?.name || 'Service'}
      />
      {appointment.technician && (
        <CheckoutRow label="Technician" value={appointment.technician.full_name || ''} />
      )}
      <CheckoutRow
        label={appointment.status === 'ready_for_checkout' ? 'Ready since' : 'Started'}
        value={formatTime(appointment.checkout_ready_at || appointment.start_time)}
      />
      <CheckoutRow label="Est. Total" value={`$${Number(price).toFixed(2)}`} gold />

      <Pressable onPress={() => onCheckout(appointment)} style={[styles.buttonPrimary, { marginTop: 12 }]}>
        <Text style={styles.buttonPrimaryText}>Settle Payment</Text>
      </Pressable>
    </View>
  );
}

export function CashierCheckoutScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const [readyAppointments, setReadyAppointments] = useState<AppointmentRecord[]>([]);
  const [servingAppointments, setServingAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<AppointmentRecord | null>(null);
  const [floorTechnicians, setFloorTechnicians] = useState<
    Array<{ id: string; full_name?: string; preferences?: Record<string, unknown> }>
  >([]);
  const [notification, setNotification] = useState<{
    message: string;
    name?: string;
    amount?: number;
    points?: number;
  } | null>(null);

  const allAppointments = useMemo(
    () => [...readyAppointments, ...servingAppointments],
    [readyAppointments, servingAppointments],
  );

  const fetchQueues = useCallback(async () => {
    if (!user?.phone) return;

    const [readyResult, servingResult] = await Promise.all([
      getSupabase().rpc('get_appointments', {
        caller_phone: user.phone,
        status_filter: 'ready_for_checkout',
        order_asc: true,
      }),
      getSupabase().rpc('get_appointments', {
        caller_phone: user.phone,
        status_filter: 'serving',
        order_asc: true,
      }),
    ]);

    setReadyAppointments((readyResult.data as AppointmentRecord[]) || []);
    setServingAppointments((servingResult.data as AppointmentRecord[]) || []);
    setLoading(false);
  }, [user?.phone]);

  useEffect(() => {
    if (!CASHIER_CHECKOUT || !MULTI_TECH_VISITS) return undefined;
    getSupabase()
      .from('profiles')
      .select('id, full_name, preferences')
      .eq('role', 'technician')
      .order('full_name')
      .then(({ data }) => setFloorTechnicians(data || []));
  }, []);

  useEffect(() => {
    if (!CASHIER_CHECKOUT) return undefined;
    fetchQueues();

    const channel = getSupabase()
      .channel('cashier-checkout')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () =>
        fetchQueues(),
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [fetchQueues]);

  const handleCheckout = async (appointmentId: string, checkoutData: Record<string, unknown>) => {
    const appt = allAppointments.find((a) => a.id === appointmentId);

    const { data, error } = await getSupabase().rpc('process_checkout', {
      caller_phone: user?.phone,
      appointment_id: appointmentId,
      p_amount: checkoutData.amount,
      p_discount_amount: checkoutData.discount_amount,
      p_discount_type: checkoutData.discount_type,
      p_final_amount: checkoutData.final_amount,
      p_payment_method: checkoutData.payment_method,
      p_notes: checkoutData.notes || null,
      p_loyalty_points_redeem: checkoutData.loyalty_points_redeem || 0,
      p_loyalty_reward_name: checkoutData.loyalty_reward_name || null,
      p_extras_amount: checkoutData.extras_amount || 0,
      p_tip_allocations: checkoutData.tip_allocations || null,
      p_gift_card_id: checkoutData.gift_card_id || null,
      p_gift_card_amount: checkoutData.gift_card_amount || null,
    });

    if (error) {
      if (error.message?.includes('process_checkout') || error.code === '42883') {
        throw new Error('Checkout unavailable. Run sql/031_cashier_workflow.sql in Supabase.');
      }
      throw error;
    }

    const amount = (data as { final_amount?: number })?.final_amount ?? checkoutData.final_amount;

    setNotification({
      message: 'Payment Complete!',
      name: appt?.customer?.full_name,
      amount: Number(amount),
      points: (data as { points_earned?: number })?.points_earned,
    });
    setTimeout(() => setNotification(null), 3000);
    await fetchQueues();
    setCheckingOut(null);
  };

  if (!CASHIER_CHECKOUT) {
    return (
      <StaffScreenLayout title="Checkout" subtitle="Feature disabled">
        <Text style={styles.textSecondary}>Cashier checkout is not enabled.</Text>
      </StaffScreenLayout>
    );
  }

  if (loading) {
    return (
      <StaffScreenLayout>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </StaffScreenLayout>
    );
  }

  return (
    <StaffScreenLayout
      title="Checkout Station"
      subtitle="Process payments for clients ready at the front desk"
    >
      {notification && (
        <View
          style={{
            backgroundColor: '#22c55e',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{notification.message}</Text>
          <Text style={{ color: '#ffffffcc', marginTop: 4 }}>
            {notification.name} — ${notification.amount?.toFixed(2)}
            {notification.points ? ` · +${notification.points} loyalty pts` : ''}
          </Text>
        </View>
      )}

      {readyAppointments.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600', marginBottom: 12 }]}>
            Checkout Queue ({readyAppointments.length})
          </Text>
          {readyAppointments.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} onCheckout={setCheckingOut} highlight />
          ))}
        </View>
      )}

      {servingAppointments.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600', marginBottom: 12 }]}>
            Still In Chair ({servingAppointments.length})
          </Text>
          {servingAppointments.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} onCheckout={setCheckingOut} />
          ))}
        </View>
      )}

      {readyAppointments.length === 0 && servingAppointments.length === 0 && (
        <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>☐</Text>
          <Text style={[styles.textPrimary, { fontSize: 20, fontWeight: '600', marginBottom: 8 }]}>
            No Clients to Checkout
          </Text>
          <Text style={[styles.textSecondary, { textAlign: 'center' }]}>
            Clients sent from technicians or the lobby will appear here.
          </Text>
        </View>
      )}

      <CheckoutModal
        appointment={checkingOut}
        open={!!checkingOut}
        onClose={() => setCheckingOut(null)}
        onConfirm={handleCheckout}
        callerPhone={user?.phone}
        userRole={user?.role}
        floorTechnicians={floorTechnicians}
      />
    </StaffScreenLayout>
  );
}
