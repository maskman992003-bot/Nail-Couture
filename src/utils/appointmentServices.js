/** Parse comma-separated add_ons + service_id into main services and add-on names. */
export function parseAppointmentLineItems(appointment, allServices = []) {
  const mainServices = allServices.filter((s) => !s.is_addon);
  const addOnServices = allServices.filter((s) => s.is_addon);
  const currentNames = appointment.add_ons
    ? appointment.add_ons.split(',').map((n) => n.trim()).filter(Boolean)
    : [];

  const initialMainId = appointment.service_id;
  const fromId = initialMainId
    ? mainServices.filter((s) => s.id === Number(initialMainId))
    : [];
  const fromAddOnsAsMain = currentNames
    .filter((name) => mainServices.some((s) => s.name === name))
    .map((name) => mainServices.find((s) => s.name === name))
    .filter(Boolean);
  const selectedMain = fromId.length > 0 ? fromId : fromAddOnsAsMain;
  const selectedAddons = currentNames.filter((name) => addOnServices.some((s) => s.name === name));

  return { mainServices, addOnServices, selectedMain, selectedAddons };
}

export function calculateLineItemTotal(selectedMain, selectedAddons, addOnServices) {
  const mainPrice = selectedMain.reduce((sum, s) => sum + (s.price || 0), 0);
  const addOnPrice = selectedAddons.reduce((sum, name) => {
    const svc = addOnServices.find((s) => s.name === name);
    return sum + (svc?.price || 0);
  }, 0);
  return mainPrice + addOnPrice;
}

export function buildServiceUpdatePayload(selectedMain, selectedAddons, addOnServices) {
  const allNames = [...selectedMain.map((s) => s.name), ...selectedAddons].join(', ');
  return {
    service_id: selectedMain[0]?.id || null,
    add_ons: allNames || null,
    final_price: calculateLineItemTotal(selectedMain, selectedAddons, addOnServices),
  };
}

/** Display labels for current appointment services. */
export function getAppointmentServiceLabels(appointment) {
  const names = [];
  if (appointment.services?.name) names.push(appointment.services.name);
  if (appointment.add_ons) {
    appointment.add_ons.split(',').forEach((n) => {
      const trimmed = n.trim();
      if (trimmed && !names.includes(trimmed)) names.push(trimmed);
    });
  }
  if (names.length === 0) names.push('Service');
  return names;
}
