import { supabase } from '../lib/supabase';

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

export async function fetchCustomerVisitHistory(customerId, phone, { includeOnline = false } = {}) {
  const customerIds = await resolveCustomerIds(customerId, phone);
  if (!customerIds.length) return [];

  let query = supabase
    .from('appointments')
    .select(`
      id, status, booking_type, final_price, checked_in_at, scheduled_at, created_at,
      service_id, technician_id, add_ons, notes,
      services:appointments_service_id_fkey(id, name, price, duration_minutes),
      technicians:profiles!appointments_technician_id_fkey(id, full_name, role)
    `)
    .in('customer_id', customerIds);

  if (!includeOnline) {
    query = query.or('booking_type.eq.walk_in,booking_type.is.null');
  }

  const { data, error } = await query.order('checked_in_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchCustomerStats(customerId, phone) {
  const customerIds = await resolveCustomerIds(customerId, phone);
  const [apptsRes, paymentsRes, techsRes] = await Promise.all([
    customerIds.length
      ? supabase
        .from('appointments')
        .select('id, status, booking_type, final_price, checked_in_at, scheduled_at, created_at, service_id, technician_id, add_ons, services:appointments_service_id_fkey(name)')
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
    const name = a.services?.name || a.add_ons || 'Visit';
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
    ? (lastCompleted.services?.name || lastCompleted.add_ons || null)
    : null;

  const recentVisits = completed.slice(0, 5).map((a) => ({
    id: a.id,
    serviceName: a.services?.name || a.add_ons || 'Service',
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
  const { data } = await supabase
    .from('payment_transactions')
    .select('id, final_amount, amount, discount_amount, discount_type, payment_method, created_at, service_id')
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  const rows = data || [];
  const serviceIds = [...new Set(rows.map((r) => r.service_id).filter(Boolean))];
  let serviceMap = {};
  if (serviceIds.length) {
    const { data: services } = await supabase.from('services').select('id, name').in('id', serviceIds);
    serviceMap = Object.fromEntries((services || []).map((s) => [s.id, s.name]));
  }

  return rows.map((r) => ({
    id: r.id,
    date: r.created_at,
    serviceName: serviceMap[r.service_id] || 'Salon service',
    amount: Number(r.amount || 0),
    discount: Number(r.discount_amount || 0),
    discountType: r.discount_type,
    finalAmount: Number(r.final_amount || 0),
    paymentMethod: r.payment_method || 'other',
  }));
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
