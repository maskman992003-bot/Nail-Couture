import { supabase } from '../lib/supabase';

export const GIFT_CARD_PRESET_AMOUNTS = [25, 50, 75, 100];
export const GIFT_CARD_MIN_AMOUNT = 10;
export const GIFT_CARD_MAX_AMOUNT = 500;
export const GIFT_CARD_EXPIRY_MONTHS = 12;
export const GIFT_CARD_EXPIRY_PERIOD_LABEL = '1 year';

export const GIFT_CARD_STATUS_LABELS = {
  active: 'Active',
  depleted: 'Used',
  voided: 'Voided',
  expired: 'Expired',
};

export const GIFT_CARD_COMPLETE_ROLES = ['cashier', 'super_admin'];
export const GIFT_CARD_REQUEST_ROLES = ['owner', 'partner', 'admin'];
export const GIFT_CARD_SALES_ACCESS_ROLES = [...GIFT_CARD_COMPLETE_ROLES, ...GIFT_CARD_REQUEST_ROLES];

export function canCompleteGiftCardSale(role) {
  return GIFT_CARD_COMPLETE_ROLES.includes(role);
}

export function canRequestGiftCardSale(role) {
  return GIFT_CARD_REQUEST_ROLES.includes(role);
}

export function canAccessGiftCardSales(role) {
  return GIFT_CARD_SALES_ACCESS_ROLES.includes(role);
}

export function canViewGiftCardCode(role) {
  return role === 'super_admin';
}

export function stripGiftCardCodeFromSaleResult(result, role) {
  if (!result?.gift_card || canViewGiftCardCode(role)) return result;
  return {
    ...result,
    gift_card: {
      ...result.gift_card,
      code: null,
    },
  };
}

export function stripGiftCardCodeFromLookupResult(result, role) {
  if (!result?.gift_card || canViewGiftCardCode(role)) return result;
  const { code, ...rest } = result.gift_card;
  return {
    ...result,
    gift_card: {
      ...rest,
      code: null,
      code_display: rest.code_display || maskGiftCardCode(code),
    },
  };
}

export function getGiftCardDisplayCode(card) {
  if (!card) return '';
  if (card.code_display) return card.code_display;
  if (card.code) return maskGiftCardCode(card.code);
  return 'GC-****-****';
}

export function getGiftCardConfirmationLabel() {
  return 'Ask the customer for the first 3 characters of the middle section of their gift card code.';
}

export function getGiftCardMiddleConfirmChars(code) {
  const raw = String(code || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return raw.length >= 5 ? raw.slice(2, 5) : '';
}

export function toCheckoutGiftCard(card) {
  if (!card) return null;
  const giftedFromName = card.gifted_from_name
    || (card.purchased_by_id && card.owner_id && card.purchased_by_id !== card.owner_id
      ? card.purchased_by_name
      : null);
  return {
    id: card.id,
    balance: card.balance,
    initial_amount: card.initial_amount,
    expires_at: card.expires_at,
    status: card.status,
    code_display: card.code_display || maskGiftCardCode(card.code),
    gifted_from_name: giftedFromName || null,
    created_at: card.created_at,
  };
}

export function filterRedeemableCheckoutGiftCards(cards, customerId) {
  return (cards || [])
    .filter((card) => (
      card.owner_id === customerId
      && card.status === 'active'
      && Number(card.balance) > 0
      && !isGiftCardExpired(card)
    ))
    .map(toCheckoutGiftCard)
    .filter(Boolean);
}

function rpcUnavailable(error, fnName) {
  return error?.message?.includes(fnName) || error?.code === '42883';
}

function normalizePhoneDigits(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

export function formatGiftCardCode(code) {
  if (!code) return '';
  const raw = String(code).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (raw.startsWith('GC') && raw.length >= 10) {
    return `GC-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
  }
  return String(code).toUpperCase();
}

export function maskGiftCardCode(code) {
  const formatted = formatGiftCardCode(code);
  if (!formatted || formatted.length < 8) return '****';
  return `${formatted.slice(0, 3)}-****-${formatted.slice(-4)}`;
}

export function isGiftCardExpired(card) {
  if (!card) return false;
  if (card.status === 'expired' || card.is_expired) return true;
  if (!card.expires_at) return false;
  return new Date(card.expires_at) <= new Date();
}

export function getGiftCardDisplayStatus(card) {
  if (isGiftCardExpired(card)) return 'expired';
  return card?.status || 'active';
}

export function formatGiftCardExpiryDate(expiresAt) {
  if (!expiresAt) return '';
  return new Date(expiresAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getGiftCardExpiryLabel(card) {
  if (!card?.expires_at) return null;
  const formatted = formatGiftCardExpiryDate(card.expires_at);
  return isGiftCardExpired(card) ? `Expired ${formatted}` : `Expires ${formatted}`;
}

export function getGiftCardGiftedFromLabel(card) {
  if (!card) return null;
  const name = card.gifted_from_name
    || (card.purchased_by_id && card.owner_id && card.purchased_by_id !== card.owner_id
      ? card.purchased_by_name
      : null);
  if (!name) return null;
  return `Gifted from ${name}`;
}

export function getGiftCardRecipientLabel(card) {
  if (!card?.owner_name) return null;
  return card.owner_name;
}

export function canTransferGiftCard(card) {
  if (!card) return false;
  return (
    card.status === 'active'
    && !isGiftCardExpired(card)
    && !card.first_used_at
    && Number(card.balance) === Number(card.initial_amount)
  );
}

export function computeGiftCardCheckoutSplit({ serviceDue, tip = 0, balance = 0, requestedAmount = null }) {
  const service = Math.max(0, Number(serviceDue) || 0);
  const tipAmount = Math.max(0, Number(tip) || 0);
  const totalDue = service + tipAmount;
  const available = Math.max(0, Number(balance) || 0);
  const maxApply = requestedAmount != null
    ? Math.min(available, Math.max(0, Number(requestedAmount) || 0))
    : Math.min(available, totalDue);
  const giftCardAmount = roundMoney(maxApply);
  const cashDue = roundMoney(Math.max(0, totalDue - giftCardAmount));
  return { serviceDue: service, tip: tipAmount, totalDue: roundMoney(totalDue), giftCardAmount, cashDue };
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function formatGiftCardPaymentMethod(method) {
  const labels = {
    cash: 'Cash',
    card: 'Card',
    other: 'Transfer',
    mixed: 'Gift card + other',
    gift_card: 'Gift card',
  };
  return labels[method] || method || 'Other';
}

export function formatGiftCardReceiptLines({ giftCardAmount = 0, cashAmount = 0, paymentMethod = 'card' }) {
  const lines = [];
  if (giftCardAmount > 0) {
    lines.push(`Gift card: $${roundMoney(giftCardAmount).toFixed(2)}`);
  }
  if (cashAmount > 0) {
    lines.push(`${formatGiftCardPaymentMethod(paymentMethod)}: $${roundMoney(cashAmount).toFixed(2)}`);
  }
  return lines;
}

export async function purchaseGiftCard({
  callerPhone,
  buyerPhone,
  amount,
  paymentMethod = 'card',
  ownerPhone = null,
  recipientName = null,
  giftMessage = null,
  notes = null,
  requestId = null,
}) {
  const { data, error } = await supabase.rpc('purchase_gift_card', {
    caller_phone: normalizePhoneDigits(callerPhone),
    buyer_phone: normalizePhoneDigits(buyerPhone),
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_owner_phone: ownerPhone ? normalizePhoneDigits(ownerPhone) : null,
    p_recipient_name: recipientName || null,
    p_gift_message: giftMessage || null,
    p_notes: notes || null,
    p_request_id: requestId || null,
  });

  if (error) {
    if (rpcUnavailable(error, 'purchase_gift_card')) {
      return { success: false, error: 'Gift card service unavailable. Run sql/084_gift_cards.sql and sql/085_gift_card_sale_requests.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Purchase failed' };
  }

  return data || { success: false, error: 'Unexpected response' };
}

export async function requestGiftCardSale({
  callerPhone,
  buyerPhone,
  amount,
  ownerPhone = null,
  recipientName = null,
  giftMessage = null,
  notes = null,
}) {
  const { data, error } = await supabase.rpc('request_gift_card_sale', {
    caller_phone: normalizePhoneDigits(callerPhone),
    buyer_phone: normalizePhoneDigits(buyerPhone),
    p_amount: amount,
    p_owner_phone: ownerPhone ? normalizePhoneDigits(ownerPhone) : null,
    p_recipient_name: recipientName || null,
    p_gift_message: giftMessage || null,
    p_notes: notes || null,
  });

  if (error) {
    if (rpcUnavailable(error, 'request_gift_card_sale')) {
      return { success: false, error: 'Gift card requests unavailable. Run sql/085_gift_card_sale_requests.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Request failed' };
  }

  return data || { success: false, error: 'Unexpected response' };
}

export async function fetchGiftCardSaleRequests(callerPhone, status = 'pending') {
  const { data, error } = await supabase.rpc('get_gift_card_sale_requests', {
    caller_phone: normalizePhoneDigits(callerPhone),
    p_status: status,
  });

  if (error) {
    if (rpcUnavailable(error, 'get_gift_card_sale_requests')) {
      return { success: false, requests: [], error: 'Gift card queue unavailable.' };
    }
    throw error;
  }

  return data || { success: false, requests: [] };
}

export async function cancelGiftCardSaleRequest({ callerPhone, requestId }) {
  const { data, error } = await supabase.rpc('cancel_gift_card_sale_request', {
    caller_phone: normalizePhoneDigits(callerPhone),
    p_request_id: requestId,
  });

  if (error) {
    if (rpcUnavailable(error, 'cancel_gift_card_sale_request')) {
      return { success: false, error: 'Cancel unavailable. Run sql/085_gift_card_sale_requests.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Cancel failed' };
  }

  return data || { success: false, error: 'Unexpected response' };
}

export async function transferGiftCard({ ownerPhone, giftCardId, recipientPhone, giftMessage = null }) {
  const { data, error } = await supabase.rpc('transfer_gift_card', {
    owner_phone: ownerPhone,
    p_gift_card_id: giftCardId,
    recipient_phone: recipientPhone,
    p_gift_message: giftMessage || null,
  });

  if (error) {
    if (rpcUnavailable(error, 'transfer_gift_card')) {
      return { success: false, error: 'Gift card transfer unavailable. Run sql/084_gift_cards.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Transfer failed' };
  }

  return data || { success: false, error: 'Unexpected response' };
}

export async function getMyGiftCards(phone) {
  const { data, error } = await supabase.rpc('get_my_gift_cards', { p_phone: phone });

  if (error) {
    if (rpcUnavailable(error, 'get_my_gift_cards')) {
      return { success: false, owned: [], purchased_for_others: [], error: 'Gift cards unavailable.' };
    }
    throw error;
  }

  return data || { success: false, owned: [], purchased_for_others: [] };
}

export async function lookupGiftCardByCode(callerPhone, code) {
  const { data, error } = await supabase.rpc('lookup_gift_card', {
    caller_phone: callerPhone,
    p_code: code,
  });

  if (error) {
    if (rpcUnavailable(error, 'lookup_gift_card')) {
      return { success: false, error: 'Gift card lookup unavailable. Run sql/084_gift_cards.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Lookup failed' };
  }

  return data || { success: false, error: 'Gift card not found' };
}

export async function getCustomerGiftCards(callerPhone, customerId) {
  const { data, error } = await supabase.rpc('get_customer_gift_cards', {
    caller_phone: callerPhone,
    p_customer_id: customerId,
  });

  if (error) {
    if (rpcUnavailable(error, 'get_customer_gift_cards')) {
      return { success: false, gift_cards: [], error: 'Gift cards unavailable.' };
    }
    throw error;
  }

  return data || { success: false, gift_cards: [] };
}

export async function getCheckoutGiftCards(callerPhone, customerId) {
  const { data, error } = await supabase.rpc('get_checkout_gift_cards', {
    caller_phone: callerPhone,
    p_customer_id: customerId,
  });

  if (!error) {
    const giftCards = data?.gift_cards || [];
    if (giftCards.length > 0) {
      return { success: true, gift_cards: giftCards, error: null };
    }
  } else if (!rpcUnavailable(error, 'get_checkout_gift_cards')) {
    // Auth/other RPC errors may still work via CRM fallback below.
    console.warn('get_checkout_gift_cards failed:', error.message || error);
  }

  try {
    const fallback = await getCustomerGiftCards(callerPhone, customerId);
    const giftCards = filterRedeemableCheckoutGiftCards(fallback.gift_cards, customerId);
    if (giftCards.length > 0) {
      return { success: true, gift_cards: giftCards, error: null };
    }
    if (error && rpcUnavailable(error, 'get_checkout_gift_cards')) {
      return {
        success: false,
        gift_cards: [],
        error: 'Gift card checkout unavailable. Run sql/116_gift_card_checkout_verify.sql in Supabase.',
      };
    }
    return {
      success: true,
      gift_cards: [],
      error: fallback.error || (error ? error.message : null),
    };
  } catch (fallbackError) {
    if (error && rpcUnavailable(error, 'get_checkout_gift_cards')) {
      return {
        success: false,
        gift_cards: [],
        error: 'Gift card checkout unavailable. Run sql/116_gift_card_checkout_verify.sql in Supabase.',
      };
    }
    return {
      success: false,
      gift_cards: [],
      error: fallbackError.message || error?.message || 'Failed to load gift cards',
    };
  }
}

export async function verifyGiftCardForCheckout({
  callerPhone,
  customerId,
  giftCardId,
  confirmation,
}) {
  const { data, error } = await supabase.rpc('verify_gift_card_for_checkout', {
    caller_phone: callerPhone,
    p_customer_id: customerId,
    p_gift_card_id: giftCardId,
    p_confirmation: confirmation,
  });

  if (error) {
    if (rpcUnavailable(error, 'verify_gift_card_for_checkout')) {
      return {
        success: false,
        error: 'Gift card verification unavailable. Run sql/116_gift_card_checkout_verify.sql in Supabase.',
      };
    }
    return { success: false, error: error.message || 'Verification failed' };
  }

  return data || { success: false, error: 'Verification failed' };
}

export async function voidGiftCard({ callerPhone, giftCardId, reason = null }) {
  const { data, error } = await supabase.rpc('void_gift_card', {
    caller_phone: callerPhone,
    p_gift_card_id: giftCardId,
    p_reason: reason || null,
  });

  if (error) {
    if (rpcUnavailable(error, 'void_gift_card')) {
      return { success: false, error: 'Void unavailable. Run sql/084_gift_cards.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Void failed' };
  }

  return data || { success: false, error: 'Unexpected response' };
}

export async function fetchGiftCardPurchases({ cashierId, callerPhone, periodStart, periodEnd } = {}) {
  const filterByPeriodEnd = (purchases) => {
    if (!periodEnd) return purchases;
    const endMs = new Date(periodEnd).getTime();
    return purchases.filter((p) => new Date(p.created_at).getTime() < endMs);
  };

  if (callerPhone) {
    const { data, error } = await supabase.rpc('get_cashier_gift_card_purchases', {
      caller_phone: normalizePhoneDigits(callerPhone),
      p_since: periodStart || null,
    });

    if (error) {
      if (rpcUnavailable(error, 'get_cashier_gift_card_purchases')) {
        return [];
      }
      console.warn('Gift card purchases RPC failed:', error);
      return [];
    }

    return filterByPeriodEnd(data?.purchases || []);
  }

  let query = supabase
    .from('gift_card_purchases')
    .select(`
      id, amount, payment_method, created_at, notes,
      gift_card:gift_cards (
        id, code, balance, status, recipient_name, expires_at,
        owner:profiles!gift_cards_owner_id_fkey ( full_name, phone ),
        buyer:profiles!gift_cards_purchased_by_id_fkey ( full_name, phone )
      )
    `)
    .gte('created_at', periodStart)
    .order('created_at', { ascending: false });

  if (periodEnd) {
    query = query.lt('created_at', periodEnd);
  }

  if (cashierId) {
    query = query.eq('cashier_id', cashierId);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01') return [];
    console.warn('Gift card purchases fetch failed:', error);
    return [];
  }
  return data || [];
}

export async function fetchGiftCardSummary() {
  const [salesResult, liabilityResult, redemptionsResult] = await Promise.all([
    supabase.from('gift_card_purchases').select('amount'),
    supabase.from('gift_cards').select('balance').eq('status', 'active'),
    supabase.from('gift_card_transactions').select('amount').eq('transaction_type', 'redeem'),
  ]);

  const totalSales = (salesResult.data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const outstandingLiability = (liabilityResult.data || []).reduce((sum, row) => sum + Number(row.balance || 0), 0);
  const totalRedeemed = (redemptionsResult.data || []).reduce(
    (sum, row) => sum + Math.abs(Number(row.amount || 0)),
    0,
  );

  return {
    totalSales: roundMoney(totalSales),
    outstandingLiability: roundMoney(outstandingLiability),
    totalRedeemed: roundMoney(totalRedeemed),
    activeCardCount: (liabilityResult.data || []).length,
  };
}

export function buildGiftCardPurchaseReceipt({ giftCard, buyerName, ownerName, paymentMethod, amount }) {
  const code = giftCard?.code || '';
  const maskedCode = maskGiftCardCode(code);
  const amt = Number(amount || giftCard?.initial_amount || 0).toFixed(2);
  return [
    'Nail Couture — Gift Card Receipt',
    '================================',
    `Amount: $${amt}`,
    `Payment: ${formatGiftCardPaymentMethod(paymentMethod)}`,
    `Purchased by: ${buyerName || 'Customer'}`,
    `Recipient: ${ownerName || buyerName || 'Customer'}`,
    `Gift card code: ${maskedCode}`,
    `Valid until: ${formatGiftCardExpiryDate(giftCard?.expires_at) || `${GIFT_CARD_EXPIRY_PERIOD_LABEL} from purchase`}`,
    '',
    'Full code is available in the customer app. Present this receipt at checkout if needed.',
  ].join('\n');
}
