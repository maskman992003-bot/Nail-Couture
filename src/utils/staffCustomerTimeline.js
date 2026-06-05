import { supabase } from '../lib/supabase';
import { fetchStaffNotes } from './staffCustomerNotes';
import { fetchLoyaltyHistory } from './loyaltyTransactions';

function visitDate(appointment) {
  return appointment.checked_in_at || appointment.scheduled_at || appointment.created_at;
}

export async function fetchCustomerTimeline(customerId, phone) {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

  const [apptsRes, paymentsRes, waiversRes, notesRes, loyaltyRes, photosRes] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id, status, final_price, checked_in_at, scheduled_at, created_at, add_ons, notes,
        services:appointments_service_id_fkey(name),
        technicians:profiles!appointments_technician_id_fkey!left(full_name)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('payment_transactions')
      .select('id, final_amount, amount, discount_amount, payment_method, created_at, service_id, status')
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
    fetchStaffNotes(customerId, 30),
    fetchLoyaltyHistory(customerId, 30),
    supabase
      .from('visit_photos')
      .select('id, appointment_id, photo_url, photo_type, caption, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const serviceIds = [...new Set((paymentsRes.data || []).map((p) => p.service_id).filter(Boolean))];
  let serviceMap = {};
  if (serviceIds.length) {
    const { data: services } = await supabase.from('services').select('id, name').in('id', serviceIds);
    serviceMap = Object.fromEntries((services || []).map((s) => [s.id, s.name]));
  }

  const events = [];

  (apptsRes.data || []).forEach((a) => {
    const serviceName = a.services?.name || a.add_ons || 'Visit';
    events.push({
      id: `visit-${a.id}`,
      type: 'visit',
      date: visitDate(a),
      title: serviceName,
      subtitle: a.technicians?.full_name ? `Technician: ${a.technicians.full_name}` : null,
      status: a.status,
      amount: a.final_price,
      meta: a,
    });
  });

  (paymentsRes.data || []).forEach((p) => {
    events.push({
      id: `payment-${p.id}`,
      type: 'payment',
      date: p.created_at,
      title: serviceMap[p.service_id] || 'Payment',
      subtitle: p.payment_method ? `Paid via ${p.payment_method}` : null,
      amount: p.final_amount,
      meta: p,
    });
  });

  (waiversRes.data || []).forEach((w) => {
    events.push({
      id: `waiver-${w.id}`,
      type: 'waiver',
      date: w.signed_at,
      title: 'Waiver signed',
      subtitle: w.agreed_to_terms ? 'Terms agreed' : null,
      meta: w,
    });
  });

  (notesRes.rows || []).forEach((n) => {
    events.push({
      id: `note-${n.id}`,
      type: 'note',
      date: n.created_at,
      title: 'Staff note',
      subtitle: `By ${n.author_name}`,
      body: n.note,
      meta: n,
    });
  });

  (loyaltyRes.rows || []).forEach((t) => {
    events.push({
      id: `loyalty-${t.id}`,
      type: 'loyalty',
      date: t.created_at,
      title: t.description || t.transaction_type,
      subtitle: `${t.points >= 0 ? '+' : ''}${t.points} pts · Balance ${t.balance_after}`,
      meta: t,
    });
  });

  const photos = photosRes.data || [];
  if (!photosRes.error) {
    photos.forEach((ph) => {
      events.push({
        id: `photo-${ph.id}`,
        type: 'photo',
        date: ph.created_at,
        title: `${ph.photo_type === 'before' ? 'Before' : 'After'} photo`,
        subtitle: ph.caption || null,
        meta: ph,
      });
    });
  }

  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { events, photosAvailable: !photosRes.error };
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
    .select('id, photo_url, photo_type, created_at')
    .single();

  if (error) {
    return { success: false, error: error.message || 'Failed to save photo record' };
  }

  return { success: true, photo: data };
}
