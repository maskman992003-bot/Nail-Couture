import { supabase } from '../lib/supabase';
import {
  fetchVisitReceipt,
  formatPaymentReceiptRow,
  formatReceiptContent,
  receiptFilename,
} from './customerStats';
import {
  buildGiftCardPurchaseReceipt,
  fetchGiftCardPurchases,
} from './giftCards';
import { getTipPeriodRange } from './technicianQueue';

export const CASHIER_TX_CHECKOUT = 'checkout';
export const CASHIER_TX_GIFT_CARD_SALE = 'gift_card_sale';

const PAYMENT_SELECT = `
  id,
  appointment_id,
  customer_id,
  final_amount,
  amount,
  extras_amount,
  discount_amount,
  discount_type,
  payment_method,
  created_at,
  status,
  notes,
  gift_card_id,
  gift_card_amount,
  appointments (
    id,
    add_ons,
    selected_service_names,
    services ( name, price )
  ),
  customer:profiles!payment_transactions_customer_id_fkey ( full_name )
`;

function unwrapRelation(value) {
  return Array.isArray(value) ? value[0] : value;
}

function mapGiftCardPurchaseToTransaction(purchase) {
  const card = unwrapRelation(purchase?.gift_card);
  const buyer = unwrapRelation(card?.buyer);
  const owner = unwrapRelation(card?.owner);
  const ownerName = card?.recipient_name || owner?.full_name || null;

  return {
    id: purchase.id,
    type: CASHIER_TX_GIFT_CARD_SALE,
    created_at: purchase.created_at,
    amount: Number(purchase.amount || 0),
    final_amount: Number(purchase.amount || 0),
    payment_method: purchase.payment_method,
    notes: purchase.notes,
    customer: buyer?.full_name ? { full_name: buyer.full_name } : null,
    gift_card: card,
    gift_card_owner_name: ownerName,
  };
}

export function isGiftCardSaleTransaction(tx) {
  return tx?.type === CASHIER_TX_GIFT_CARD_SALE;
}

export const CASHIER_TX_PERIOD_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This week' },
];

export function getCashierTxPeriodLabel(period) {
  const match = CASHIER_TX_PERIOD_OPTIONS.find((o) => o.id === period);
  return match?.label || 'Today';
}

export async function fetchCashierTransactions(cashierId, period = 'today', callerPhone = null) {
  if (!cashierId) return [];

  const { start, end } = getTipPeriodRange(period);
  const periodStart = start.toISOString();
  const periodEnd = end?.toISOString() || null;

  let paymentsQuery = supabase
    .from('payment_transactions')
    .select(PAYMENT_SELECT)
    .eq('cashier_id', cashierId)
    .eq('status', 'completed')
    .gte('created_at', periodStart);
  if (periodEnd) {
    paymentsQuery = paymentsQuery.lt('created_at', periodEnd);
  }

  const [paymentsResult, giftCardPurchases] = await Promise.all([
    paymentsQuery.order('created_at', { ascending: false }),
    fetchGiftCardPurchases({ cashierId, callerPhone, periodStart, periodEnd }),
  ]);

  if (paymentsResult.error) {
    console.warn('Cashier transactions fetch failed:', paymentsResult.error);
  }

  const payments = (paymentsResult.data || []).map((tx) => ({
    ...tx,
    type: CASHIER_TX_CHECKOUT,
  }));
  const giftCardSales = (giftCardPurchases || []).map(mapGiftCardPurchaseToTransaction);

  return [...payments, ...giftCardSales].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function sumTransactionTotals(transactions) {
  return (transactions || []).reduce((sum, tx) => {
    const amount = Number(tx.final_amount ?? tx.amount ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

export function getTransactionServiceLabel(tx) {
  if (isGiftCardSaleTransaction(tx)) {
    const recipient = tx.gift_card_owner_name;
    return recipient ? `Gift card for ${recipient}` : 'Gift card sale';
  }

  const appt = Array.isArray(tx?.appointments) ? tx.appointments[0] : tx?.appointments;
  const names = appt?.selected_service_names;
  if (names) {
    if (Array.isArray(names)) return names.filter(Boolean).join(', ');
    if (typeof names === 'string' && names.trim()) return names.trim();
  }
  if (appt?.add_ons) return appt.add_ons;
  const service = appt?.services;
  const serviceName = Array.isArray(service) ? service[0]?.name : service?.name;
  if (serviceName) return serviceName;
  return 'Salon service';
}

export function mapPaymentToReceiptRow(tx) {
  return {
    id: tx.id,
    appointmentId: tx.appointment_id,
    date: tx.created_at,
    serviceName: getTransactionServiceLabel(tx),
    amount: Number(tx.amount || 0),
    extras: Number(tx.extras_amount || 0),
    discount: Number(tx.discount_amount || 0),
    discountType: tx.discount_type,
    finalAmount: Number(tx.final_amount || 0),
    paymentMethod: tx.payment_method || 'other',
    giftCardAmount: Number(tx.gift_card_amount || 0),
  };
}

export async function buildCashierReceiptContent(tx, callerPhone) {
  if (isGiftCardSaleTransaction(tx)) {
    const card = unwrapRelation(tx.gift_card);
    const buyer = unwrapRelation(card?.buyer);
    const owner = unwrapRelation(card?.owner);
    const content = buildGiftCardPurchaseReceipt({
      giftCard: card,
      buyerName: buyer?.full_name || tx.customer?.full_name,
      ownerName: tx.gift_card_owner_name || owner?.full_name,
      paymentMethod: tx.payment_method,
      amount: tx.amount,
    });

    return {
      content,
      filename: receiptFilename(tx.created_at, tx.id),
    };
  }

  const receiptRow = mapPaymentToReceiptRow(tx);
  let content = formatPaymentReceiptRow(receiptRow);

  if (tx.appointment_id && tx.customer_id) {
    try {
      const receipt = await fetchVisitReceipt(
        tx.appointment_id,
        tx.customer_id,
        callerPhone,
      );
      if (receipt?.appointment) content = formatReceiptContent(receipt);
    } catch (detailErr) {
      console.warn('Full receipt lookup failed, using payment summary:', detailErr);
    }
  }

  return {
    content,
    filename: receiptFilename(tx.created_at, tx.appointment_id || tx.id),
  };
}
