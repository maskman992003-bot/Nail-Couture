import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CASHIER_CHECKOUT, MULTI_TECH_VISITS } from '@nail-couture/shared/constants/featureFlags';
import { LOYALTY_REWARDS, validateVaultRedemptionCode } from '@nail-couture/shared/utils/loyaltyTransactions';
import {
  computeGiftCardCheckoutSplit,
  isGiftCardExpired,
  lookupGiftCardByCode,
} from '@nail-couture/shared/utils/giftCards';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import {
  getParticipatingTechnicians,
  computeEqualTipSplit,
  validateTipAllocations,
  getParticipatingTechnicianLabels,
} from '@nail-couture/shared/utils/appointmentServices';
import { canManageVisitTechnicians } from '@nail-couture/shared/utils/staffCustomerAccess';
import { fetchVisitTechnicianData } from '@nail-couture/shared/utils/visitTechnicians';
import Sidebar from './Sidebar';
import CheckoutServiceSummary from './CheckoutServiceSummary';
import VisitTechnicianManager from './VisitTechnicianManager';
import {
  modalBtnPrimary,
  modalBtnSecondary,
  modalInputClass,
} from './AppModal';
import clsx from 'clsx';

const statusColors = {
  ready_for_checkout: 'bg-amber-100 text-amber-800 border-amber-300',
  serving: 'bg-green-100 text-green-800 border-green-300',
};

const statusLabels = {
  ready_for_checkout: 'Ready',
  serving: 'In Chair',
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

function computeTotals(basePrice, extras, discountAmount, discountType) {
  const serviceSubtotal = Number(basePrice) || 0;
  const tip = Number(extras) || 0;
  let discount = 0;
  const discVal = parseFloat(discountAmount) || 0;
  if (discVal > 0) {
    discount = discountType === 'percent'
      ? serviceSubtotal * (discVal / 100)
      : discVal;
  }
  discount = Math.min(Math.max(0, discount), serviceSubtotal);
  const finalTotal = Math.max(0, serviceSubtotal - discount) + tip;
  return { serviceSubtotal, tip, discount, finalTotal };
}

const CheckoutModal = ({ appointment, onConfirm, onClose, theme, callerPhone, userRole, floorTechnicians }) => {
  const [extrasAmount, setExtrasAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [loyaltyRewardId, setLoyaltyRewardId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [visitTechData, setVisitTechData] = useState(null);
  const [tipAllocations, setTipAllocations] = useState([]);
  const [showTechManager, setShowTechManager] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [appliedGiftCard, setAppliedGiftCard] = useState(null);
  const [giftCardLookupError, setGiftCardLookupError] = useState('');
  const [lookingUpGiftCard, setLookingUpGiftCard] = useState(false);
  const [vaultCode, setVaultCode] = useState('');
  const [appliedVault, setAppliedVault] = useState(null);
  const [vaultLookupError, setVaultLookupError] = useState('');
  const [lookingUpVault, setLookingUpVault] = useState(false);

  const hasReservedReward = Boolean(appointment?.loyalty_reward_id && appointment?.loyalty_points_cost > 0);
  const basePrice = appointment?.final_price || appointment?.services?.price || 0;
  const extras = parseFloat(extrasAmount) || 0;
  const { serviceSubtotal, tip, discount } = computeTotals(basePrice, extras, discountAmount, discountType);
  const serviceDue = Math.max(0, serviceSubtotal - discount);
  const giftSplit = appliedGiftCard
    ? computeGiftCardCheckoutSplit({
      serviceDue,
      tip,
      balance: appliedGiftCard.balance,
    })
    : { totalDue: serviceDue + tip, giftCardAmount: 0, cashDue: serviceDue + tip };
  const finalTotal = giftSplit.cashDue;
  const visitTotal = giftSplit.totalDue;

  const customerPoints = appointment?.customer?.loyalty_points || 0;
  const selectedReward = LOYALTY_REWARDS.find((r) => r.id === loyaltyRewardId);

  const mergedAppointment = visitTechData
    ? {
      ...appointment,
      visit_technicians: visitTechData.technicians,
      technician_id: visitTechData.primary_technician_id ?? appointment?.technician_id,
    }
    : appointment;
  const participatingIds = MULTI_TECH_VISITS
    ? getParticipatingTechnicians(mergedAppointment)
    : [];
  const showTipSplit = MULTI_TECH_VISITS && participatingIds.length >= 2;
  const techLabels = showTipSplit
    ? getParticipatingTechnicianLabels(mergedAppointment, participatingIds)
    : [];
  const canManageTechs = MULTI_TECH_VISITS && canManageVisitTechnicians(userRole);

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
    setGiftCardCode('');
    setAppliedGiftCard(null);
    setGiftCardLookupError('');
    setVaultCode('');
    setAppliedVault(null);
    setVaultLookupError('');
  }, [appointment?.id]);

  useEffect(() => {
    if (appliedVault) {
      setDiscountAmount(String(appliedVault.reward_value || 0));
      setDiscountType('amount');
      setLoyaltyRewardId('');
      return;
    }
    if (hasReservedReward) {
      const reservedDiscount = Number(appointment.loyalty_discount_amount || 0);
      if (reservedDiscount > 0) {
        setDiscountAmount(String(reservedDiscount));
        setDiscountType('amount');
      }
      setLoyaltyRewardId('');
      return;
    }
    if (selectedReward) {
      setDiscountAmount(String(selectedReward.discountAmount || 0));
      setDiscountType('amount');
      return;
    }
    setDiscountAmount('');
    setDiscountType('percent');
  }, [
    appointment?.id,
    hasReservedReward,
    appointment?.loyalty_discount_amount,
    loyaltyRewardId,
    appliedVault?.redemption_code,
    selectedReward?.id,
  ]);

  const labelClass = 'block text-secondary text-sm mb-2';
  const mutedClass = 'text-secondary';
  const textClass = 'text-primary';
  const inputClass = clsx(modalInputClass, 'px-4 py-3');

  if (!appointment) return null;

  const handleLookupGiftCard = async () => {
    if (!giftCardCode.trim()) return;
    setLookingUpGiftCard(true);
    setGiftCardLookupError('');
    try {
      const result = await lookupGiftCardByCode(callerPhone, giftCardCode.trim());
      if (!result.success) {
        setAppliedGiftCard(null);
        setGiftCardLookupError(result.error || 'Gift card not found');
        return;
      }
      const card = result.gift_card;
      if (card.owner_id && appointment.customer_id && card.owner_id !== appointment.customer_id) {
        setAppliedGiftCard(null);
        setGiftCardLookupError(`This card belongs to ${card.owner_name || 'another customer'}.`);
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
      setGiftCardLookupError(err.message || 'Lookup failed');
    } finally {
      setLookingUpGiftCard(false);
    }
  };

  const handleLookupVaultCode = async () => {
    if (!vaultCode.trim() || !appointment.customer_id) return;
    setLookingUpVault(true);
    setVaultLookupError('');
    try {
      const result = await validateVaultRedemptionCode(appointment.customer_id, vaultCode.trim());
      if (!result.success) {
        setAppliedVault(null);
        setVaultLookupError(result.error || 'Vault code not found');
        return;
      }
      setAppliedVault(result);
      setLoyaltyRewardId('');
    } catch (err) {
      setVaultLookupError(err.message || 'Lookup failed');
    } finally {
      setLookingUpVault(false);
    }
  };

  const handleConfirm = async () => {
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
        discount_type: discountType === 'percent' ? 'percentage' : discount > 0 && (selectedReward || appliedVault) ? 'loyalty' : 'fixed',
        final_amount: finalTotal,
        extras_amount: extras,
        notes,
        payment_method: paymentMethod,
        loyalty_points_redeem: appliedVault || hasReservedReward ? 0 : (selectedReward?.points || 0),
        loyalty_reward_name: appliedVault
          ? appliedVault.reward_label
          : hasReservedReward
            ? null
            : (selectedReward?.name || null),
        vault_redemption_code: appliedVault?.redemption_code || null,
        tip_allocations: showTipSplit && tip > 0 ? tipAllocations : null,
        gift_card_id: appliedGiftCard?.id || null,
        gift_card_amount: appliedGiftCard ? giftSplit.giftCardAmount : null,
      });
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setSaving(false);
    }
  };

  const updateTipAllocation = (technicianId, amount) => {
    setTipAllocations((prev) => prev.map((a) =>
      a.technician_id === technicianId ? { ...a, amount: parseFloat(amount) || 0 } : a,
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-card bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-light">
          <h3 className="font-heading text-2xl text-gold-strong">Settle Payment</h3>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary text-2xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="rounded-lg p-4 mb-6 bg-secondary border border-light">
            <div className="flex justify-between items-center mb-2">
              <span className={mutedClass}>Customer</span>
              <span className={clsx('font-heading', textClass)}>{appointment.customer?.full_name || 'Guest'}</span>
            </div>
            <CheckoutServiceSummary appointment={appointment} theme={theme} />
            {hasReservedReward && (
              <div className="flex justify-between items-center mb-2 pt-2 border-t border-gold/10">
                <span className={mutedClass}>Reserved reward</span>
                <span className="text-gold text-sm">{appointment.loyalty_reward_name}</span>
              </div>
            )}
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-light">
              <span className={mutedClass}>Estimated Price</span>
              <span className={clsx('font-heading text-gold', textClass)}>${basePrice.toFixed(2)}</span>
            </div>
            {customerPoints > 0 && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gold/10">
                <span className={mutedClass}>Loyalty Points</span>
                <span className="text-gold">{customerPoints} pts</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Extras / Tip</label>
              <div className="relative">
                <span className={clsx('absolute left-4 top-1/2 -translate-y-1/2', mutedClass)}>$</span>
                <input
                  type="number"
                  value={extrasAmount}
                  onChange={(e) => setExtrasAmount(e.target.value)}
                  className={clsx(inputClass, 'pl-8')}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
            </div>

            {showTipSplit && tip > 0 && (
              <div className="rounded-lg p-3 border border-card bg-secondary">
                <p className={clsx('text-sm mb-3', mutedClass)}>Split tip between technicians</p>
                <div className="space-y-2">
                  {techLabels.map((tech) => {
                    const alloc = tipAllocations.find((a) => a.technician_id === tech.technician_id);
                    return (
                      <div key={tech.technician_id} className="flex items-center gap-2">
                        <span className={clsx('text-sm flex-1', textClass)}>{tech.full_name}</span>
                        <div className="relative w-28">
                          <span className={clsx('absolute left-3 top-1/2 -translate-y-1/2 text-xs', mutedClass)}>$</span>
                          <input
                            type="number"
                            value={alloc?.amount ?? ''}
                            onChange={(e) => updateTipAllocation(tech.technician_id, e.target.value)}
                            className={clsx(inputClass, 'pl-6 py-2')}
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {canManageTechs && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowTechManager((v) => !v)}
                  className={clsx('text-sm text-gold hover:text-gold/80')}
                >
                  {showTechManager ? 'Hide technician manager' : 'Manage technicians'}
                </button>
                {showTechManager && (
                  <div className="mt-3">
                    <VisitTechnicianManager
                      appointment={mergedAppointment}
                      callerPhone={callerPhone}
                      technicians={floorTechnicians}
                      theme={theme}
                      compact
                      onUpdated={setVisitTechData}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Discount</label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className={inputClass}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className={inputClass}
                >
                  <option value="amount">$</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>

            {customerPoints > 0 && !hasReservedReward && (
              <div>
                <label className={labelClass}>Redeem Loyalty Reward</label>
                <p className="text-xs text-secondary mb-2">
                  Use a Vault code below if the guest claimed in the app. Otherwise select a reward (deducts points at checkout).
                </p>
                <select
                  value={loyaltyRewardId}
                  onChange={(e) => {
                    setLoyaltyRewardId(e.target.value);
                    setAppliedVault(null);
                    setVaultCode('');
                  }}
                  disabled={Boolean(appliedVault)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {LOYALTY_REWARDS.map((reward) => (
                    <option key={reward.id} value={reward.id} disabled={customerPoints < reward.points}>
                      {reward.name} ({reward.points} pts){customerPoints < reward.points ? ' — insufficient' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {customerPoints > 0 && !hasReservedReward && (
              <div className="rounded-lg p-3 border border-card bg-secondary">
                <label className={labelClass}>Vault Redemption Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vaultCode}
                    onChange={(e) => setVaultCode(e.target.value.toUpperCase())}
                    className={inputClass}
                    placeholder="From guest&apos;s Digital Wallet"
                  />
                  <button
                    type="button"
                    onClick={handleLookupVaultCode}
                    disabled={lookingUpVault}
                    className="px-4 py-2 bg-gold/20 text-gold border border-card rounded-lg whitespace-nowrap"
                  >
                    {lookingUpVault ? '...' : 'Apply'}
                  </button>
                </div>
                {appliedVault && (
                  <div className="mt-2 text-sm text-gold">
                    {appliedVault.reward_label} — ${Number(appliedVault.reward_value || 0).toFixed(2)} off
                    <span className="text-secondary ml-2">(points already deducted)</span>
                    <button
                      type="button"
                      onClick={() => { setAppliedVault(null); setVaultCode(''); }}
                      className="ml-3 text-xs underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {vaultLookupError && <p className="text-red-400 text-xs mt-2">{vaultLookupError}</p>}
              </div>
            )}

            <div className="rounded-lg p-3 border border-card bg-secondary">
              <label className={labelClass}>Apply Gift Card</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={giftCardCode}
                  onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                  className={inputClass}
                  placeholder="GC-XXXX-XXXX"
                />
                <button
                  type="button"
                  onClick={handleLookupGiftCard}
                  disabled={lookingUpGiftCard}
                  className="px-4 py-2 bg-gold/20 text-gold border border-card rounded-lg whitespace-nowrap"
                >
                  {lookingUpGiftCard ? '...' : 'Apply'}
                </button>
              </div>
              {appliedGiftCard && (
                <div className="mt-2 text-sm text-gold">
                  {appliedGiftCard.code} — ${Number(appliedGiftCard.balance).toFixed(2)} available
                  <button type="button" onClick={() => { setAppliedGiftCard(null); setGiftCardCode(''); }} className="ml-3 text-xs underline">Remove</button>
                </div>
              )}
              {giftCardLookupError && <p className="text-red-400 text-xs mt-2">{giftCardLookupError}</p>}
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={clsx(inputClass, 'resize-none')}
                rows="3"
                placeholder="Optional checkout notes..."
              />
            </div>

            <div>
              <label className={labelClass}>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={inputClass}
              >
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
          </div>

          <div className="bg-gold/10 border border-card rounded-lg p-4 mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className={mutedClass}>Services</span>
              <span className={textClass}>${serviceSubtotal.toFixed(2)}</span>
            </div>
            {tip > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className={mutedClass}>Tip</span>
                <span className={textClass}>${tip.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between items-center mb-2 text-green-500">
                <span>Discount (services only)</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            {selectedReward && !appliedVault && (
              <div className="flex justify-between items-center mb-2 text-amber-500 text-sm">
                <span>Loyalty redeem</span>
                <span>{selectedReward.points} pts — {selectedReward.name}</span>
              </div>
            )}
            {appliedVault && (
              <div className="flex justify-between items-center mb-2 text-amber-500 text-sm">
                <span>Vault code</span>
                <span>{appliedVault.reward_label}</span>
              </div>
            )}
            {appliedGiftCard && giftSplit.giftCardAmount > 0 && (
              <div className="flex justify-between items-center mb-2 text-gold text-sm">
                <span>Gift card</span>
                <span>-${giftSplit.giftCardAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gold/20">
              <span className={clsx('font-medium', textClass)}>{appliedGiftCard ? 'Due Now' : 'Final Total'}</span>
              <span className="font-heading text-2xl text-gold">${finalTotal.toFixed(2)}</span>
            </div>
            {appliedGiftCard && (
              <div className={clsx('flex justify-between items-center mt-2 text-sm', mutedClass)}>
                <span>Visit total</span>
                <span>${visitTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={clsx(modalBtnSecondary, 'flex-1 min-h-0 rounded-lg')}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className={clsx(modalBtnPrimary, 'flex-1 min-h-0 rounded-lg font-heading')}
            >
              {saving ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function AppointmentCard({ appointment, onCheckout, theme, highlight }) {
  const isDark = theme === 'dark';
  const cardClass = clsx(
    'rounded-xl p-6 border',
    highlight
      ? 'border-amber-500/40 bg-amber-500/10'
      : isDark ? 'border-gold/20 bg-[#1a1a1a]' : 'border-gold/30 bg-white'
  );
  const mutedClass = isDark ? 'text-offwhite/50' : 'text-charcoal/50';
  const textClass = isDark ? 'text-offwhite' : 'text-charcoal';

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={clsx('font-heading text-xl', textClass)}>
          {appointment.customer?.full_name || 'Guest'}
        </h3>
        <span className={clsx('px-2 py-1 text-xs border rounded', statusColors[appointment.status] || statusColors.serving)}>
          {statusLabels[appointment.status] || appointment.status}
        </span>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className={mutedClass}>Service</span>
          <span className={clsx('font-medium', textClass)}>{appointment.add_ons || appointment.services?.name || 'Service'}</span>
        </div>
        {appointment.technician && (
          <div className="flex justify-between text-sm">
            <span className={mutedClass}>Technician</span>
            <span className={isDark ? 'text-offwhite/70' : 'text-charcoal/70'}>{appointment.technician.full_name}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className={mutedClass}>{appointment.status === 'ready_for_checkout' ? 'Ready since' : 'Started'}</span>
          <span className={isDark ? 'text-offwhite/70' : 'text-charcoal/70'}>
            {formatTime(appointment.checkout_ready_at || appointment.start_time)}
          </span>
        </div>
        <div className={clsx('flex justify-between text-lg pt-2 border-t', isDark ? 'border-offwhite/10' : 'border-charcoal/10')}>
          <span className={clsx('font-medium', textClass)}>Est. Total</span>
          <span className="text-gold font-heading">${(appointment.final_price || appointment.services?.price || 0).toFixed(2)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onCheckout(appointment)}
        className="w-full py-3 bg-gold text-charcoal font-heading hover:bg-gold/90 rounded-lg transition-colors"
      >
        Settle Payment
      </button>
    </div>
  );
}

export default function CashierCheckout() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [readyAppointments, setReadyAppointments] = useState([]);
  const [servingAppointments, setServingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [notification, setNotification] = useState(null);
  const [floorTechnicians, setFloorTechnicians] = useState([]);

  const isDark = theme === 'dark';
  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    isDark ? 'bg-primary text-primary' : 'bg-white text-charcoal'
  );
  const mutedClass = isDark ? 'text-offwhite/60' : 'text-charcoal/60';
  const emptyCardClass = isDark ? 'bg-[#1a1a1a]' : 'bg-charcoal/5 border border-gold/20';

  const allAppointments = useMemo(
    () => [...readyAppointments, ...servingAppointments],
    [readyAppointments, servingAppointments]
  );

  useEffect(() => {
    if (!CASHIER_CHECKOUT) {
      navigate(getHomePath(user?.role || 'customer'));
      return;
    }
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchQueues = async () => {
    const caller = localStorage.getItem('salon_user_data');
    const phone = caller ? JSON.parse(caller).phone : '';

    const [readyResult, servingResult] = await Promise.all([
      supabase.rpc('get_appointments', { caller_phone: phone, status_filter: 'ready_for_checkout', order_asc: true }),
      supabase.rpc('get_appointments', { caller_phone: phone, status_filter: 'serving', order_asc: true }),
    ]);

    if (readyResult.error) console.error('Error fetching checkout queue:', readyResult.error);
    if (servingResult.error) console.error('Error fetching serving:', servingResult.error);

    setReadyAppointments(readyResult.data || []);
    setServingAppointments(servingResult.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!CASHIER_CHECKOUT || !MULTI_TECH_VISITS) return undefined;
    supabase
      .from('profiles')
      .select('id, full_name, preferences')
      .eq('role', 'technician')
      .order('full_name')
      .then(({ data }) => setFloorTechnicians(data || []));
  }, []);

  useEffect(() => {
    if (!CASHIER_CHECKOUT) return undefined;
    fetchQueues();

    const channel = supabase
      .channel('cashier-checkout')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchQueues();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleCheckout = async (appointmentId, checkoutData) => {
    const appt = allAppointments.find((a) => a.id === appointmentId);

    const { data, error } = await supabase.rpc('process_checkout', {
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
      p_vault_redemption_code: checkoutData.vault_redemption_code || null,
    });

    if (error) {
      if (error.message?.includes('process_checkout') || error.code === '42883') {
        throw new Error('Checkout unavailable. Run sql/031_cashier_workflow.sql in Supabase.');
      }
      throw error;
    }

    const amount = data?.final_amount ?? checkoutData.final_amount;
    const foundingResult = data?.founding_result;

    let foundingDetail;
    let variant = 'success';
    if (foundingResult?.success && !foundingResult.already_member && foundingResult.badge_label) {
      foundingDetail = `Founding Member ${foundingResult.badge_label} claimed!`;
    } else if (foundingResult?.success === false && foundingResult.reason === 'cap_reached') {
      foundingDetail = 'Founding Member spots are full — checkout completed successfully.';
      variant = 'info';
    }

    setNotification({
      message: 'Payment Complete!',
      name: appt?.customer?.full_name,
      amount,
      points: data?.points_earned,
      detail: foundingDetail,
      variant,
    });
    setTimeout(() => setNotification(null), 3000);
    await fetchQueues();
    setCheckingOut(null);
  };

  if (!CASHIER_CHECKOUT) {
    return <Navigate to={user ? getHomePath(user.role) : '/login'} replace />;
  }

  if (loading) {
    return (
      <div className={bgClass}>
        <Sidebar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gold animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={bgClass}>
      <Sidebar />
      <div className="max-w-7xl mx-auto px-6 py-8 pb-24 lg:pb-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl text-gold mb-2">Checkout Station</h1>
          <p className={mutedClass}>Process payments for clients ready at the front desk</p>
        </div>

        {notification && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 ${notification.variant === 'info' ? 'bg-amber-600' : 'bg-green-500'} text-white px-8 py-4 rounded-lg shadow-lg z-50 max-w-[90vw] text-center`}>
            <p className="font-heading text-lg">{notification.message}</p>
            <p className="text-sm opacity-90">
              {notification.name} — ${notification.amount?.toFixed(2)}
              {notification.points > 0 && ` · +${notification.points} loyalty pts`}
            </p>
            {notification.detail ? (
              <p className="text-sm mt-2 font-medium">{notification.detail}</p>
            ) : null}
          </div>
        )}

        {readyAppointments.length > 0 && (
          <section className="mb-10">
            <h2 className="font-heading text-xl text-amber-400 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
              Checkout Queue ({readyAppointments.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readyAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCheckout={setCheckingOut}
                  theme={theme}
                  highlight
                />
              ))}
            </div>
          </section>
        )}

        {servingAppointments.length > 0 && (
          <section className="mb-10">
            <h2 className={clsx('font-heading text-xl mb-4', isDark ? 'text-offwhite/80' : 'text-charcoal/80')}>
              Still In Chair ({servingAppointments.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCheckout={setCheckingOut}
                  theme={theme}
                />
              ))}
            </div>
          </section>
        )}

        {readyAppointments.length === 0 && servingAppointments.length === 0 && (
          <div className={clsx('rounded-xl p-12 text-center', emptyCardClass)}>
            <div className="text-6xl mb-4">&#9744;</div>
            <h2 className={clsx('font-heading text-2xl mb-2', isDark ? 'text-offwhite' : 'text-charcoal')}>No Clients to Checkout</h2>
            <p className={mutedClass}>Clients sent from technicians or the lobby will appear here.</p>
          </div>
        )}

        {checkingOut && (
          <CheckoutModal
            appointment={checkingOut}
            onConfirm={handleCheckout}
            onClose={() => setCheckingOut(null)}
            theme={theme}
            callerPhone={user?.phone}
            userRole={user?.role}
            floorTechnicians={floorTechnicians}
          />
        )}
      </div>
    </div>
  );
}
