import { supabase } from '../lib/supabase';
import {
  fetchVisitReceipt,
  formatPaymentReceiptRow,
  formatReceiptContent,
  receiptFilename,
} from './customerStats';
import { getTipPeriodRange } from './technicianQueue';

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

export async function fetchCashierTransactions(cashierId, period = 'today') {
  if (!cashierId) return [];

  const periodStart = getTipPeriodRange(period).start.toISOString();

  const { data, error } = await supabase
    .from('payment_transactions')
    .select(PAYMENT_SELECT)
    .eq('cashier_id', cashierId)
    .eq('status', 'completed')
    .gte('created_at', periodStart)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Cashier transactions fetch failed:', error);
    return [];
  }

  return data || [];
}

export function sumTransactionTotals(transactions) {
  return (transactions || []).reduce((sum, tx) => {
    const amount = Number(tx.final_amount ?? tx.amount ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

export function getTransactionServiceLabel(tx) {
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
