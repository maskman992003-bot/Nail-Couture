export const APPOINTMENT_STATUS_LABELS = {
  waiting: 'Waiting',
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
  if (appointment.total_price != null) {
    return Number(appointment.total_price) || 0;
  }

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
  const serviceNames = [];
  if (appt.add_ons) {
    serviceNames.push(...appt.add_ons.split(',').map((name) => name.trim()).filter(Boolean));
  }
  if (appt.services) {
    if (Array.isArray(appt.services)) {
      serviceNames.push(...appt.services.map((service) => service?.name).filter(Boolean));
    } else if (appt.services?.name) {
      serviceNames.push(appt.services.name);
    }
  }
  return [...new Set(serviceNames)];
}

export function getAppointmentFinalPrice(appt) {
  if (appt.final_price != null) return appt.final_price;
  if (Array.isArray(appt.services)) {
    return appt.services.reduce((sum, item) => sum + (item?.price || 0), 0);
  }
  return appt.services?.price || 0;
}
