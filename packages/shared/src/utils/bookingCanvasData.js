import { getInitialFromName, getStaffAccentColor } from './coutureTimeline.js';
import { STAFF_ACCENT_COLORS } from './bookingCanvasMocks.js';
import { buildAppointmentServicePayload, parseAppointmentLineItems } from './appointmentServices.js';

export function calculateBookingLineItemTotal(selectedServices = [], selectedAddOns = []) {
  return selectedServices.reduce((sum, service) => sum + (service.price || 0), 0)
    + selectedAddOns.reduce((sum, addOn) => sum + (addOn.price || 0), 0);
}

export function resolveBookingLineItems(row, allServices = []) {
  if (!allServices.length) {
    return { selectedServices: [], selectedAddOns: [] };
  }

  const { selectedMain, selectedAddons } = parseAppointmentLineItems(
    {
      service_id: row.service_id,
      selected_service_names: row.selected_service_names,
      add_ons: row.add_ons,
    },
    allServices,
  );

  const selectedAddOns = selectedAddons
    .map((name) => allServices.find((service) => service.name === name && service.is_addon))
    .filter(Boolean);

  return {
    selectedServices: selectedMain,
    selectedAddOns,
  };
}

function formatAppointmentServiceName(row, service) {
  const labels = [];
  if (row.selected_service_names) {
    row.selected_service_names.split(',').map((name) => name.trim()).filter(Boolean).forEach((name) => labels.push(name));
  }
  if (row.add_ons) {
    row.add_ons.split(',').map((name) => name.trim()).filter(Boolean).forEach((name) => {
      if (!labels.includes(name)) labels.push(name);
    });
  }
  if (labels.length) return labels.join(', ');
  return service?.name || row.service_name || 'Service';
}

const CUSTOMER_SEARCH_LIMIT = 8;
const CANVAS_APPOINTMENT_STATUSES = new Set([
  'confirmed',
  'checking_in',
  'waiting',
  'assigned_pending',
  'serving',
  'ready_for_checkout',
]);

function escapeIlike(value) {
  return value.replace(/[%_\\]/g, '\\$&');
}

export function mapStaffFromProfiles(profiles) {
  return (profiles || []).map((profile, index) => ({
    id: profile.id,
    fullName: profile.full_name || 'Staff',
    accentColor: STAFF_ACCENT_COLORS[index % STAFF_ACCENT_COLORS.length],
    initial: getInitialFromName(profile.full_name || 'S').slice(0, 1),
  }));
}

export function mapServiceRow(row) {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.duration_minutes ?? 60,
    price: row.price ?? 0,
  };
}

export function mapAppointmentRow(row, staffPalette = STAFF_ACCENT_COLORS, allServices = []) {
  const timeStr = row.scheduled_at || row.appointment_time;
  if (!timeStr) return null;

  const technicianId = row.technician_id || 'unknown';
  const service = row.service || row.services || null;
  const customer = row.customer || null;
  const technician = row.technician || row.technicians || null;
  const { selectedServices, selectedAddOns } = resolveBookingLineItems(row, allServices);

  return {
    id: row.id,
    startAt: new Date(timeStr),
    durationMinutes: row.duration_minutes ?? service?.duration_minutes ?? 60,
    clientName: customer?.full_name || row.customer_name || 'Client',
    serviceName: formatAppointmentServiceName(row, service),
    technicianId,
    technicianName: technician?.full_name || row.technician_name || 'Staff',
    accentColor: getStaffAccentColor(technicianId, staffPalette),
    customerId: row.customer_id || customer?.id || '',
    serviceId: row.service_id || service?.id || '',
    phone: customer?.phone || '',
    notes: row.notes || '',
    status: row.status || 'confirmed',
    selectedServices,
    selectedAddOns,
  };
}

export function getBookingCanvasDateRange(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 14);

  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + 60);

  return { start, end };
}

export async function fetchBookingCanvasStaff(supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'technician')
    .order('full_name');

  if (error) throw error;
  return mapStaffFromProfiles(data || []);
}

export async function fetchBookingCanvasServices(supabase) {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes')
    .order('name');

  if (error) throw error;
  return (data || []).map(mapServiceRow);
}

export async function fetchBookingCanvasAppointments(supabase, referenceDate = new Date()) {
  const { start, end } = getBookingCanvasDateRange(referenceDate);

  const { data, error } = await supabase
    .from('appointments')
    .select('id, scheduled_at, status, customer_id, service_id, technician_id, notes, add_ons, selected_service_names, final_price')
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) throw error;

  const rows = (data || []).filter(
    (row) => CANVAS_APPOINTMENT_STATUSES.has(row.status) && row.scheduled_at,
  );

  const profileIds = [
    ...new Set(rows.flatMap((row) => [row.customer_id, row.technician_id]).filter(Boolean)),
  ];
  const serviceIds = [...new Set(rows.map((row) => row.service_id).filter(Boolean))];

  const [profilesRes, servicesRes, catalogRes] = await Promise.all([
    profileIds.length
      ? supabase.from('profiles').select('id, full_name, phone').in('id', profileIds)
      : Promise.resolve({ data: [] }),
    serviceIds.length
      ? supabase.from('services').select('id, name, duration_minutes').in('id', serviceIds)
      : Promise.resolve({ data: [] }),
    supabase.from('services').select('id, name, price, duration_minutes, is_addon'),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (catalogRes.error) throw catalogRes.error;

  const profileMap = Object.fromEntries((profilesRes.data || []).map((p) => [p.id, p]));
  const serviceMap = Object.fromEntries((servicesRes.data || []).map((s) => [s.id, s]));
  const catalogServices = catalogRes.data || [];

  return rows
    .map((row) => mapAppointmentRow({
      ...row,
      customer: profileMap[row.customer_id],
      service: serviceMap[row.service_id],
      technician: profileMap[row.technician_id],
    }, STAFF_ACCENT_COLORS, catalogServices))
    .filter(Boolean);
}

function sortCustomerAppointments(appointments, now = Date.now()) {
  const dated = (appointments || []).filter((row) => row.scheduled_at);
  const past = dated
    .filter((row) => new Date(row.scheduled_at).getTime() < now)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const upcoming = dated
    .filter((row) => new Date(row.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  return [...past, ...upcoming].map((row) => ({
    appointmentId: row.id,
    scheduledAt: new Date(row.scheduled_at),
    isPast: new Date(row.scheduled_at).getTime() < now,
  }));
}

export async function searchBookedCustomersByPhone(supabase, term) {
  const digits = term.replace(/\D/g, '');
  if (digits.length < 3) return [];

  const escaped = escapeIlike(digits);

  const { data: customers, error: customerError } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'customer')
    .ilike('phone', `%${escaped}%`)
    .limit(20);

  if (customerError) throw customerError;
  if (!customers?.length) return [];

  const customerIds = customers.map((customer) => customer.id);
  const statusList = [...CANVAS_APPOINTMENT_STATUSES];

  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('id, customer_id, scheduled_at')
    .in('customer_id', customerIds)
    .in('status', statusList)
    .not('scheduled_at', 'is', null);

  if (aptError) throw aptError;

  const appointmentsByCustomer = (appointments || []).reduce((map, row) => {
    if (!row.customer_id) return map;
    if (!map.has(row.customer_id)) map.set(row.customer_id, []);
    map.get(row.customer_id).push(row);
    return map;
  }, new Map());

  const results = [];
  for (const customer of customers) {
    const customerAppointments = appointmentsByCustomer.get(customer.id);
    const sortedAppointments = sortCustomerAppointments(customerAppointments);
    if (!sortedAppointments.length) continue;

    results.push({
      id: customer.id,
      full_name: customer.full_name || 'Client',
      phone: customer.phone || '',
      appointments: sortedAppointments,
    });
    if (results.length >= CUSTOMER_SEARCH_LIMIT) break;
  }

  return results.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export async function searchBookingCanvasCustomers(supabase, term) {
  const trimmed = term.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const escaped = escapeIlike(trimmed);
  const digits = trimmed.replace(/\D/g, '');
  const filters = [
    `full_name.ilike.%${escaped}%`,
    `phone.ilike.%${escaped}%`,
  ];
  if (digits.length >= 3 && digits !== escaped) {
    filters.push(`phone.ilike.%${escapeIlike(digits)}%`);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'customer')
    .or(filters.join(','))
    .order('full_name')
    .limit(CUSTOMER_SEARCH_LIMIT);

  if (error) throw error;
  return data || [];
}

export async function lookupCustomerByPhone(supabase, phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;

  const candidates = new Set([String(phone ?? '').trim(), digits]);
  if (digits.length === 10) candidates.add(`+1${digits}`);
  if (digits.length === 11) candidates.add(`+${digits}`);

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('phone', candidate)
      .eq('role', 'customer')
      .maybeSingle();
    if (error) continue;
    if (data) {
      return {
        ...data,
        phone: String(data.phone ?? '').replace(/\D/g, '').slice(-10) || digits.slice(-10),
      };
    }
  }

  return null;
}

export async function createBookingCanvasCustomer(supabase, { phone, fullName }) {
  const digits = String(phone ?? '').replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    throw new Error('Please enter a valid 10-digit phone number.');
  }

  const name = fullName?.trim();
  if (!name) {
    throw new Error('Client name is required to register a new customer.');
  }

  const existing = await lookupCustomerByPhone(supabase, digits);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      full_name: name,
      phone: digits,
      role: 'customer',
      registration_complete: false,
    })
    .select('id, full_name, phone')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This phone number is already registered.');
    }
    throw error;
  }

  return data;
}

export async function createBookingCanvasAppointment(supabase, {
  customerId,
  serviceId,
  technicianId,
  scheduledAt,
  notes,
  price,
  selectedServices = [],
  selectedAddOns = [],
}) {
  const { add_ons, selected_service_names } = buildAppointmentServicePayload(selectedServices, selectedAddOns);
  const finalPrice = price ?? calculateBookingLineItemTotal(selectedServices, selectedAddOns);

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      customer_id: customerId,
      service_id: serviceId,
      technician_id: technicianId || null,
      scheduled_at: scheduledAt,
      checked_in_at: null,
      status: 'confirmed',
      booking_type: 'online',
      final_price: finalPrice,
      add_ons,
      selected_service_names,
      notes: notes || null,
    })
    .select(`
      id,
      scheduled_at,
      status,
      customer_id,
      service_id,
      technician_id,
      customer:profiles!appointments_client_id_fkey(full_name),
      service:services!appointments_service_id_fkey(name, duration_minutes),
      technician:profiles!appointments_technician_id_fkey(full_name)
    `)
    .single();

  if (error) throw error;
  return mapAppointmentRow(data);
}

export async function updateBookingCanvasAppointment(supabase, {
  callerPhone,
  appointmentId,
  serviceId,
  technicianId,
  scheduledAt,
  notes,
  selectedServices = [],
  selectedAddOns = [],
}) {
  const { add_ons, selected_service_names } = buildAppointmentServicePayload(selectedServices, selectedAddOns);
  const finalPrice = calculateBookingLineItemTotal(selectedServices, selectedAddOns);

  const { error } = await supabase.rpc('update_appointment', {
    caller_phone: callerPhone,
    appointment_id: appointmentId,
    p_scheduled_at: scheduledAt,
    p_service_id: serviceId || null,
    p_technician_id: technicianId || null,
    p_notes: notes || null,
    p_add_ons: add_ons,
    p_selected_service_names: selected_service_names,
    p_final_price: finalPrice,
  });

  if (error) throw error;
}

export async function cancelBookingCanvasAppointment(supabase, callerPhone, appointmentId) {
  const { error } = await supabase.rpc('cancel_appointment', {
    caller_phone: callerPhone,
    appointment_id: appointmentId,
  });

  if (error) throw error;
}
