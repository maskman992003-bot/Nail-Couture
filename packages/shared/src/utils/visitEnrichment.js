import { supabase } from '../lib/supabase';
import {
  fetchAppointmentServiceHistory,
  buildVisitServiceSummary,
  parseVisitFinalServices,
  fetchServicePriceMap,
  collectServiceNamesFromSummary,
  namesFromVisit,
} from './appointmentServiceHistory';

function visitDate(appointment) {
  return appointment.checked_in_at || appointment.scheduled_at || appointment.created_at;
}

export async function enrichVisits(rawVisits) {
  const appointmentIds = rawVisits.map((v) => v.id);
  const customerIds = [...new Set(rawVisits.map((v) => v.customer_id).filter(Boolean))];

  let paymentsResult = customerIds.length
    ? await supabase
      .from('payment_transactions')
      .select('appointment_id, customer_id, discount_amount, discount_type, payment_method, final_amount, amount, extras_amount, gift_card_amount')
      .in('customer_id', customerIds)
      .eq('status', 'completed')
    : { data: [] };

  if (paymentsResult.error?.code === '42703' || paymentsResult.error?.message?.includes('extras_amount') || paymentsResult.error?.message?.includes('gift_card_amount')) {
    paymentsResult = customerIds.length
      ? await supabase
        .from('payment_transactions')
        .select('appointment_id, customer_id, discount_amount, discount_type, payment_method, final_amount, amount, extras_amount')
        .in('customer_id', customerIds)
        .eq('status', 'completed')
      : { data: [] };
  }

  if (paymentsResult.error?.code === '42703' || paymentsResult.error?.message?.includes('extras_amount')) {
    paymentsResult = customerIds.length
      ? await supabase
        .from('payment_transactions')
        .select('appointment_id, customer_id, discount_amount, discount_type, payment_method, final_amount, amount')
        .in('customer_id', customerIds)
        .eq('status', 'completed')
      : { data: [] };
  }

  const serviceHistoryMap = await fetchAppointmentServiceHistory(appointmentIds);

  const paymentMap = {};
  (paymentsResult.data || []).forEach((p) => {
    if (p.appointment_id) {
      paymentMap[p.appointment_id] = {
        ...p,
        extras_amount: p.extras_amount != null ? Number(p.extras_amount) : 0,
        gift_card_amount: p.gift_card_amount != null ? Number(p.gift_card_amount) : 0,
      };
    }
  });

  const allServiceNames = new Set();
  rawVisits.forEach((v) => {
    namesFromVisit(v).forEach((n) => allServiceNames.add(n));
    const draft = buildVisitServiceSummary(v, serviceHistoryMap[v.id] || []);
    collectServiceNamesFromSummary(v, draft).forEach((n) => allServiceNames.add(n));
  });

  const priceMap = await fetchServicePriceMap([...allServiceNames]);

  return rawVisits.map((v) => {
    const payment = paymentMap[v.id];
    const lineItems = parseVisitFinalServices({ ...v, addonDetails: [] }, priceMap);
    const addonDetails = lineItems.addonItems.map((item) => ({
      id: item.name,
      name: item.name,
      price: item.price ?? priceMap[item.name]?.price ?? 0,
      duration_minutes: null,
    }));
    const catalogSubtotal = lineItems.mainItems.reduce((s, i) => s + (i.price || 0), 0)
      + lineItems.addonItems.reduce((s, i) => s + (i.price || 0), 0);
    const totalPrice = payment?.final_amount ?? v.final_price ?? catalogSubtotal;
    const serviceSummary = buildVisitServiceSummary(
      { ...v, payment, addonDetails },
      serviceHistoryMap[v.id] || [],
      priceMap
    );
    return {
      ...v,
      addonDetails,
      payment,
      totalPrice,
      visitAt: visitDate(v),
      serviceSummary,
      serviceLabel: serviceSummary.finalLabelText,
    };
  });
}

export { visitDate };
