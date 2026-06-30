import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { STAFF_GIFT_CARDS } from '@nail-couture/shared/constants/featureFlags';
import { getHomePath } from '@nail-couture/shared/utils/routes';
import {
  GIFT_CARD_PRESET_AMOUNTS,
  GIFT_CARD_MIN_AMOUNT,
  GIFT_CARD_MAX_AMOUNT,
  GIFT_CARD_EXPIRY_PERIOD_LABEL,
  purchaseGiftCard,
  requestGiftCardSale,
  fetchGiftCardSaleRequests,
  cancelGiftCardSaleRequest,
  buildGiftCardPurchaseReceipt,
  formatGiftCardCode,
  getGiftCardExpiryLabel,
  maskGiftCardCode,
  canCompleteGiftCardSale,
  canRequestGiftCardSale,
  canAccessGiftCardSales,
  canViewGiftCardCode,
  stripGiftCardCodeFromSaleResult,
} from '@nail-couture/shared/utils/giftCards';
import { copyTextToClipboard } from '@nail-couture/shared/utils/customerStats';
import { downloadReceiptFile } from '../utils/nativeDownload.js';
import { isFlutterWebView } from '../utils/mobileFilePickers.js';
import { GiftCardVisual } from './GiftCardVisual';
import AppModal, { modalBtnPrimary, modalBtnSecondary } from './AppModal';
import GiftCardSharePanel from './GiftCardSharePanel';
import useRegisterPullToRefresh from '../hooks/useRegisterPullToRefresh';
import clsx from 'clsx';

export default function GiftCardSale() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
  const [lookingUpRecipient, setLookingUpRecipient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [requestResult, setRequestResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [completingRequestId, setCompletingRequestId] = useState(null);
  const [completeConfirm, setCompleteConfirm] = useState(null);
  const [recipientPendingClaim, setRecipientPendingClaim] = useState(false);

  const loadQueue = useCallback(async () => {
    if (!canComplete) return;
    if (!user?.phone) {
      setQueueError('Your account has no phone number. Log out and sign in again.');
      setPendingRequests([]);
      return;
    }
    setLoadingQueue(true);
    setQueueError('');
    try {
      const data = await fetchGiftCardSaleRequests(user.phone, 'pending');
      if (data.error) {
        setQueueError(data.error);
        setPendingRequests([]);
        return;
      }
      setPendingRequests(data.requests || []);
    } catch (err) {
      setPendingRequests([]);
      setQueueError(err.message || 'Could not load the cashier queue.');
    } finally {
      setLoadingQueue(false);
    }
  }, [user?.phone, canComplete]);

  useRegisterPullToRefresh(loadQueue);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    setCodeRevealed(false);
  }, [result?.gift_card?.code]);

  if (!user || !STAFF_GIFT_CARDS) {
    return <Navigate to={user ? getHomePath(user.role) : '/login'} replace />;
  }
  if (!canAccessGiftCardSales(user.role)) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  const bgClass = clsx(
    'min-h-screen w-full transition-all duration-300 pl-0 md:pl-20 lg:pl-64',
    isDark ? 'bg-primary text-primary' : 'bg-white text-charcoal',
  );
  const inputClass = isDark
    ? 'w-full px-4 py-3 bg-offwhite/10 border border-offwhite/20 text-offwhite rounded-lg'
    : 'w-full px-4 py-3 bg-charcoal/5 border border-charcoal/20 text-charcoal rounded-lg';
  const labelClass = isDark ? 'block text-offwhite/80 text-sm mb-2' : 'block text-charcoal/80 text-sm mb-2';
  const cardClass = clsx('border rounded-xl p-6', isDark ? 'bg-offwhite/5 border-gold/20' : 'bg-white border-gold/30');

  const lookupCustomerByPhone = async (phone, { setName, setLoading, allowUnregistered = false }) => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: lookupError } = await supabase
        .from('profiles')
        .select('full_name, phone, role')
        .eq('phone', digits)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!data) {
        if (allowUnregistered) {
          setRecipientPendingClaim(true);
          return;
        }
        setName('');
        setError('Customer not found. They must register before purchasing a gift card.');
        return;
      }
      if (allowUnregistered) {
        setRecipientPendingClaim(false);
      }
      if (data.role !== 'customer') {
        setError('Gift cards can only be sold to registered customers.');
        setName('');
        return;
      }
      setName(data.full_name || '');
    } catch (err) {
      setError(err.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const lookupBuyer = () => lookupCustomerByPhone(buyerPhone, {
    setName: setBuyerName,
    setLoading: setLookingUp,
  });

  const lookupRecipient = () => lookupCustomerByPhone(recipientPhone, {
    setName: setRecipientName,
    setLoading: setLookingUpRecipient,
    allowUnregistered: true,
  });

  const resolvedAmount = () => {
    const value = parseFloat(amount);
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100) / 100;
  };

  const resetForm = () => {
    setResult(null);
    setRequestResult(null);
    setBuyerPhone('');
    setBuyerName('');
    setAmount('');
    setGiftToOther(false);
    setRecipientPhone('');
    setRecipientName('');
    setRecipientPendingClaim(false);
    setGiftMessage('');
    setNotes('');
    setCopied(false);
    setCodeRevealed(false);
    setActiveRequestId(null);
    setCompletingRequestId(null);
  };

  const validateForm = () => {
    const value = resolvedAmount();
    if (!canComplete && !activeRequestId && !buyerPhone.trim()) {
      setError('Enter the buyer phone number.');
      return null;
    }
    if (canComplete && !activeRequestId && !buyerPhone.trim()) {
      setError('Enter the buyer phone number.');
      return null;
    }
    const buyerDigits = buyerPhone.replace(/\D/g, '');
    if (!activeRequestId && buyerDigits.length !== 10) {
      setError('Enter a valid 10-digit buyer phone number.');
      return null;
    }
    if (!value || value < GIFT_CARD_MIN_AMOUNT || value > GIFT_CARD_MAX_AMOUNT) {
      setError(`Amount must be between $${GIFT_CARD_MIN_AMOUNT} and $${GIFT_CARD_MAX_AMOUNT}.`);
      return null;
    }
    if (giftToOther && !recipientPhone.trim()) {
      setError('Enter the recipient phone number.');
      return null;
    }
    if (giftToOther && recipientPhone.replace(/\D/g, '').length !== 10) {
      setError('Enter a valid 10-digit recipient phone number.');
      return null;
    }
    return value;
  };

  const handleRequest = async (e) => {
    e.preventDefault();
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
        setError(response.error || 'Request failed');
        return;
      }
      setRequestResult(response);
      setBuyerPhone('');
      setBuyerName('');
      setAmount('');
      setGiftToOther(false);
      setRecipientPhone('');
      setRecipientName('');
      setGiftMessage('');
      setNotes('');
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    setError('');
    const value = validateForm();
    if (value == null && !activeRequestId) return;
    setCompleteConfirm({
      kind: 'walkin',
      amount: value ?? 0,
      buyer: buyerName || buyerPhone.trim() || 'customer',
      recipient: giftToOther
        ? (recipientName || recipientPhone.trim() || 'recipient')
        : (buyerName || buyerPhone.trim() || 'customer'),
    });
  };

  const executePurchase = async () => {
    setError('');
    const value = validateForm();
    if (value == null && !activeRequestId) return;

    setSaving(true);
    try {
      const response = await purchaseGiftCard({
        callerPhone: user.phone,
        buyerPhone: activeRequestId ? '' : buyerPhone.trim(),
        amount: activeRequestId ? 0 : value,
        paymentMethod,
        ownerPhone: activeRequestId ? null : (giftToOther ? recipientPhone.trim() : null),
        recipientName: activeRequestId ? null : (giftToOther ? recipientName : null),
        giftMessage: activeRequestId ? null : (giftToOther ? giftMessage : null),
        notes: notes || null,
        requestId: activeRequestId,
      });
      if (!response.success) {
        setError(response.error || 'Purchase failed');
        return;
      }
      setResult(stripGiftCardCodeFromSaleResult(response, user.role));
      setActiveRequestId(null);
      await loadQueue();
    } catch (err) {
      setError(err.message || 'Purchase failed');
    } finally {
      setSaving(false);
      setCompletingRequestId(null);
    }
  };

  const executeCompleteRequest = async (request) => {
    setError('');
    setCompletingRequestId(request.id);
    setSaving(true);
    try {
      const response = await purchaseGiftCard({
        callerPhone: user.phone,
        buyerPhone: request.buyer_phone,
        amount: request.amount,
        paymentMethod,
        requestId: request.id,
        notes: request.notes || null,
      });
      if (!response.success) {
        setError(response.error || 'Purchase failed');
        return;
      }
      setResult(stripGiftCardCodeFromSaleResult(response, user.role));
      await loadQueue();
    } catch (err) {
      setError(err.message || 'Purchase failed');
    } finally {
      setSaving(false);
      setCompletingRequestId(null);
    }
  };

  const handleCompleteRequestClick = (request) => {
    setError('');
    setCompleteConfirm({
      kind: 'queue',
      amount: Number(request.amount) || 0,
      buyer: request.buyer_name || request.buyer_phone || 'customer',
      recipient: request.owner_name || request.buyer_name || 'recipient',
      request,
    });
  };

  const confirmCompleteSale = async () => {
    if (!completeConfirm || saving) return;
    const pending = completeConfirm;
    setCompleteConfirm(null);
    if (pending.kind === 'queue') {
      await executeCompleteRequest(pending.request);
    } else {
      await executePurchase();
    }
  };

  const handleCancelRequest = async (requestId) => {
    setError('');
    try {
      const response = await cancelGiftCardSaleRequest({
        callerPhone: user.phone,
        requestId,
      });
      if (!response.success) {
        setError(response.error || 'Cancel failed');
        return;
      }
      await loadQueue();
    } catch (err) {
      setError(err.message || 'Cancel failed');
    }
  };

  const receiptText = result
    ? buildGiftCardPurchaseReceipt({
      giftCard: result.gift_card,
      buyerName: result.buyer_name,
      ownerName: result.owner_name,
      paymentMethod: result.payment_method,
      amount: result.gift_card?.initial_amount,
    })
    : '';

  const handleCopyCode = async () => {
    const code = result?.gift_card?.code;
    if (!code) return;
    await copyTextToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReceipt = async () => {
    if (!receiptText) return;
    try {
      await downloadReceiptFile(
        receiptText,
        `gift-card-receipt-${result.gift_card?.id || 'download'}.txt`,
      );
    } catch (err) {
      console.error('Receipt download error:', err);
      window.alert('Unable to download receipt. Please try again.');
    }
  };

  const pageTitle = canComplete ? 'Gift Cards' : 'Gift Card Requests';
  const pageSubtitle = canComplete
    ? 'Complete pending sales after collecting payment, or sell directly (super admin / cashier).'
    : 'Send gift card details to the cashier queue. Payment is collected at the front desk.';

  const confirmAmount = Number(completeConfirm?.amount ?? 0);
  const confirmAmountLabel = Number.isFinite(confirmAmount) ? confirmAmount.toFixed(2) : '0.00';

  const confirmPaymentLabel = paymentMethod === 'Transfer' ? 'transfer' : paymentMethod.toLowerCase();

  const confirmRecipient = completeConfirm?.recipient || 'customer';
  const confirmBuyer = completeConfirm?.buyer || 'customer';

  return (
    <div className={bgClass}>
      <div className="p-4 md:p-6 lg:p-8 mobile-page max-w-2xl mx-auto">
        <div className={clsx('px-2 py-4 border-b mb-6', isDark ? 'border-gold/10' : 'border-gold/30')}>
          <h1 className="font-heading text-3xl text-gold">{pageTitle}</h1>
          <p className={clsx('text-sm mt-1', isDark ? 'text-offwhite/60' : 'text-charcoal/60')}>
            {pageSubtitle}
          </p>
        </div>

        {requestResult && (
          <div className={clsx(cardClass, 'mb-6')}>
            <h2 className="font-heading text-xl text-gold mb-2">Sent to Cashier</h2>
            <p className={clsx('text-sm', isDark ? 'text-offwhite/70' : 'text-charcoal/70')}>
              ${Number(requestResult.amount || 0).toFixed(2)} for {requestResult.owner_name || requestResult.buyer_name}.
              The front desk will collect payment and issue the gift card code.
            </p>
            <button
              type="button"
              onClick={() => setRequestResult(null)}
              className={clsx('mt-4 px-4 py-2 border rounded-lg', isDark ? 'border-offwhite/20' : 'border-charcoal/20')}
            >
              Send Another
            </button>
          </div>
        )}

        {result ? (
          <div className={cardClass}>
            <h2 className="font-heading text-2xl text-gold mb-4">Gift Card Created</h2>
            {canViewCode ? (
              <p className={clsx('text-sm mb-4', isDark ? 'text-offwhite/60' : 'text-charcoal/60')}>
                Share the code with the customer or they can find it in the app.
              </p>
            ) : (
              <p className={clsx('text-sm mb-4', isDark ? 'text-offwhite/60' : 'text-charcoal/60')}>
                Sale completed. The gift card code was sent to the customer in the app — cashiers cannot view gift card codes.
              </p>
            )}
            <div className="space-y-3 mb-6">
              {canViewCode && (
                <div className="flex justify-between items-center gap-3">
                  <span className={isDark ? 'text-offwhite/60' : 'text-charcoal/60'}>Code</span>
                  <button
                    type="button"
                    onClick={() => setCodeRevealed((v) => !v)}
                    className="font-mono text-gold text-lg hover:underline"
                    title={codeRevealed ? 'Hide code' : 'Show full code'}
                  >
                    {codeRevealed
                      ? formatGiftCardCode(result.gift_card?.code)
                      : maskGiftCardCode(result.gift_card?.code)}
                  </button>
                </div>
              )}
              <div className="flex justify-between">
                <span className={isDark ? 'text-offwhite/60' : 'text-charcoal/60'}>Amount</span>
                <span>${Number(result.gift_card?.initial_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-offwhite/60' : 'text-charcoal/60'}>Owner</span>
                <span>{result.owner_name}</span>
              </div>
              {getGiftCardExpiryLabel(result.gift_card) && (
                <div className="flex justify-between">
                  <span className={isDark ? 'text-offwhite/60' : 'text-charcoal/60'}>Valid until</span>
                  <span>{getGiftCardExpiryLabel(result.gift_card)?.replace(/^Expires /, '')}</span>
                </div>
              )}
            </div>
            {(result.pending_claim || result.claim_token) && (
              <div className="mb-6">
                <GiftCardSharePanel
                  claimToken={result.claim_token || result.gift_card?.claim_token}
                  amount={result.gift_card?.initial_amount}
                  recipientName={result.owner_name || recipientName}
                  pendingRecipientPhone={result.gift_card?.pending_recipient_phone || recipientPhone}
                  isDark={isDark}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {canViewCode && (
                <button type="button" onClick={handleCopyCode} className="px-4 py-2 bg-gold text-charcoal rounded-lg font-heading">
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className={clsx('px-4 py-2 border rounded-lg', isDark ? 'border-gold/30 text-gold' : 'border-gold/40 text-charcoal')}
              >
                {isFlutterWebView() ? 'Share Receipt' : 'Download Receipt'}
              </button>
              <button type="button" onClick={resetForm} className={clsx('px-4 py-2 border rounded-lg', isDark ? 'border-offwhite/20' : 'border-charcoal/20')}>
                {canComplete ? 'Sell Another' : 'Done'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {canRequest && !canComplete && (
              <form onSubmit={handleRequest} className={clsx('space-y-6', cardClass)}>
                <FormFields
                  buyerPhone={buyerPhone}
                  setBuyerPhone={setBuyerPhone}
                  buyerName={buyerName}
                  amount={amount}
                  setAmount={setAmount}
                  giftToOther={giftToOther}
                  setGiftToOther={setGiftToOther}
                  recipientPhone={recipientPhone}
                  setRecipientPhone={setRecipientPhone}
                  recipientName={recipientName}
                  setRecipientName={setRecipientName}
                  recipientPendingClaim={recipientPendingClaim}
                  setRecipientPendingClaim={setRecipientPendingClaim}
                  giftMessage={giftMessage}
                  setGiftMessage={setGiftMessage}
                  notes={notes}
                  setNotes={setNotes}
                  lookingUp={lookingUp}
                  lookupBuyer={lookupBuyer}
                  lookingUpRecipient={lookingUpRecipient}
                  lookupRecipient={lookupRecipient}
                  inputClass={inputClass}
                  labelClass={labelClass}
                  isDark={isDark}
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-gold text-charcoal font-heading rounded-lg hover:bg-gold/90 disabled:opacity-50"
                >
                  {saving ? 'Sending…' : 'Send to Cashier'}
                </button>
              </form>
            )}

            {canComplete && (
              <form onSubmit={handlePurchase} className={clsx('space-y-6 mb-6', cardClass)}>
                <h2 className="font-heading text-lg text-gold">Walk-in Sale</h2>
                <p className={clsx('text-sm -mt-2', isDark ? 'text-offwhite/50' : 'text-charcoal/50')}>
                  Customer paying at the desk now — complete without a prior request.
                </p>
                <FormFields
                  buyerPhone={buyerPhone}
                  setBuyerPhone={setBuyerPhone}
                  buyerName={buyerName}
                  amount={amount}
                  setAmount={setAmount}
                  giftToOther={giftToOther}
                  setGiftToOther={setGiftToOther}
                  recipientPhone={recipientPhone}
                  setRecipientPhone={setRecipientPhone}
                  recipientName={recipientName}
                  setRecipientName={setRecipientName}
                  recipientPendingClaim={recipientPendingClaim}
                  setRecipientPendingClaim={setRecipientPendingClaim}
                  giftMessage={giftMessage}
                  setGiftMessage={setGiftMessage}
                  notes={notes}
                  setNotes={setNotes}
                  lookingUp={lookingUp}
                  lookupBuyer={lookupBuyer}
                  lookingUpRecipient={lookingUpRecipient}
                  lookupRecipient={lookupRecipient}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  showPaymentMethod
                  inputClass={inputClass}
                  labelClass={labelClass}
                  isDark={isDark}
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={saving || activeRequestId}
                  className="w-full py-3 bg-gold text-charcoal font-heading rounded-lg hover:bg-gold/90 disabled:opacity-50"
                >
                  {saving ? 'Processing…' : 'Complete Sale'}
                </button>
              </form>
            )}

            {canComplete && (
              <div className={cardClass}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl text-gold">Cashier Queue</h2>
                  <button type="button" onClick={loadQueue} className="text-sm text-gold hover:underline">
                    {loadingQueue ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
                {queueError && (
                  <p className="text-red-400 text-sm mb-3">{queueError}</p>
                )}
                {loadingQueue ? (
                  <p className={isDark ? 'text-offwhite/50' : 'text-charcoal/50'}>Loading…</p>
                ) : !queueError && pendingRequests.length === 0 ? (
                  <p className={isDark ? 'text-offwhite/50' : 'text-charcoal/50'}>No pending gift card sales.</p>
                ) : !queueError ? (
                  <div className="space-y-3">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className={clsx('p-4 rounded-lg border', isDark ? 'border-gold/20 bg-offwhite/5' : 'border-gold/30 bg-charcoal/5')}
                      >
                        <div className="flex justify-between gap-3 mb-2">
                          <div>
                            <div className="font-medium">${Number(req.amount || 0).toFixed(2)}</div>
                            <div className={clsx('text-sm', isDark ? 'text-offwhite/60' : 'text-charcoal/60')}>
                              Buyer: {req.buyer_name} · Owner: {req.owner_name}
                            </div>
                            <div className={clsx('text-xs mt-1', isDark ? 'text-offwhite/40' : 'text-charcoal/40')}>
                              Requested by {req.requested_by_name}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            disabled={saving && completingRequestId === req.id}
                            onClick={() => handleCompleteRequestClick(req)}
                            className="px-3 py-1.5 bg-gold text-charcoal rounded-lg text-sm font-semibold disabled:opacity-50"
                          >
                            {saving && completingRequestId === req.id ? 'Processing…' : 'Collect Payment & Complete'}
                          </button>
                          {canRequest && req.requested_by_id === user.id && (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(req.id)}
                              className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      <AppModal
        open={!!completeConfirm}
        onClose={() => !saving && setCompleteConfirm(null)}
        title="Confirm Gift Card Sale"
        maxWidth="max-w-md"
        footer={(
          <>
            <button
              type="button"
              onClick={() => setCompleteConfirm(null)}
              disabled={saving}
              className={modalBtnSecondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmCompleteSale}
              disabled={saving}
              className={modalBtnPrimary}
            >
              {saving ? 'Processing…' : 'Confirm & Complete'}
            </button>
          </>
        )}
      >
        <p className={clsx('text-sm', isDark ? 'text-offwhite/70' : 'text-charcoal/70')}>
          Have you collected{' '}
          <span className="text-gold font-semibold">${confirmAmountLabel}</span>
          {' '}via{' '}
          <span className="font-medium">{confirmPaymentLabel}</span>
          {' '}from{' '}
          <span className="font-medium">{confirmBuyer}</span>?
        </p>
        <p className={clsx('text-sm mt-3', isDark ? 'text-offwhite/50' : 'text-charcoal/50')}>
          This will issue a ${confirmAmountLabel} gift card for {confirmRecipient}. This cannot be undone.
        </p>
      </AppModal>
    </div>
  );
}

function sanitizePhoneInput(value) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function sanitizeAmountInput(value) {
  let cleaned = value.replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1) {
    cleaned = `${cleaned.slice(0, dotIndex + 1)}${cleaned.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2)}`;
  }
  return cleaned;
}

function FormFields({
  buyerPhone,
  setBuyerPhone,
  buyerName,
  amount,
  setAmount,
  giftToOther,
  setGiftToOther,
  recipientPhone,
  setRecipientPhone,
  recipientName,
  setRecipientName,
  recipientPendingClaim,
  setRecipientPendingClaim,
  giftMessage,
  setGiftMessage,
  notes,
  setNotes,
  lookingUp,
  lookupBuyer,
  lookingUpRecipient,
  lookupRecipient,
  paymentMethod,
  setPaymentMethod,
  showPaymentMethod = false,
  inputClass,
  labelClass,
  isDark,
}) {
  return (
    <>
      <div>
        <label className={labelClass}>Buyer Phone</label>
        <div className="flex gap-2">
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            value={buyerPhone}
            onChange={(e) => {
              setBuyerPhone(sanitizePhoneInput(e.target.value));
              setBuyerName('');
            }}
            className={inputClass}
            placeholder="10-digit phone"
            required
          />
          <button
            type="button"
            onClick={lookupBuyer}
            disabled={lookingUp}
            className="px-4 py-2 bg-gold/20 text-gold border border-gold/30 rounded-lg whitespace-nowrap"
          >
            {lookingUp ? '...' : 'Lookup'}
          </button>
        </div>
        {buyerName && <p className="text-sm text-gold mt-2">{buyerName}</p>}
      </div>

      <div>
        <label className={labelClass}>Amount</label>
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          {GIFT_CARD_PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={clsx(
                'px-4 py-2 rounded-lg border',
                amount === String(preset)
                  ? 'bg-gold text-charcoal border-gold'
                  : isDark ? 'border-gold/30 text-gold' : 'border-gold/40 text-charcoal',
              )}
            >
              ${preset}
            </button>
          ))}
          <div className="relative w-28 sm:w-32">
            <span className={clsx('absolute left-3 top-1/2 -translate-y-1/2', isDark ? 'text-offwhite/50' : 'text-charcoal/50')}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
              className={clsx(inputClass, 'pl-7 py-2 w-full')}
              placeholder="Custom"
              required
            />
          </div>
          {showPaymentMethod && (
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={clsx(inputClass, 'py-2 w-full sm:w-auto sm:min-w-[8.5rem]')}
              aria-label="Payment method"
            >
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
              <option value="Transfer">Transfer</option>
            </select>
          )}
        </div>
        <GiftCardPreview
          amount={amount}
          buyerName={buyerName}
          giftToOther={giftToOther}
          recipientName={recipientName}
          recipientPhone={recipientPhone}
          giftMessage={giftMessage}
          isDark={isDark}
        />
      </div>

      <label className={clsx('flex items-center gap-3 cursor-pointer', isDark ? 'text-offwhite/80' : 'text-charcoal/80')}>
        <input type="checkbox" checked={giftToOther} onChange={(e) => setGiftToOther(e.target.checked)} />
        Gift to another customer
      </label>

      {giftToOther && (
        <div className="space-y-4 pl-1 border-l-2 border-gold/30 ml-1">
          <div>
            <label className={labelClass}>Recipient Phone</label>
            <div className="flex gap-2">
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={recipientPhone}
                onChange={(e) => {
                  setRecipientPhone(sanitizePhoneInput(e.target.value));
                  setRecipientName('');
                  setRecipientPendingClaim(false);
                }}
                className={inputClass}
                placeholder="10-digit phone"
                required
              />
              <button
                type="button"
                onClick={lookupRecipient}
                disabled={lookingUpRecipient}
                className="px-4 py-2 bg-gold/20 text-gold border border-gold/30 rounded-lg whitespace-nowrap"
              >
                {lookingUpRecipient ? '...' : 'Lookup'}
              </button>
            </div>
            {recipientName && <p className="text-sm text-gold mt-2">{recipientName}</p>}
            {recipientPendingClaim && (
              <p className={clsx('text-sm mt-2', isDark ? 'text-amber-200/80' : 'text-amber-700')}>
                Not registered yet — they can claim after signup via the share link you will receive.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Recipient Name (optional)</label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className={inputClass}
              placeholder="Friend's name"
            />
          </div>
          <div>
            <label className={labelClass}>Gift Message (optional)</label>
            <textarea value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} className={clsx(inputClass, 'resize-none')} rows={2} />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Internal Notes (optional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={clsx(inputClass, 'resize-none')} rows={2} />
      </div>
    </>
  );
}

function GiftCardPreview({
  amount,
  buyerName,
  giftToOther,
  recipientName,
  recipientPhone,
  giftMessage,
  isDark,
}) {
  const value = parseFloat(amount);
  const hasAmount = Number.isFinite(value) && value >= GIFT_CARD_MIN_AMOUNT;

  const ownerName = giftToOther
    ? (recipientName || null)
    : (buyerName || null);

  return (
    <GiftCardVisual
      isDark={isDark}
      balance={hasAmount ? value : null}
      initialAmount={hasAmount ? value : null}
      ownerName={ownerName}
      expiryText={`Valid for ${GIFT_CARD_EXPIRY_PERIOD_LABEL}`}
      giftMessage={giftToOther && giftMessage.trim() ? giftMessage.trim() : null}
    />
  );
}
