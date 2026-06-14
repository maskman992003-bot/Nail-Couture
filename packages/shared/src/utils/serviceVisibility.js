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
