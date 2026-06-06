import { supabase } from '../lib/supabase';
import { enrichAppointmentsWithServices } from './appointmentServices';

function visitDate(appointment) {
  return appointment.checked_in_at || appointment.scheduled_at || appointment.created_at;
}

async function resolveCustomerIds(customerId, phone) {
  const ids = new Set();
  if (customerId) ids.add(customerId);
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone) {
      const { data } = await supabase.from('profiles').select('id').eq('phone', cleanPhone);
      (data || []).forEach((profile) => ids.add(profile.id));
    }
  }
  return [...ids];
}

const APPOINTMENT_SELECT = `
  id, customer_id, status, booking_type, final_price, checked_in_at, scheduled_at, created_at,
  start_time, completed_at,
  service_id, technician_id, add_ons, selected_service_names, notes,
  loyalty_reward_id, loyalty_reward_name, loyalty_points_cost, loyalty_redemption_code,
  services:appointments_service_id_fkey(id, name, price, duration_minutes),
  technicians:profiles!appointments_technician_id_fkey!left(id, full_name, role)
`;

export async function fetchCustomerVisitHistory(customerId, phone, { includeOnline = false } = {}) {
  const customerIds = await resolveCustomerIds(customerId, phone);
  if (!customerIds.length) return [];

  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .in('customer_id', customerIds);

  if (!includeOnline) {
    query = query.or('booking_type.eq.walk_in,booking_type.is.null');
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

const GLOBAL_VISIT_SELECT = `
  ${APPOINTMENT_SELECT.trim()},
  customer:profiles!appointments_client_id_fkey(id, full_name, email, phone)
`;

export async function fetchGlobalVisitHistory({
  limit = 50,
  includeOnline = true,
  fromDate,
  toDate,
  cursor,
} = {}) {
  let query = supabase
    .from('appointments')
    .select(GLOBAL_VISIT_SELECT);

  if (!includeOnline) {
    query = query.or('booking_type.eq.walk_in,booking_type.is.null');
  }

  if (fromDate) query = query.gte('created_at', fromDate);
  if (toDate) query = query.lte('created_at', toDate);

  const fetchLimit = cursor ? limit + 50 : limit + 10;

  const { data, error } = await query
    .order('checked_in_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (error) throw error;

  let rows = data || [];

  if (cursor) {
    rows = rows.filter((visit) => {
      const visitAt = visit.checked_in_at || visit.scheduled_at || visit.created_at;
      const eventTime = new Date(visitAt).getTime();
      const cursorTime = new Date(cursor.date).getTime();
      if (eventTime < cursorTime) return true;
      if (eventTime > cursorTime) return false;
      return String(visit.id) < String(cursor.id);
    });
  }

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const lastVisit = page[page.length - 1];
  const lastVisitAt = lastVisit
    ? (lastVisit.checked_in_at || lastVisit.scheduled_at || lastVisit.created_at)
    : null;

  return {
    rows: page,
    hasMore,
    nextCursor: hasMore && lastVisitAt
      ? { date: lastVisitAt, id: lastVisit.id }
      : null,
  };
}

export async function fetchVisitLoyaltyPoints(customerIds) {
  if (!customerIds.length) return {};

  const { data } = await supabase
    .from('loyalty_transactions')
    .select('points, metadata, created_at, transaction_type')
    .in('profile_id', customerIds)
    .eq('transaction_type', 'earn')
    .gt('points', 0)
    .order('created_at', { ascending: false });

  const byAppointment = {};
  (data || []).forEach((row) => {
    const appointmentId = row.metadata?.appointment_id;
    if (appointmentId && !byAppointment[appointmentId]) {
      byAppointment[appointmentId] = row.points;
    }
  });
  return byAppointment;
}

export async function fetchVisitPayments(customerIds) {
  if (!customerIds.length) return {};

  const { data } = await supabase
    .from('payment_transactions')
    .select('appointment_id, amount, extras_amount, discount_amount, discount_type, final_amount, payment_method, created_at, status')
    .in('customer_id', customerIds)
    .eq('status', 'completed');

  const map = {};
  (data || []).forEach((row) => {
    if (row.appointment_id) map[row.appointment_id] = row;
  });
  return map;
}

export async function fetchVisitPayment(appointmentId) {
  const baseSelect = 'amount, discount_amount, discount_type, final_amount, payment_method, created_at';
  let { data: payment, error } = await supabase
    .from('payment_transactions')
    .select(`${baseSelect}, extras_amount`)
    .eq('appointment_id', appointmentId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error?.code === '42703' || error?.message?.includes('extras_amount')) {
    ({ data: payment, error } = await supabase
      .from('payment_transactions')
      .select(baseSelect)
      .eq('appointment_id', appointmentId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle());
  }

  if (error) throw error;
  if (!payment) return null;

  return {
    ...payment,
    extras_amount: payment.extras_amount != null ? Number(payment.extras_amount) : 0,
  };
}

export function buildReceiptFromBooking(booking, payment = null) {
  return {
    appointment: booking,
    payment,
    loyaltyPointsEarned: booking.loyaltyPointsEarned ?? null,
  };
}

export async function fetchVisitReceipt(appointmentId, customerId, phone, bookingFallback = null) {
  if (bookingFallback) {
    const payment = await fetchVisitPayment(appointmentId);
    return buildReceiptFromBooking(bookingFallback, payment);
  }

  const customerIds = await resolveCustomerIds(customerId, phone);
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', appointmentId)
    .in('customer_id', customerIds)
    .maybeSingle();

  if (error) throw error;
  if (!appointment) return null;

  const [enriched] = await enrichAppointmentsWithServices(supabase, [appointment]);
  const payment = await fetchVisitPayment(appointmentId);

  return buildReceiptFromBooking(enriched, payment);
}

export function computeServingDurationMinutes(appointment) {
  const start = appointment.start_time;
  const end = appointment.completed_at;
  if (!start || !end) return null;
  const minutes = Math.round((new Date(end) - new Date(start)) / 60000);
  return minutes > 0 ? minutes : null;
}

export function computeActualDurationMinutes(appointment) {
  const start = appointment.start_time || appointment.checked_in_at;
  const end = appointment.completed_at;
  if (!start || !end) return null;
  const minutes = Math.round((new Date(end) - new Date(start)) / 60000);
  return minutes > 0 ? minutes : null;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function sumAppointmentServiceSubtotal(appointment) {
  if (!appointment) return 0;

  if (Number(appointment.computedServiceTotal) > 0) {
    return roundMoney(appointment.computedServiceTotal);
  }

  const mainServices = appointment.mainServices?.length
    ? appointment.mainServices
    : appointment.services
      ? [appointment.services]
      : [];
  const addonDetails = appointment.addonDetails || [];

  const mainTotal = mainServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const addOnTotal = addonDetails.reduce((sum, addon) => sum + Number(addon.price || 0), 0);

  return roundMoney(mainTotal + addOnTotal);
}

function deriveServiceSubtotalFromPayment(payment) {
  const amount = Number(payment.amount || 0);
  const tip = Number(payment.extras_amount ?? payment.extras ?? 0);
  const discount = Number(payment.discount_amount ?? payment.discount ?? 0);
  const total = Number(payment.final_amount ?? payment.finalAmount ?? 0);

  if (amount > 0) {
    // Current checkout: amount = services only → amount - discount + tip = total
    if (Math.abs(amount - discount + tip - total) < 0.02) {
      return roundMoney(amount);
    }

    // Legacy: amount included tip in the same field
    if (tip > 0 && amount >= tip - 0.009) {
      return roundMoney(Math.max(0, amount - tip));
    }

    return roundMoney(amount);
  }

  if (total > 0) {
    return roundMoney(Math.max(0, total + discount - tip));
  }

  return 0;
}

/** Normalize payment rows so service subtotal, tip, discount, and total are consistent on receipts. */
export function resolveReceiptTotals(payment, appointment = null) {
  const catalogSubtotal = sumAppointmentServiceSubtotal(appointment);
  let serviceSubtotal = catalogSubtotal > 0
    ? catalogSubtotal
    : payment
      ? deriveServiceSubtotalFromPayment(payment)
      : 0;

  if (!payment) {
    return {
      serviceSubtotal,
      tip: 0,
      discount: 0,
      total: serviceSubtotal,
      paymentMethod: 'N/A',
    };
  }

  let tip = roundMoney(payment.extras_amount ?? payment.extras ?? 0);
  let discount = roundMoney(payment.discount_amount ?? payment.discount ?? 0);
  discount = Math.min(Math.max(0, discount), serviceSubtotal);

  if (tip <= 0) {
    const storedTotal = Number(payment.final_amount ?? payment.finalAmount ?? 0);
    if (storedTotal > 0) {
      const inferredTip = storedTotal + discount - serviceSubtotal;
      if (inferredTip > 0.009) {
        tip = roundMoney(inferredTip);
      }
    }
  }

  const computedTotal = roundMoney(Math.max(0, serviceSubtotal - discount) + tip);

  return {
    serviceSubtotal,
    tip,
    discount,
    total: computedTotal,
    paymentMethod: payment.payment_method || payment.paymentMethod || 'N/A',
  };
}

function formatReceiptTotalsBlock({ serviceSubtotal, tip, discount, total, paymentMethod, discountType }) {
  const discountLabel = discountType ? ` (${discountType}, services only)` : ' (services only)';
  return `
Subtotal: $${serviceSubtotal.toFixed(2)}
${tip > 0 ? `Tip: $${tip.toFixed(2)}\n` : ''}${discount > 0 ? `Discount${discountLabel}: -$${discount.toFixed(2)}\n` : ''}Total Paid: $${total.toFixed(2)}
=======================
Payment: ${paymentMethod}`.trim();
}

export function receiptFilename(bookingOrDate, appointmentId) {
  const datePart = new Date(bookingOrDate || Date.now()).toISOString().slice(0, 10);
  const idPart = appointmentId ? String(appointmentId).slice(0, 8) : 'visit';
  return `Nail-Couture-Receipt-${datePart}-${idPart}.txt`;
}

export function downloadTextFile(content, filename) {
  if (!content?.trim()) throw new Error('Receipt content is empty');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 250);
}

export function formatPaymentReceiptRow(row) {
  const dateStr = row.date ? new Date(row.date).toLocaleDateString() : 'N/A';
  const timeStr = row.date ? new Date(row.date).toLocaleTimeString() : '';
  const totals = resolveReceiptTotals({
    amount: row.amount,
    extras_amount: row.extras,
    discount_amount: row.discount,
    discount_type: row.discountType,
    final_amount: row.finalAmount,
    payment_method: row.paymentMethod,
  });

  return `
NAIL COUTURE - RECEIPT
=======================
Service: ${row.serviceName || 'Salon service'}
Date: ${dateStr}
Time: ${timeStr}
------------------------
${formatReceiptTotalsBlock({ ...totals, discountType: row.discountType })}
=======================
Thank you for visiting Nail Couture!
`.trim();
}

export function formatReceiptContent(receipt) {
  if (!receipt?.appointment) return '';

  const { appointment, payment, loyaltyPointsEarned } = receipt;
  const dateSource = appointment.checked_in_at || appointment.scheduled_at || payment?.created_at;
  const dateStr = dateSource ? new Date(dateSource).toLocaleDateString() : 'N/A';
  const timeStr = dateSource ? new Date(dateSource).toLocaleTimeString() : '';
  const actualMinutes = computeActualDurationMinutes(appointment);
  const catalogMinutes = appointment.mainServices?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
    || appointment.services?.duration_minutes
    || null;

  const serviceLines = (appointment.mainServices?.length
    ? appointment.mainServices
    : appointment.services
      ? [appointment.services]
      : []
  ).map((s) => `  ${s.name}: $${Number(s.price || 0).toFixed(2)}`).join('\n');

  const addOnLines = (appointment.addonDetails || [])
    .map((a) => `  + ${a.name}: $${Number(a.price || 0).toFixed(2)}`)
    .join('\n');

  const totals = resolveReceiptTotals(payment, appointment);
  const discountType = payment?.discount_type || null;

  return `
NAIL COUTURE - RECEIPT
=======================
Services:
${serviceLines || '  N/A'}
${addOnLines ? `Add-Ons:\n${addOnLines}\n` : ''}Date: ${dateStr}
Time: ${timeStr}
${appointment.tech?.full_name || appointment.technicians?.full_name ? `Technician: ${appointment.tech?.full_name || appointment.technicians?.full_name}\n` : ''}Duration: ${actualMinutes != null ? `${actualMinutes} min (actual)` : catalogMinutes ? `${catalogMinutes} min (scheduled)` : 'N/A'}
------------------------
${formatReceiptTotalsBlock({ ...totals, discountType })}
${loyaltyPointsEarned ? `Loyalty Points Earned: +${loyaltyPointsEarned}\n` : ''}Status: ${(appointment.status || '').toUpperCase()}
=======================
Thank you for visiting Nail Couture!
`.trim();
}

export async function fetchCustomerStats(customerId, phone) {
  const customerIds = await resolveCustomerIds(customerId, phone);
  const [apptsRes, paymentsRes, techsRes] = await Promise.all([
    customerIds.length
      ? supabase
        .from('appointments')
        .select('id, status, booking_type, final_price, checked_in_at, scheduled_at, created_at, service_id, technician_id, add_ons, selected_service_names, services:appointments_service_id_fkey(name)')
        .in('customer_id', customerIds)
        .or('booking_type.eq.walk_in,booking_type.is.null')
        .order('checked_in_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('payment_transactions')
      .select('final_amount, created_at, status')
      .eq('customer_id', customerId)
      .eq('status', 'completed'),
    supabase.from('profiles').select('id, full_name').neq('role', 'customer'),
  ]);

  const appointments = apptsRes.data || [];
  const completed = appointments.filter((a) => a.status === 'completed');
  const payments = paymentsRes.data || [];

  let totalSpent = payments.reduce((sum, p) => sum + Number(p.final_amount || 0), 0);
  if (!totalSpent && completed.length) {
    totalSpent = completed.reduce((sum, a) => sum + Number(a.final_price || 0), 0);
  }

  const serviceCounts = {};
  completed.forEach((a) => {
    const name = a.selected_service_names || a.services?.name || a.add_ons || 'Visit';
    serviceCounts[name] = (serviceCounts[name] || 0) + 1;
  });
  const favoriteEntry = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0];
  const favoriteService = favoriteEntry?.[0] || null;
  const favoriteServiceCount = favoriteEntry?.[1] || 0;

  const techCounts = {};
  completed.forEach((a) => {
    if (a.technician_id) techCounts[a.technician_id] = (techCounts[a.technician_id] || 0) + 1;
  });
  const topTechId = Object.entries(techCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const techMap = Object.fromEntries((techsRes.data || []).map((t) => [t.id, t.full_name]));
  const preferredTechnician = topTechId ? techMap[topTechId] || null : null;

  const lastCompleted = completed[0];
  const lastVisit = lastCompleted ? visitDate(lastCompleted) : null;
  const lastService = lastCompleted
    ? (lastCompleted.selected_service_names || lastCompleted.services?.name || lastCompleted.add_ons || null)
    : null;

  const recentVisits = completed.slice(0, 5).map((a) => ({
    id: a.id,
    serviceName: a.selected_service_names || a.services?.name || a.add_ons || 'Service',
    date: visitDate(a),
    price: a.final_price,
    status: a.status,
  }));

  return {
    totalVisits: completed.length,
    totalSpent,
    lastVisit,
    lastService,
    servicesTried: Object.keys(serviceCounts).length,
    favoriteService,
    favoriteServiceCount,
    isUsualService: favoriteServiceCount >= 2,
    preferredTechnician,
    recentVisits,
  };
}

export async function fetchCustomerReceipts(customerId, limit = 15) {
  const baseSelect = 'id, final_amount, amount, discount_amount, discount_type, payment_method, created_at, service_id, appointment_id';
  let { data, error } = await supabase
    .from('payment_transactions')
    .select(`${baseSelect}, extras_amount`)
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error?.code === '42703' || error?.message?.includes('extras_amount')) {
    ({ data, error } = await supabase
      .from('payment_transactions')
      .select(baseSelect)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit));
  }

  if (error) throw error;

  const rows = data || [];
  const serviceIds = [...new Set(rows.map((r) => r.service_id).filter(Boolean))];
  let serviceMap = {};
  if (serviceIds.length) {
    const { data: services } = await supabase.from('services').select('id, name').in('id', serviceIds);
    serviceMap = Object.fromEntries((services || []).map((s) => [s.id, s.name]));
  }

  return rows.map((r) => ({
    id: r.id,
    appointmentId: r.appointment_id,
    date: r.created_at,
    serviceName: serviceMap[r.service_id] || 'Salon service',
    amount: Number(r.amount || 0),
    extras: Number(r.extras_amount || 0),
    discount: Number(r.discount_amount || 0),
    discountType: r.discount_type,
    finalAmount: Number(r.final_amount || 0),
    paymentMethod: r.payment_method || 'other',
  }));
}

export async function fetchCustomerVisitPhotos(customerId, limit = 50) {
  const { data, error } = await supabase
    .from('visit_photos')
    .select('id, appointment_id, photo_url, photo_type, caption, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message?.includes('visit_photos') || error.code === '42P01') {
      return { rows: [], available: false };
    }
    throw error;
  }

  return { rows: data || [], available: true };
}

export async function fetchCustomerWaiverDetail(profileId) {
  const { data } = await supabase
    .from('customer_waivers')
    .select('id, signed_at, signature_image, agreed_to_terms')
    .eq('profile_id', profileId)
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

export async function fetchReferralInfo(profile) {
  let referredByName = null;
  if (profile?.referral_by) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profile.referral_by)
      .maybeSingle();
    referredByName = data?.full_name || null;
  }

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referral_by', profile.id);

  return {
    referredByName,
    referralsCount: count || 0,
  };
}
