import { parseAppointmentLineItems, calculateLineItemTotal } from './appointmentServices.js';

export const APPOINTMENT_STATUS_LABELS = {
  waiting: 'Waiting',
  checking_in: 'Checking in',
  assigned_pending: 'Assigned',
  serving: 'In Chair',
  ready_for_checkout: 'At Checkout',
  completed: 'Completed',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  missed: 'Missed',
};

export const APPOINTMENT_STATUS_COLORS = {
  waiting: { bg: 'rgba(234,179,8,0.2)', text: '#facc15' },
  checking_in: { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  assigned_pending: { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
  serving: { bg: 'rgba(34,197,94,0.2)', text: '#4ade80' },
  ready_for_checkout: { bg: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  completed: { bg: 'rgba(34,197,94,0.2)', text: '#4ade80' },
  cancelled: { bg: 'rgba(239,68,68,0.2)', text: '#f87171' },
  confirmed: { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
  missed: { bg: 'rgba(107,114,128,0.2)', text: '#9ca3af' },
};

export function formatAppointmentTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function getAppointmentTotalPrice(appointment, availableServices = []) {
  if (!appointment) return 0;

  if (availableServices.length) {
    const { selectedMain, selectedAddons, addOnServices } = parseAppointmentLineItems(
      appointment,
      availableServices,
    );
    if (selectedMain.length || selectedAddons.length) {
      return calculateLineItemTotal(selectedMain, selectedAddons, addOnServices);
    }
  }

  if (appointment.final_price != null) return Number(appointment.final_price) || 0;
  if (appointment.computedServiceTotal != null) return Number(appointment.computedServiceTotal) || 0;
  if (appointment.total_price != null) return Number(appointment.total_price) || 0;

  const basePrice = appointment.services?.price || 0;
  const addOnNames = appointment.add_ons
    ? appointment.add_ons.split(',').map((n) => n.trim()).filter(Boolean)
    : [];

  const addonTotal = addOnNames.reduce((sum, name) => {
    const addon = availableServices.find((s) => s.name === name && s.is_addon);
    return sum + (addon?.price || 0);
  }, 0);

  return basePrice + addonTotal;
}

export function getAppointmentServices(appt) {
  if (!appt) return [];
  const names = new Set();

  if (appt.selected_service_names) {
    appt.selected_service_names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => names.add(n));
  }
  if (appt.add_ons) {
    appt.add_ons.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => names.add(n));
  }
  if (appt.services) {
    if (Array.isArray(appt.services)) {
      appt.services.map((service) => service?.name).filter(Boolean).forEach((n) => names.add(n));
    } else if (appt.services?.name) {
      names.add(appt.services.name);
    }
  }

  return [...names];
}

/** Split appointment fields into main services vs add-ons when available. */
export function getAppointmentServiceGroups(appt) {
  if (!appt) return { main: [], addons: [] };

  let main = appt.selected_service_names
    ? appt.selected_service_names.split(',').map((n) => n.trim()).filter(Boolean)
    : [];
  let addons = appt.add_ons
    ? appt.add_ons.split(',').map((n) => n.trim()).filter(Boolean)
    : [];

  if (!main.length) {
    if (Array.isArray(appt.services)) {
      main = appt.services.map((service) => service?.name).filter(Boolean);
    } else if (appt.services?.name) {
      main.push(appt.services.name);
    }
  }

  if (!appt.selected_service_names && !main.length && addons.length) {
    return { main: [...new Set(addons)], addons: [] };
  }

  return { main: [...new Set(main)], addons: [...new Set(addons)] };
}

export function getAppointmentFinalPrice(appt) {
  if (appt.final_price != null) return appt.final_price;
  if (Array.isArray(appt.services)) {
    return appt.services.reduce((sum, item) => sum + (item?.price || 0), 0);
  }
  return appt.services?.price || 0;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

/** UI-ready checkout totals for appointment detail views (with optional completed payment). */
export function buildAppointmentPriceDisplay(appointment, payment = null, resolveReceiptTotals = null, catalogSubtotal = null) {
  const enrichedAppointment = catalogSubtotal > 0
    ? { ...appointment, computedServiceTotal: catalogSubtotal }
    : appointment;

  const totals = resolveReceiptTotals
    ? resolveReceiptTotals(payment, enrichedAppointment)
    : {
      serviceSubtotal: catalogSubtotal > 0 ? catalogSubtotal : (getAppointmentFinalPrice(appointment) || 0),
      tip: 0,
      discount: 0,
      giftCardAmount: 0,
      cashAmount: getAppointmentFinalPrice(appointment) || 0,
    };

  let serviceSubtotal = totals.serviceSubtotal;
  if (serviceSubtotal <= 0 && catalogSubtotal > 0) {
    serviceSubtotal = roundMoney(catalogSubtotal);
  } else if (serviceSubtotal <= 0 && appointment && !payment) {
    serviceSubtotal = roundMoney(getAppointmentFinalPrice(appointment));
  }

  let discount = roundMoney(totals.discount);
  let tip = roundMoney(totals.tip);
  let giftCardAmount = roundMoney(totals.giftCardAmount);
  const discountType = payment?.discount_type || null;
  let loyaltyLabel = null;

  if (!payment && appointment) {
    const loyaltyDiscount = roundMoney(appointment.loyalty_discount_amount);
    if (loyaltyDiscount > 0) {
      discount = Math.min(loyaltyDiscount, serviceSubtotal);
      loyaltyLabel = appointment.loyalty_reward_name || 'Loyalty reward';
    }
  } else if (discount > 0 && (discountType === 'loyalty' || appointment?.loyalty_reward_name)) {
    loyaltyLabel = appointment?.loyalty_reward_name || 'Loyalty reward';
  }

  const visitTotal = roundMoney(Math.max(0, serviceSubtotal - discount) + tip);
  const amountDue = giftCardAmount > 0
    ? roundMoney(totals.cashAmount ?? Math.max(0, visitTotal - giftCardAmount))
    : visitTotal;

  return {
    serviceSubtotal,
    tip,
    discount,
    discountType: discount > 0 ? (discountType || (loyaltyLabel ? 'loyalty' : 'fixed')) : null,
    loyaltyLabel,
    giftCardAmount,
    visitTotal,
    amountDue,
    hasPayment: Boolean(payment),
  };
}
