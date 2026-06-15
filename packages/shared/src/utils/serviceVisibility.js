/**
 * Service visibility helpers for browse menus vs bookable/operational pickers.
 */

export function isServiceMenuVisible(service) {
  return !service?.is_addon;
}

export function isServiceBookable(service) {
  return isServiceMenuVisible(service) && !service?.is_coming_soon;
}

export function isAddOnBookable(service) {
  return Boolean(service?.is_addon) && !service?.is_coming_soon;
}

/** Coming soon prices are visible to owners only on browse/menu views. */
export function shouldShowServicePrice(service, role) {
  if (!service?.is_coming_soon) return true;
  return role === 'owner';
}
