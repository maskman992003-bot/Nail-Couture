import { supabase } from '../lib/supabase';
import { getAppointmentServiceLabels } from './appointmentServices';
import { resolveReceiptTotals } from './customerStats.js';

const CHECK_IN_SOURCES = new Set(['check_in', 'kiosk', 'customer_kiosk']);

const SOURCE_LABELS = {
  check_in: 'Check-in',
  kiosk: 'Kiosk',
  customer_kiosk: 'Lobby',
  technician: 'Technician',
  admin_lobby: 'Admin',
};

function splitNames(value) {
  if (!value) return [];
  return value.split(',').map((n) => n.trim()).filter(Boolean);
}

function diffAddedNames(previous, next) {
  const prevSet = new Set(splitNames(previous));
  return splitNames(next).filter((name) => !prevSet.has(name));
}

function formatNames(names) {
  if (!names?.length) return '—';
  return names.join(', ');
}

function uniqueNames(names) {
  return [...new Set(names.filter(Boolean))];
}

export function getChangeSourceLabel(source) {
  return SOURCE_LABELS[source] || 'Staff';
}

export function formatChangedBy(row) {
  const name = row.changed_by_name || 'Unknown';
  const role = getChangeSourceLabel(row.change_source);
  return `${name} · ${role}`;
}

function diffNameLists(previousMain, previousAddons, nextMain, nextAddons) {
  const prevMain = new Set(splitNames(previousMain));
  const prevAddons = new Set(splitNames(previousAddons));
  const nextMainList = splitNames(nextMain);
  const nextAddonsList = splitNames(nextAddons);
  return {
    addedMain: nextMainList.filter((n) => !prevMain.has(n)),
    addedAddons: nextAddonsList.filter((n) => !prevAddons.has(n)),
    removedMain: splitNames(previousMain).filter((n) => !nextMainList.includes(n)),
    removedAddons: splitNames(previousAddons).filter((n) => !nextAddonsList.includes(n)),
  };
}

export function namesFromVisit(visit) {
  const names = new Set();
  splitNames(visit.selected_service_names).forEach((n) => names.add(n));
  splitNames(visit.add_ons).forEach((n) => names.add(n));
  if (visit.services?.name) names.add(visit.services.name);
  return [...names];
}

const CATALOG_TTL_MS = 5 * 60 * 1000;
const HISTORY_TTL_MS = 60 * 1000;

const catalogCache = { map: null, fetchedAt: 0, promise: null };
const appointmentHistoryCache = new Map();

export function invalidateServicePriceCache() {
  catalogCache.map = null;
  catalogCache.fetchedAt = 0;
  catalogCache.promise = null;
}

async function getFullServicePriceMap() {
  const now = Date.now();
  if (catalogCache.map && now - catalogCache.fetchedAt < CATALOG_TTL_MS) {
    return catalogCache.map;
  }

  if (!catalogCache.promise) {
    catalogCache.promise = supabase
      .from('services')
      .select('name, price, is_addon')
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load service prices:', error);
          return catalogCache.map || {};
        }
        const map = Object.fromEntries(
          (data || []).map((s) => [s.name, { price: Number(s.price) || 0, is_addon: s.is_addon }]),
        );
        catalogCache.map = map;
        catalogCache.fetchedAt = Date.now();
        return map;
      })
      .finally(() => {
        catalogCache.promise = null;
      });
  }

  return catalogCache.promise;
}

export async function fetchServicePriceMap(serviceNames) {
  const unique = [...new Set((serviceNames || []).filter(Boolean))];
  if (!unique.length) return {};

  const catalog = await getFullServicePriceMap();
  const result = {};
  unique.forEach((name) => {
    if (catalog[name]) result[name] = catalog[name];
  });
  return result;
}

export function lineItemsFromNames(names, priceMap) {
  return (names || []).map((name) => ({
    name,
    price: priceMap[name]?.price ?? null,
    is_addon: priceMap[name]?.is_addon ?? false,
  }));
}

export function classifyServiceNames(names, priceMap) {
  const main = [];
  const addons = [];
  (names || []).forEach((name) => {
    if (priceMap[name]?.is_addon) addons.push(name);
    else main.push(name);
  });
  return { main: uniqueNames(main), addons: uniqueNames(addons) };
}

/** Split visit appointment fields into main services vs catalog add-ons. */
export function parseVisitLineItems(visit, priceMap = {}) {
  const selectedMain = splitNames(visit.selected_service_names);
  const fromAddonsField = splitNames(visit.add_ons);
  const main = [...selectedMain];
  const addons = [];

  fromAddonsField.forEach((name) => {
    if (priceMap[name]?.is_addon) {
      addons.push(name);
    } else if (!main.includes(name)) {
      main.push(name);
    }
  });

  if (!main.length && visit.services?.name) main.push(visit.services.name);

  return {
    main: uniqueNames(main),
    addons: uniqueNames(addons),
    mainItems: lineItemsFromNames(uniqueNames(main), priceMap),
    addonItems: lineItemsFromNames(uniqueNames(addons), priceMap),
  };
}

export function buildVisitPaymentSummary(payment, lineItems) {
  const catalogSubtotal = sumLineItems(lineItems.mainItems) + sumLineItems(lineItems.addonItems);
  const totals = resolveReceiptTotals(
    payment,
    catalogSubtotal > 0 ? { computedServiceTotal: catalogSubtotal } : null,
  );

  return {
    subtotal: totals.serviceSubtotal,
    discount: totals.discount,
    discountType: payment?.discount_type || null,
    tip: totals.tip,
    giftCardAmount: totals.giftCardAmount,
    visitTotal: totals.total,
    totalPaid: totals.cashAmount ?? totals.total,
    paymentMethod: totals.paymentMethod,
  };
}

export function sumLineItems(items) {
  return (items || []).reduce((sum, item) => sum + (item.price ?? 0), 0);
}

/** Sum catalog prices for all final main services and add-ons on a visit. */
export function computeVisitCatalogSubtotal(visit, priceMap = {}) {
  const { mainItems, addonItems } = parseVisitFinalServices(visit, priceMap);
  const withPrices = enrichFinalServicesWithPrices({ mainItems, addonItems }, priceMap);
  return roundMoney(sumLineItems(withPrices.mainItems) + sumLineItems(withPrices.addonItems));
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function enrichStep(step, priceMap) {
  const mainItems = lineItemsFromNames(step.mainServices, priceMap);
  const addonItems = lineItemsFromNames(step.addons, priceMap);
  const removedMainItems = lineItemsFromNames(step.removedMain, priceMap);
  const removedAddonItems = lineItemsFromNames(step.removedAddons, priceMap);

  const stepPrice = step.action === 'Services removed'
    ? sumLineItems(removedMainItems) + sumLineItems(removedAddonItems)
    : sumLineItems(mainItems) + sumLineItems(addonItems);

  const fallbackPrice = step.isCheckIn && step.price != null ? Number(step.price) : null;

  return {
    ...step,
    mainItems,
    addonItems,
    removedMainItems,
    removedAddonItems,
    stepPrice: stepPrice > 0 ? stepPrice : fallbackPrice,
  };
}

export function parseVisitFinalServices(visit, priceMap = {}) {
  const parsed = parseVisitLineItems(visit, priceMap);
  const priceByName = {};
  (visit.addonDetails || []).forEach((a) => { priceByName[a.name] = Number(a.price); });
  if (visit.services?.name && visit.services?.price != null) {
    priceByName[visit.services.name] = Number(visit.services.price);
  }
  const withPrices = (items) => items.map((item) => ({
    ...item,
    price: priceByName[item.name] ?? item.price ?? priceMap[item.name]?.price ?? null,
  }));
  return {
    main: parsed.main,
    addons: parsed.addons,
    mainItems: withPrices(parsed.mainItems),
    addonItems: withPrices(parsed.addonItems),
  };
}

export function enrichFinalServicesWithPrices(finalServices, priceMap) {
  return {
    mainItems: finalServices.mainItems || lineItemsFromNames(finalServices.main, priceMap),
    addonItems: finalServices.addonItems || lineItemsFromNames(finalServices.addons, priceMap),
  };
}

export function formatVisitCardTitle(visit, summary) {
  const { main, addons } = parseVisitFinalServices(visit);
  const total = main.length + addons.length;
  if (total === 0) return 'Service';
  if (total === 1) return main[0] || addons[0];
  const first = main[0] || addons[0];
  return `${first} +${total - 1} more`;
}

export async function fetchAppointmentServiceHistory(appointmentIds) {
  if (!appointmentIds?.length) return {};

  const now = Date.now();
  const result = {};
  const uncachedIds = [];

  appointmentIds.forEach((id) => {
    const cached = appointmentHistoryCache.get(id);
    if (cached && now - cached.fetchedAt < HISTORY_TTL_MS) {
      result[id] = cached.rows;
    } else {
      uncachedIds.push(id);
    }
  });

  if (!uncachedIds.length) return result;

  const { data, error } = await supabase
    .from('appointment_service_history')
    .select(`
      id, appointment_id, changed_by, changed_by_name, change_source,
      previous_service_names, new_service_names,
      previous_addons, new_addons,
      previous_final_price, new_final_price,
      created_at
    `)
    .in('appointment_id', uncachedIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load appointment service history:', error);
    return result;
  }

  const fetched = {};
  uncachedIds.forEach((id) => { fetched[id] = []; });

  (data || []).forEach((row) => {
    if (!fetched[row.appointment_id]) fetched[row.appointment_id] = [];
    fetched[row.appointment_id].push(row);
  });

  uncachedIds.forEach((id) => {
    const rows = fetched[id] || [];
    appointmentHistoryCache.set(id, { rows, fetchedAt: now });
    result[id] = rows;
  });

  return result;
}

/** Load history + prices in parallel for a single visit (modal/detail panels). */
export async function loadVisitServiceSummary(visit) {
  if (!visit?.id) return null;

  const [historyMap, priceMap] = await Promise.all([
    fetchAppointmentServiceHistory([visit.id]),
    getFullServicePriceMap(),
  ]);

  return buildVisitServiceSummary(visit, historyMap[visit.id] || [], priceMap);
}

export async function fetchCustomerServiceHistory(customerId) {
  if (!customerId) return [];

  const { data: appts, error: apptError } = await supabase
    .from('appointments')
    .select('id')
    .eq('customer_id', customerId);

  if (apptError) {
    console.error('Failed to load appointments for service history:', apptError);
    return [];
  }

  const appointmentIds = (appts || []).map((a) => a.id);
  if (!appointmentIds.length) return [];

  const { data, error } = await supabase
    .from('appointment_service_history')
    .select(`
      id, appointment_id, changed_by, changed_by_name, change_source,
      previous_service_names, new_service_names,
      previous_addons, new_addons,
      previous_final_price, new_final_price,
      created_at
    `)
    .in('appointment_id', appointmentIds)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to load customer service history:', error);
    return [];
  }

  return data || [];
}

/**
 * Reconstruct what the customer selected at check-in (mains + add-ons).
 * Prefer the first staff edit's previous_* snapshot; fall back to the check-in audit row.
 */
function resolveCheckInSnapshot(visit, rows, priceMap = {}) {
  const checkInRow = rows.find((r) => CHECK_IN_SOURCES.has(r.change_source));
  const staffRows = rows.filter((r) => !CHECK_IN_SOURCES.has(r.change_source));

  if (staffRows.length > 0) {
    const firstStaff = staffRows[0];
    const prevMain = splitNames(firstStaff.previous_service_names);
    const prevAddons = splitNames(firstStaff.previous_addons);
    if (prevMain.length || prevAddons.length) {
      return {
        main: prevMain,
        addons: prevAddons,
        date: checkInRow?.created_at || firstStaff.created_at,
        row: checkInRow || firstStaff,
      };
    }
  }

  if (checkInRow) {
    const rawMain = splitNames(checkInRow.new_service_names);
    const rawAddons = splitNames(checkInRow.new_addons);
    if (rawAddons.length || !Object.keys(priceMap).length) {
      return {
        main: rawMain,
        addons: rawAddons,
        date: checkInRow.created_at,
        row: checkInRow,
      };
    }
    const classified = classifyServiceNames([...rawMain, ...rawAddons], priceMap);
    return {
      main: classified.main,
      addons: classified.addons,
      date: checkInRow.created_at,
      row: checkInRow,
    };
  }

  const selectedMain = splitNames(visit.selected_service_names);
  const addonsField = splitNames(visit.add_ons);
  const classifiedAddons = classifyServiceNames(addonsField, priceMap);
  const legacyMainFromAddons = addonsField.filter((n) => !priceMap[n]?.is_addon);

  return {
    main: selectedMain.length ? selectedMain : legacyMainFromAddons,
    addons: classifiedAddons.addons,
    date: visit.checked_in_at || visit.created_at,
    row: null,
  };
}

function buildCheckInStep(visit, checkInSnapshot) {
  const row = checkInSnapshot.row;
  const isKioskLog = row?.change_source === 'customer_kiosk';

  return {
    id: row?.id || `checkin-${visit.id}`,
    date: checkInSnapshot.date || visit.checked_in_at || visit.created_at,
    action: 'Selected at check-in',
    mainServices: uniqueNames(checkInSnapshot.main),
    addons: uniqueNames(checkInSnapshot.addons),
    removedMain: [],
    removedAddons: [],
    changedByName: row?.changed_by_name || (isKioskLog ? 'Customer' : 'Kiosk check-in'),
    changedByRole: row ? getChangeSourceLabel(row.change_source) : 'Check-in',
    price: row?.new_final_price != null ? Number(row.new_final_price) : null,
    isCheckIn: true,
  };
}

function buildRemovedStep(visit, removedMain, removedAddons, meta = {}) {
  if (!removedMain.length && !removedAddons.length) return null;

  return {
    id: `removed-${visit.id}-${meta.id || 'final'}`,
    date: meta.date || visit.completed_at || visit.start_time || visit.checked_in_at || visit.created_at,
    action: 'Services removed',
    mainServices: [],
    addons: [],
    removedMain: uniqueNames(removedMain),
    removedAddons: uniqueNames(removedAddons),
    changedByName: meta.changedByName || visit.technicians?.full_name || 'Staff',
    changedByRole: meta.changedByRole || (visit.technicians?.full_name ? 'Technician' : 'Staff'),
    price: null,
    isCheckIn: false,
  };
}

function buildAddedStep(visit, addedMain, addedAddons, meta = {}) {
  if (!addedMain.length && !addedAddons.length) return null;

  return {
    id: `added-${visit.id}-${meta.id || 'final'}`,
    date: meta.date || visit.completed_at || visit.start_time || visit.checked_in_at || visit.created_at,
    action: 'Services added',
    mainServices: uniqueNames(addedMain),
    addons: uniqueNames(addedAddons),
    removedMain: [],
    removedAddons: [],
    changedByName: meta.changedByName || visit.technicians?.full_name || 'Staff',
    changedByRole: meta.changedByRole || (visit.technicians?.full_name ? 'Technician' : 'Staff'),
    price: null,
    isCheckIn: false,
  };
}

function buildDisplayChangeLog(visit, rows, priceMap = {}) {
  const finalParsed = parseVisitFinalServices(visit, priceMap);
  const finalServices = { main: finalParsed.main, addons: finalParsed.addons };

  const checkInSnapshot = resolveCheckInSnapshot(visit, rows, priceMap);
  const checkInStep = buildCheckInStep(visit, checkInSnapshot);
  const staffRows = rows.filter((r) => !CHECK_IN_SOURCES.has(r.change_source));

  let runningMain = checkInStep.mainServices.join(', ') || null;
  let runningAddons = checkInStep.addons.join(', ') || null;

  const allRemovedMain = [];
  const allRemovedAddons = [];
  const allAddedMain = [];
  const allAddedAddons = [];
  let lastStaffMeta = {
    changedByName: visit.technicians?.full_name || 'Staff',
    changedByRole: visit.technicians?.full_name ? 'Technician' : 'Staff',
    date: visit.completed_at || visit.start_time || visit.checked_in_at || visit.created_at,
    price: null,
  };

  staffRows.forEach((row) => {
    const diff = diffNameLists(runningMain, runningAddons, row.new_service_names, row.new_addons);
    allRemovedMain.push(...diff.removedMain);
    allRemovedAddons.push(...diff.removedAddons);
    allAddedMain.push(...diff.addedMain);
    allAddedAddons.push(...diff.addedAddons);
    runningMain = row.new_service_names;
    runningAddons = row.new_addons;
    lastStaffMeta = {
      id: row.id,
      changedByName: row.changed_by_name || lastStaffMeta.changedByName,
      changedByRole: getChangeSourceLabel(row.change_source),
      date: row.created_at,
    };
  });

  const finalMainSet = new Set(finalServices.main);
  const finalAddonSet = new Set(finalServices.addons);
  const fromCheckInRemovedMain = checkInStep.mainServices.filter((n) => !finalMainSet.has(n));
  const fromCheckInRemovedAddons = checkInStep.addons.filter((n) => !finalAddonSet.has(n));

  const afterStaffMain = splitNames(runningMain);
  const afterStaffAddons = splitNames(runningAddons);
  const inferredAddedMain = finalServices.main.filter((n) => !afterStaffMain.includes(n));
  const inferredAddedAddons = finalServices.addons.filter((n) => !afterStaffAddons.includes(n));

  const steps = [checkInStep];

  const removedStep = buildRemovedStep(
    visit,
    uniqueNames([...allRemovedMain, ...fromCheckInRemovedMain]),
    uniqueNames([...allRemovedAddons, ...fromCheckInRemovedAddons]),
    lastStaffMeta
  );
  if (removedStep) steps.push(removedStep);

  const addedClassified = classifyServiceNames(
    uniqueNames([...allAddedMain, ...inferredAddedMain, ...allAddedAddons, ...inferredAddedAddons]),
    priceMap
  );
  const addedStep = buildAddedStep(
    visit,
    addedClassified.main,
    addedClassified.addons,
    lastStaffMeta
  );
  if (addedStep) steps.push(addedStep);

  if (!rows.length && !removedStep && !addedStep) {
    const inferredClassified = classifyServiceNames(
      uniqueNames([...inferredAddedMain, ...inferredAddedAddons]),
      priceMap
    );
    const addedOnly = buildAddedStep(visit, inferredClassified.main, inferredClassified.addons, lastStaffMeta);
    if (addedOnly) steps.push(addedOnly);
  }

  return { steps };
}

export function collectServiceNamesFromSummary(visit, summary) {
  const names = new Set(namesFromVisit(visit));
  (summary?.changeLog || []).forEach((step) => {
    (step.mainServices || []).forEach((n) => names.add(n));
    (step.addons || []).forEach((n) => names.add(n));
    (step.removedMain || []).forEach((n) => names.add(n));
    (step.removedAddons || []).forEach((n) => names.add(n));
  });
  (summary?.finalServices?.main || []).forEach((n) => names.add(n));
  (summary?.finalServices?.addons || []).forEach((n) => names.add(n));
  return [...names];
}

/**
 * Build visit service summary for History tab display.
 */
export function buildVisitServiceSummary(visit, historyRows = [], priceMap = {}) {
  const finalLabels = getAppointmentServiceLabels(visit);
  const rows = [...historyRows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const checkInSnapshot = resolveCheckInSnapshot(visit, rows, priceMap);
  const checkInRow = checkInSnapshot.row;

  const finalServices = parseVisitFinalServices(visit, priceMap);
  const finalWithPrices = enrichFinalServicesWithPrices(finalServices, priceMap);
  const paymentSummary = buildVisitPaymentSummary(visit.payment, finalWithPrices);

  const { steps } = buildDisplayChangeLog(visit, rows, priceMap);
  const changeLog = steps.map((step) => enrichStep(step, priceMap));
  const laterChanges = changeLog.filter((entry) => !entry.isCheckIn);
  const removedEntry = changeLog.find((entry) => entry.action === 'Services removed');

  const hasHistory = rows.length > 0;
  const checkInMainItems = lineItemsFromNames(checkInSnapshot.main, priceMap);
  const checkInAddonItems = lineItemsFromNames(checkInSnapshot.addons, priceMap);
  const showApproximate = !hasHistory && (
    checkInSnapshot.main.length > 0 || checkInSnapshot.addons.length > 0
  ) && (
    JSON.stringify(checkInSnapshot.main) !== JSON.stringify(finalServices.main)
    || JSON.stringify(checkInSnapshot.addons) !== JSON.stringify(finalServices.addons)
  );

  const performedRemoved = removedEntry
    ? {
      mainItems: removedEntry.removedMainItems || [],
      addonItems: removedEntry.removedAddonItems || [],
    }
    : { mainItems: [], addonItems: [] };

  return {
    finalLabels,
    finalLabelText: formatNames(finalLabels),
    finalServices,
    finalWithPrices,
    paymentSummary,
    performedRemoved,
    checkIn: {
      services: checkInSnapshot.main,
      addons: checkInSnapshot.addons,
      mainItems: checkInMainItems,
      addonItems: checkInAddonItems,
      date: checkInSnapshot.date || visit.checked_in_at || visit.created_at,
      attribution: checkInRow ? formatChangedBy(checkInRow) : (checkInSnapshot.main.length || checkInSnapshot.addons.length ? 'Check-in' : null),
      approximate: showApproximate,
    },
    laterChanges,
    changeLog,
    hasHistory,
  };
}

export function formatServiceChangeEvent(row) {
  const addedServices = diffAddedNames(row.previous_service_names, row.new_service_names);
  const addedAddons = diffAddedNames(row.previous_addons, row.new_addons);
  const parts = [];

  if (CHECK_IN_SOURCES.has(row.change_source)) {
    const names = [...splitNames(row.new_service_names), ...splitNames(row.new_addons)];
    parts.push(names.length ? names.join(', ') : 'Services selected');
  } else {
    if (addedServices.length) parts.push(addedServices.join(', '));
    if (addedAddons.length) parts.push(addedAddons.map((n) => `+ ${n}`).join(', '));
    if (!parts.length) {
      const all = [...splitNames(row.new_service_names), ...splitNames(row.new_addons)];
      if (all.length) parts.push(all.join(', '));
    }
  }

  const isCheckIn = CHECK_IN_SOURCES.has(row.change_source);
  return {
    title: isCheckIn ? 'Services at check-in' : 'Services updated',
    subtitle: `Changed by ${formatChangedBy(row)}`,
    body: parts.join(' · ') || null,
    amount: row.new_final_price,
  };
}
