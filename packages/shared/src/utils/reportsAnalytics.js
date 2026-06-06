import { getSupabase } from '../lib/supabase.js';

export function getReportDateRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'lastWeek': {
      const start = new Date(today);
      start.setDate(start.getDate() - 14);
      const end = new Date(today);
      end.setDate(end.getDate() - 7);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      };
    }
    case 'thisWeek': {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      };
    }
    case 'lastMonth': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 2);
      start.setDate(1);
      const end = new Date(today);
      end.setMonth(end.getMonth() - 1);
      end.setDate(0);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      };
    }
    case 'thisMonth': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      };
    }
    default:
      return { start: today.toISOString(), end: today.toISOString(), label: 'Today' };
  }
}

export async function getAppointmentsData(startDate, endDate) {
  const { data } = await getSupabase()
    .from('appointments')
    .select(`
      customer_id,
      final_price,
      status,
      services (
        id,
        name,
        price,
        duration_minutes
      )
    `)
    .gte('checked_in_at', startDate)
    .lt('checked_in_at', endDate)
    .not('customer_id', 'is', null);

  return data || [];
}

export async function getPaymentTransactionsData(startDate, endDate) {
  const endExclusive = new Date(endDate);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const { data } = await getSupabase()
    .from('payment_transactions')
    .select(`
      id,
      final_amount,
      amount,
      customer_id,
      created_at,
      status,
      services:service_id ( id, name, price, duration_minutes )
    `)
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lt('created_at', endExclusive.toISOString());

  return data || [];
}

export async function analyzePeriod(period, { preferPayments = false } = {}) {
  const range = getReportDateRange(period);
  const appointments = await getAppointmentsData(range.start, range.end);
  const payments = preferPayments ? await getPaymentTransactionsData(range.start, range.end) : [];

  if (appointments.length === 0 && payments.length === 0) {
    return {
      new: 0,
      regular: 0,
      total: 0,
      revenue: 0,
      serviceCounts: {},
      avgServiceTime: 0,
      cancelled: 0,
      paymentCount: 0,
      label: range.label,
    };
  }

  const profileIds = [...new Set(appointments.map((a) => a.customer_id))];

  let newCount = 0;
  let regularCount = 0;

  for (const profileId of profileIds) {
    const { count } = await getSupabase()
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', profileId)
      .lt('checked_in_at', range.end);

    if (count <= 1) {
      newCount++;
    } else {
      regularCount++;
    }
  }

  const serviceCounts = {};
  let totalRevenue = 0;
  let totalDuration = 0;
  let completedCount = 0;

  if (preferPayments && payments.length > 0) {
    for (const payment of payments) {
      const svc = payment.services;
      if (svc?.name) {
        serviceCounts[svc.name] = (serviceCounts[svc.name] || 0) + 1;
        totalDuration += svc.duration_minutes || 0;
      }
      totalRevenue += Number(payment.final_amount ?? payment.amount ?? 0);
      completedCount++;
    }
  } else {
    for (const appt of appointments) {
      if (appt.services) {
        serviceCounts[appt.services.name] = (serviceCounts[appt.services.name] || 0) + 1;
        const price = appt.final_price || appt.services.price;
        totalRevenue += price;
        totalDuration += appt.services.duration_minutes || 0;
        if (appt.status === 'completed') completedCount++;
      }
    }
  }

  const { count: cancelledToday } = await getSupabase()
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cancelled')
    .gte('checked_in_at', range.start)
    .lt('checked_in_at', range.end);

  const avgServiceTime = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0;

  return {
    new: newCount,
    regular: regularCount,
    total: profileIds.length,
    revenue: totalRevenue,
    serviceCounts,
    avgServiceTime,
    cancelled: cancelledToday || 0,
    paymentCount: preferPayments ? payments.length : completedCount,
    label: range.label,
  };
}

export async function analyzeCustomRange(fromDate, toDate, { preferPayments = false } = {}) {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(23, 59, 59, 999);

  const appointments = await getAppointmentsData(start.toISOString(), end.toISOString());
  const payments = preferPayments
    ? await getPaymentTransactionsData(start.toISOString(), end.toISOString())
    : [];

  const profileIds = [...new Set(appointments.map((a) => a.customer_id))];
  let newCount = 0;
  let regularCount = 0;

  for (const profileId of profileIds) {
    const { count } = await getSupabase()
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', profileId)
      .lt('checked_in_at', end.toISOString());

    if (count <= 1) newCount++;
    else regularCount++;
  }

  const serviceCounts = {};
  let totalRevenue = 0;
  let totalDuration = 0;
  let completedCount = 0;

  if (preferPayments && payments.length > 0) {
    for (const payment of payments) {
      const svc = payment.services;
      if (svc?.name) {
        serviceCounts[svc.name] = (serviceCounts[svc.name] || 0) + 1;
        totalDuration += svc.duration_minutes || 0;
      }
      totalRevenue += Number(payment.final_amount ?? payment.amount ?? 0);
      completedCount++;
    }
  } else {
    for (const appt of appointments) {
      if (appt.services) {
        serviceCounts[appt.services.name] = (serviceCounts[appt.services.name] || 0) + 1;
        totalRevenue += appt.final_price || appt.services.price;
        totalDuration += appt.services.duration_minutes || 0;
        if (appt.status === 'completed') completedCount++;
      }
    }
  }

  const { count: cancelledCount } = await getSupabase()
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cancelled')
    .gte('checked_in_at', start.toISOString())
    .lt('checked_in_at', end.toISOString());

  return {
    new: newCount,
    regular: regularCount,
    total: profileIds.length,
    revenue: totalRevenue,
    serviceCounts,
    avgServiceTime: completedCount > 0 ? Math.round(totalDuration / completedCount) : 0,
    cancelled: cancelledCount || 0,
    paymentCount: preferPayments ? payments.length : completedCount,
    label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  };
}

export function csvEscape(value) {
  const stringValue = String(value || '');
  return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
}
