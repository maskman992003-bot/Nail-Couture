/** Slug for checklist item id from label. */
export function checklistItemId(label, index = 0) {
  const slug = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || `step_${index}`;
}

/** Parse checklist lines (one per line) into metadata checklist array. */
export function linesToChecklist(lines) {
  return String(lines || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((label, i) => ({ id: checklistItemId(label, i), label }));
}

/** Format checklist array back to lines for admin textarea. */
export function checklistToLines(checklist = []) {
  return (checklist || []).map((item) => item.label || item.id).join('\n');
}

/** Extract checklist template from a service metadata object. */
export function getServiceChecklist(service) {
  const items = service?.metadata?.checklist;
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item?.id && item?.label);
}

/**
 * Build merged checklist for an appointment from primary service + add-on names.
 * allServices: full catalog from DB.
 */
export function buildAppointmentChecklist(appointment, allServices = []) {
  const seen = new Set();
  const items = [];

  const primary = appointment.services;
  if (primary) {
    getServiceChecklist(primary).forEach((item) => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    });
  }

  const names = appointment.add_ons
    ? appointment.add_ons.split(',').map((n) => n.trim()).filter(Boolean)
    : [];

  names.forEach((name) => {
    const svc = allServices.find((s) => s.name === name);
    if (!svc) return;
    getServiceChecklist(svc).forEach((item) => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    });
  });

  return items;
}

/** Read completed-at timestamps from appointment.metadata.checklist. */
export function getChecklistProgress(appointment) {
  const progress = appointment?.metadata?.checklist;
  if (!progress || typeof progress !== 'object') return {};
  return progress;
}

/** Toggle one checklist item; returns new metadata object. */
export function toggleChecklistItem(currentMetadata, itemId, completed) {
  const meta = { ...(currentMetadata || {}) };
  const checklist = { ...(meta.checklist || {}) };
  if (completed) {
    checklist[itemId] = new Date().toISOString();
  } else {
    delete checklist[itemId];
  }
  return { ...meta, checklist };
}

export function checklistCompletionCount(items, progress) {
  const done = items.filter((item) => progress[item.id]).length;
  return { done, total: items.length };
}
