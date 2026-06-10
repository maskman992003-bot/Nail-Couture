import { supabase } from '../lib/supabase';
import { fetchStaffNotes } from './staffCustomerNotes';
import { fetchLoyaltyHistory } from './loyaltyTransactions';
import { fetchCustomerServiceHistory, formatServiceChangeEvent } from './appointmentServiceHistory';
import { isEventBeforeCursor } from './activityDateRange';

function visitDate(appointment) {
  return appointment.checked_in_at || appointment.scheduled_at || appointment.created_at;
}

function formatVisitDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatNoteVisitSubtitle(appointmentDateMap, appointmentId) {
  const visitDateStr = appointmentId ? appointmentDateMap[appointmentId] : null;
  return visitDateStr ? `During visit · ${formatVisitDate(visitDateStr)}` : null;
}

const CUSTOMER_SELECT = 'id, full_name, email, phone';

function attachCustomer(events, customer) {
  if (!customer) return events;
  return events.map((event) => ({ ...event, customer }));
}

function buildTimelineEvents({
  appointments = [],
  payments = [],
  waivers = [],
  notes = [],
  loyalty = [],
  photos = [],
  serviceHistory = [],
  serviceMap = {},
  appointmentDateMap = {},
  resolveCustomer = () => null,
}) {
  const events = [];

  appointments.forEach((a) => {
    const serviceName = a.selected_service_names || a.services?.name || a.add_ons || 'Visit';
    const visitAt = visitDate(a);
    events.push({
      id: `visit-${a.id}`,
      type: 'visit',
      date: visitAt,
      title: serviceName,
      subtitle: a.technicians?.full_name ? `Technician: ${a.technicians.full_name}` : null,
      status: a.status,
      amount: a.final_price,
      customer: a.customer || resolveCustomer(a.customer_id),
      meta: a,
    });

    if (a.notes?.trim()) {
      events.push({
        id: `visit-record-note-${a.id}`,
        type: 'note',
        date: visitAt,
        title: 'Visit record',
        subtitle: formatVisitDate(visitAt),
        body: a.notes.trim(),
        customer: a.customer || resolveCustomer(a.customer_id),
        meta: { noteSource: 'visit_record', appointment_id: a.id },
      });
    }
  });

  payments.forEach((p) => {
    events.push({
      id: `payment-${p.id}`,
      type: 'payment',
      date: p.created_at,
      title: serviceMap[p.service_id] || 'Payment',
      subtitle: p.payment_method ? `Paid via ${p.payment_method}` : null,
      amount: p.final_amount,
      customer: p.customer || resolveCustomer(p.customer_id),
      meta: p,
    });

    if (p.notes?.trim()) {
      const visitSubtitle = formatNoteVisitSubtitle(appointmentDateMap, p.appointment_id);
      events.push({
        id: `checkout-note-${p.id}`,
        type: 'note',
        date: p.created_at,
        title: 'Checkout',
        subtitle: ['Cashier', visitSubtitle].filter(Boolean).join(' · '),
        body: p.notes.trim(),
        customer: p.customer || resolveCustomer(p.customer_id),
        meta: { noteSource: 'checkout', appointment_id: p.appointment_id },
      });
    }
  });

  waivers.forEach((w) => {
    events.push({
      id: `waiver-${w.id}`,
      type: 'waiver',
      date: w.signed_at,
      title: 'Waiver signed',
      subtitle: w.agreed_to_terms ? 'Terms agreed' : null,
      customer: w.customer || resolveCustomer(w.profile_id),
      meta: w,
    });
  });

  notes.forEach((n) => {
    const visitSubtitle = formatNoteVisitSubtitle(appointmentDateMap, n.appointment_id);
    events.push({
      id: `note-${n.id}`,
      type: 'note',
      date: n.created_at,
      title: 'Staff note',
      subtitle: [n.author_name, visitSubtitle].filter(Boolean).join(' · '),
      body: n.note,
      customer: n.customer || resolveCustomer(n.customer_id),
      meta: { ...n, noteSource: 'staff' },
    });
  });

  loyalty.forEach((t) => {
    events.push({
      id: `loyalty-${t.id}`,
      type: 'loyalty',
      date: t.created_at,
      title: t.description || t.transaction_type,
      subtitle: `${t.points >= 0 ? '+' : ''}${t.points} pts · Balance ${t.balance_after}`,
      customer: t.customer || resolveCustomer(t.profile_id),
      meta: t,
    });
  });

  photos.forEach((ph) => {
    const uploaderName = ph.uploader?.full_name || 'Staff';
    events.push({
      id: `photo-${ph.id}`,
      type: 'photo',
      date: ph.created_at,
      title: `${ph.photo_type === 'before' ? 'Before' : 'After'} photo`,
      subtitle: `By ${uploaderName}`,
      body: ph.caption || null,
      customer: ph.customer || resolveCustomer(ph.customer_id),
      meta: {
        ...ph,
        uploader_name: uploaderName,
      },
    });
  });

  serviceHistory.forEach((row) => {
    const formatted = formatServiceChangeEvent(row);
    const customer = row.appointment?.customer || resolveCustomer(row.customer_id);
    events.push({
      id: `service-${row.id}`,
      type: 'service_change',
      date: row.created_at,
      title: formatted.title,
      subtitle: formatted.subtitle,
      body: formatted.body,
      amount: formatted.amount,
      customer,
      meta: row,
    });
  });

  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  return events;
}

export async function fetchCustomerTimeline(customerId, phone) {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

  const [profileRes, apptsRes, paymentsRes, waiversRes, notesRes, loyaltyRes, photosRes, serviceHistoryRows] = await Promise.all([
    supabase.from('profiles').select(CUSTOMER_SELECT).eq('id', customerId).maybeSingle(),
    supabase
      .from('appointments')
      .select(`
        id, status, final_price, checked_in_at, scheduled_at, created_at, add_ons, notes, selected_service_names,
        services:appointments_service_id_fkey(name),
        technicians:profiles!appointments_technician_id_fkey!left(full_name)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('payment_transactions')
      .select('id, final_amount, amount, discount_amount, payment_method, notes, appointment_id, created_at, service_id, status')
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('customer_waivers')
      .select('id, signed_at, signature_image, agreed_to_terms')
      .or(
        cleanPhone
          ? `profile_id.eq.${customerId},customer_phone.eq.${cleanPhone}`
          : `profile_id.eq.${customerId}`
      )
      .order('signed_at', { ascending: false })
      .limit(20),
    fetchStaffNotes(customerId, 100),
    fetchLoyaltyHistory(customerId, 100),
    supabase
      .from('visit_photos')
      .select(`
        id, appointment_id, photo_url, photo_type, caption, created_at, uploaded_by,
        uploader:profiles!visit_photos_uploaded_by_fkey(full_name, role)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(30),
    fetchCustomerServiceHistory(customerId),
  ]);

  const appointmentDateMap = {};
  (apptsRes.data || []).forEach((a) => {
    appointmentDateMap[a.id] = visitDate(a);
  });

  const serviceIds = [...new Set((paymentsRes.data || []).map((p) => p.service_id).filter(Boolean))];
  let serviceMap = {};
  if (serviceIds.length) {
    const { data: services } = await supabase.from('services').select('id, name').in('id', serviceIds);
    serviceMap = Object.fromEntries((services || []).map((s) => [s.id, s.name]));
  }

  const customer = profileRes.data || null;
  const events = buildTimelineEvents({
    appointments: apptsRes.data || [],
    payments: paymentsRes.data || [],
    waivers: waiversRes.data || [],
    notes: notesRes.rows || [],
    loyalty: loyaltyRes.rows || [],
    photos: photosRes.error ? [] : (photosRes.data || []),
    serviceHistory: serviceHistoryRows || [],
    serviceMap,
    appointmentDateMap,
    resolveCustomer: () => customer,
  });

  return { events: attachCustomer(events, customer), photosAvailable: !photosRes.error };
}

function applyDateRange(query, dateColumn, fromDate, toDate) {
  let q = query;
  if (fromDate) q = q.gte(dateColumn, fromDate);
  if (toDate) q = q.lte(dateColumn, toDate);
  return q;
}

export async function fetchGlobalTimeline({
  fromDate,
  toDate,
  limit = 50,
  cursor,
} = {}) {
  const perSource = Math.min(limit + 20, 80);

  const [
    apptsRes,
    paymentsRes,
    loyaltyRes,
    photosRes,
    notesRes,
    waiversRes,
    serviceHistoryRes,
  ] = await Promise.all([
    applyDateRange(
      supabase
        .from('appointments')
        .select(`
          id, customer_id, status, final_price, checked_in_at, scheduled_at, created_at,
          add_ons, notes, selected_service_names,
          services:appointments_service_id_fkey(name),
          technicians:profiles!appointments_technician_id_fkey!left(full_name),
          customer:profiles!appointments_client_id_fkey(${CUSTOMER_SELECT})
        `)
        .order('created_at', { ascending: false }),
      'created_at',
      fromDate,
      toDate,
    ).limit(perSource),
    applyDateRange(
      supabase
        .from('payment_transactions')
        .select(`
          id, customer_id, final_amount, payment_method, notes, appointment_id, created_at, service_id, status,
          customer:profiles!payment_transactions_customer_id_fkey(${CUSTOMER_SELECT})
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false }),
      'created_at',
      fromDate,
      toDate,
    ).limit(perSource),
    applyDateRange(
      supabase
        .from('loyalty_transactions')
        .select(`
          id, profile_id, points, balance_after, description, transaction_type, created_at,
          customer:profiles!loyalty_transactions_profile_id_fkey(${CUSTOMER_SELECT})
        `)
        .order('created_at', { ascending: false }),
      'created_at',
      fromDate,
      toDate,
    ).limit(perSource),
    applyDateRange(
      supabase
        .from('visit_photos')
        .select(`
          id, appointment_id, customer_id, photo_url, photo_type, caption, created_at, uploaded_by,
          uploader:profiles!visit_photos_uploaded_by_fkey(full_name, role),
          customer:profiles!visit_photos_customer_id_fkey(${CUSTOMER_SELECT})
        `)
        .order('created_at', { ascending: false }),
      'created_at',
      fromDate,
      toDate,
    ).limit(perSource),
    applyDateRange(
      supabase
        .from('customer_staff_notes')
        .select(`
          id, customer_id, author_name, note, created_at, appointment_id,
          customer:profiles!customer_staff_notes_customer_id_fkey(${CUSTOMER_SELECT})
        `)
        .order('created_at', { ascending: false }),
      'created_at',
      fromDate,
      toDate,
    ).limit(perSource),
    applyDateRange(
      supabase
        .from('customer_waivers')
        .select(`
          id, profile_id, signed_at, signature_image, agreed_to_terms,
          customer:profiles!customer_waivers_profile_id_fkey(${CUSTOMER_SELECT})
        `)
        .order('signed_at', { ascending: false }),
      'signed_at',
      fromDate,
      toDate,
    ).limit(perSource),
    applyDateRange(
      supabase
        .from('appointment_service_history')
        .select(`
          id, appointment_id, changed_by_name, change_source,
          previous_service_names, new_service_names, previous_addons, new_addons,
          previous_final_price, new_final_price, created_at,
          appointment:appointments!appointment_service_history_appointment_id_fkey(
            customer_id,
            customer:profiles!appointments_client_id_fkey(${CUSTOMER_SELECT})
          )
        `)
        .order('created_at', { ascending: false }),
      'created_at',
      fromDate,
      toDate,
    ).limit(perSource),
  ]);

  const logQueryError = (label, res) => {
    if (res.error) console.error(`Global timeline ${label} query failed:`, res.error);
  };
  logQueryError('appointments', apptsRes);
  logQueryError('payments', paymentsRes);
  logQueryError('loyalty', loyaltyRes);
  logQueryError('photos', photosRes);
  logQueryError('notes', notesRes);
  logQueryError('waivers', waiversRes);
  logQueryError('service history', serviceHistoryRes);

  const appointments = apptsRes.error ? [] : (apptsRes.data || []);
  const payments = paymentsRes.error ? [] : (paymentsRes.data || []);
  const loyalty = loyaltyRes.error ? [] : (loyaltyRes.data || []);
  const photos = photosRes.error ? [] : (photosRes.data || []);
  const notes = notesRes.error ? [] : (notesRes.data || []);
  const waivers = waiversRes.error ? [] : (waiversRes.data || []);
  const serviceHistory = serviceHistoryRes.error ? [] : (serviceHistoryRes.data || []);

  const appointmentDateMap = {};
  appointments.forEach((a) => {
    appointmentDateMap[a.id] = visitDate(a);
  });

  const serviceIds = [...new Set(payments.map((p) => p.service_id).filter(Boolean))];
  let serviceMap = {};
  if (serviceIds.length) {
    const { data: services } = await supabase.from('services').select('id, name').in('id', serviceIds);
    serviceMap = Object.fromEntries((services || []).map((s) => [s.id, s.name]));
  }

  const events = buildTimelineEvents({
    appointments,
    payments,
    waivers,
    notes,
    loyalty,
    photos,
    serviceHistory,
    serviceMap,
    appointmentDateMap,
  });

  const filtered = cursor ? events.filter((event) => isEventBeforeCursor(event, cursor)) : events;
  const page = filtered.slice(0, limit);
  const hasMore = filtered.length > limit || events.length >= perSource * 7;
  const lastEvent = page[page.length - 1];

  return {
    events: page,
    photosAvailable: !photosRes.error,
    hasMore,
    nextCursor: hasMore && lastEvent ? { date: lastEvent.date, id: lastEvent.id } : null,
  };
}

export async function adjustCustomerLoyalty(profileId, delta, reason, staffId) {
  const { data, error } = await supabase.rpc('adjust_loyalty_points', {
    p_profile_id: profileId,
    p_delta: delta,
    p_reason: reason,
    p_staff_id: staffId || null,
  });

  if (error) {
    if (error.message?.includes('adjust_loyalty_points') || error.code === '42883') {
      return { success: false, error: 'Adjustment unavailable. Run sql/025_phase4_staff_crm.sql in Supabase.' };
    }
    return { success: false, error: error.message || 'Adjustment failed' };
  }

  return data || { success: false, error: 'Unexpected response' };
}

export async function uploadVisitPhoto(customerId, appointmentId, file, photoType, uploadedBy) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${customerId}/${appointmentId || 'general'}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('visit-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    return { success: false, error: uploadError.message || 'Upload failed' };
  }

  const { data: urlData } = supabase.storage.from('visit-photos').getPublicUrl(path);
  const photoUrl = urlData?.publicUrl;

  const { data, error } = await supabase
    .from('visit_photos')
    .insert({
      customer_id: customerId,
      appointment_id: appointmentId || null,
      photo_url: photoUrl,
      photo_type: photoType,
      uploaded_by: uploadedBy || null,
    })
    .select('id, photo_url, photo_type, created_at, uploaded_by')
    .single();

  if (error) {
    return { success: false, error: error.message || 'Failed to save photo record' };
  }

  return { success: true, photo: data };
}

function storagePathFromPhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  const marker = '/visit-photos/';
  const idx = photoUrl.indexOf(marker);
  if (idx === -1) return null;
  return photoUrl.slice(idx + marker.length).split('?')[0];
}

export async function deleteVisitPhoto(photoId, photoUrl) {
  const { error } = await supabase.from('visit_photos').delete().eq('id', photoId);
  if (error) {
    return { success: false, error: error.message || 'Failed to delete photo' };
  }

  const storagePath = storagePathFromPhotoUrl(photoUrl);
  if (storagePath) {
    await supabase.storage.from('visit-photos').remove([storagePath]);
  }

  return { success: true };
}
