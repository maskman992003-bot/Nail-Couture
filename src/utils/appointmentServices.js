/** Parse comma-separated add_ons + service_id into main services and add-on names. */
export function parseAppointmentLineItems(appointment, allServices = []) {
  const mainServices = allServices.filter((s) => !s.is_addon);
  const addOnServices = allServices.filter((s) => s.is_addon);

  if (appointment.selected_service_names) {
    const mainNames = appointment.selected_service_names.split(',').map((n) => n.trim()).filter(Boolean);
    const addonNames = appointment.add_ons
      ? appointment.add_ons.split(',').map((n) => n.trim()).filter(Boolean)
      : [];
    const selectedMain = mainNames
      .map((name) => mainServices.find((s) => s.name === name))
      .filter(Boolean);
    return { mainServices, addOnServices, selectedMain, selectedAddons: addonNames };
  }

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
  const addOnNames = selectedAddons.filter(Boolean);
  const serviceNames = selectedMain.map((s) => s.name).filter(Boolean);
  return {
    service_id: selectedMain[0]?.id || null,
    add_ons: addOnNames.length ? addOnNames.join(', ') : null,
    selected_service_names: serviceNames.length ? serviceNames.join(', ') : null,
    final_price: calculateLineItemTotal(selectedMain, selectedAddons, addOnServices),
  };
}

/** Display labels for current appointment services. */
export function getAppointmentServiceLabels(appointment) {
  if (appointment.selected_service_names) {
    const names = appointment.selected_service_names.split(',').map((n) => n.trim()).filter(Boolean);
    if (names.length) return names;
  }
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

export function collectAppointmentServiceNames(appointment) {
  const names = new Set();
  if (appointment?.services?.name) names.add(appointment.services.name);
  if (appointment?.selected_service_names) {
    appointment.selected_service_names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => names.add(n));
  }
  if (appointment?.add_ons) {
    appointment.add_ons.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => names.add(n));
  }
  return [...names];
}

export function splitServicesByType(serviceNames, serviceRows) {
  const rowMap = Object.fromEntries((serviceRows || []).map((s) => [s.name, s]));
  const mainServices = [];
  const addonDetails = [];
  const unknownNames = [];

  serviceNames.forEach((name) => {
    const row = rowMap[name];
    if (!row) {
      unknownNames.push(name);
      return;
    }
    if (row.is_addon) addonDetails.push(row);
    else mainServices.push(row);
  });

  return { mainServices, addonDetails, unknownNames, rowMap };
}

export async function enrichAppointmentsWithServices(supabase, appointments) {
  const allNames = [...new Set(appointments.flatMap(collectAppointmentServiceNames))];
  const { data: serviceRows } = allNames.length
    ? await supabase.from('services').select('id, name, price, duration_minutes, is_addon').in('name', allNames)
    : { data: [] };

  return appointments.map((appointment) => {
    let namesToResolve = collectAppointmentServiceNames(appointment);

    if (appointment.selected_service_names) {
      const mainNames = appointment.selected_service_names.split(',').map((n) => n.trim()).filter(Boolean);
      const addonNames = appointment.add_ons
        ? appointment.add_ons.split(',').map((n) => n.trim()).filter(Boolean)
        : [];
      namesToResolve = [...new Set([...mainNames, ...addonNames, appointment.services?.name].filter(Boolean))];
    }

    const { mainServices, addonDetails, unknownNames } = splitServicesByType(namesToResolve, serviceRows);

    const legacyMainFromAddons = !appointment.selected_service_names && appointment.add_ons
      ? splitServicesByType(
        appointment.add_ons.split(',').map((n) => n.trim()).filter(Boolean),
        serviceRows,
      )
      : null;

    const resolvedMain = appointment.selected_service_names
      ? mainServices
      : legacyMainFromAddons?.mainServices?.length
        ? legacyMainFromAddons.mainServices
        : mainServices.length
          ? mainServices
          : appointment.services
            ? [appointment.services]
            : [];

    const resolvedAddons = appointment.selected_service_names
      ? addonDetails
      : legacyMainFromAddons?.addonDetails?.length
        ? legacyMainFromAddons.addonDetails
        : addonDetails;

    const mainServiceLabel = resolvedMain.map((s) => s.name).join(', ') || appointment.services?.name || 'Service';
    const addOnTotal = resolvedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
    const mainTotal = resolvedMain.reduce((sum, s) => sum + (s.price || 0), 0);

    return {
      ...appointment,
      mainServices: resolvedMain,
      addonDetails: resolvedAddons,
      mainServiceLabel,
      unknownServiceNames: unknownNames,
      computedServiceTotal: mainTotal + addOnTotal,
    };
  });
}

/** Participating technician IDs — visit co-techs + primary, else lead tech only. */
export function getParticipatingTechnicians(appointment) {
  const visitTechs = appointment?.visit_technicians || [];
  const fromVisit = [...new Set(
    visitTechs.map((v) => v.technician_id).filter(Boolean),
  )];
  if (fromVisit.length > 0) return fromVisit;

  return appointment?.technician_id ? [appointment.technician_id] : [];
}

/** Build display names for participating technicians from appointment payload. */
export function getParticipatingTechnicianLabels(appointment, participatingIds) {
  const nameById = new Map();
  const lead = appointment?.technician || appointment?.technicians || appointment?.tech;
  if (lead?.id) {
    nameById.set(lead.id, lead.full_name);
  }
  (appointment?.visit_technicians || []).forEach((vt) => {
    const name = vt.full_name || vt.profiles?.full_name;
    if (vt.technician_id && name) nameById.set(vt.technician_id, name);
  });
  return (participatingIds || []).map((id) => ({
    technician_id: id,
    full_name: nameById.get(id) || 'Technician',
  }));
}

/** Normalize appointment technician fields for participating-tech helpers. */
export function normalizeAppointmentTechnicians(appointment) {
  const lead = appointment?.technician || appointment?.technicians || appointment?.tech || null;
  return {
    technician_id: appointment?.technician_id,
    technician: lead,
    visit_technicians: (appointment?.visit_technicians || []).map((vt) => ({
      ...vt,
      full_name: vt.full_name || vt.profiles?.full_name || null,
    })),
  };
}

/** Display names for all technicians involved in a visit. */
export function getAppointmentTechnicianNames(appointment) {
  const normalized = normalizeAppointmentTechnicians(appointment);
  const ids = getParticipatingTechnicians(normalized);
  if (!ids.length) {
    return normalized.technician?.full_name ? [normalized.technician.full_name] : [];
  }
  return getParticipatingTechnicianLabels(normalized, ids).map((t) => t.full_name);
}

export function buildAppointmentServicePayload(services = [], addOns = []) {
  const addOnNames = addOns.map((a) => a.name).filter(Boolean);
  const serviceNames = services.map((s) => s.name).filter(Boolean);
  return {
    add_ons: addOnNames.length ? addOnNames.join(', ') : null,
    selected_service_names: serviceNames.length ? serviceNames.join(', ') : null,
  };
}
