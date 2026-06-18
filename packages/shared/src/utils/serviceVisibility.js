/**
 * Service visibility helpers for browse menus vs bookable/operational pickers.
 */

/** Normalize DB/API booleans — string "false" must not be treated as true. */
export function isTruthyFlag(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function isServiceMenuVisible(service) {
  return !isTruthyFlag(service?.is_addon);
}

export function isServiceBookable(service) {
  return isServiceMenuVisible(service) && !isTruthyFlag(service?.is_coming_soon);
}

export function isAddOnBookable(service) {
  return isTruthyFlag(service?.is_addon) && !isTruthyFlag(service?.is_coming_soon);
}

/** Coming soon prices are visible to owners only on browse/menu views. */
export function shouldShowServicePrice(service, role) {
  if (!isTruthyFlag(service?.is_coming_soon)) return true;
  return role === 'owner';
}
