/**
 * Maps notification types to navigation targets (web paths and mobile screens).
 */
import { getHomePath } from '../utils/routes.js';

const CHECKOUT_TYPES = new Set(['checkout_ready', 'checkout_price_change', 'loyalty_at_checkout']);
const LOBBY_TYPES = new Set([
  'lobby_waiting',
  'new_booking',
  'customer_cancelled',
  'assignment_declined',
  'customer_booking_edit',
  'service_changed',
  'waiver_signed',
]);
const MANAGEMENT_TYPES = new Set(['staff_added', 'inventory_low', 'time_off_request']);
const CUSTOMER_TYPES = new Set([
  'booking_confirmed',
  'appointment_updated',
  'appointment_cancelled',
  'checked_in',
  'technician_assigned',
  'service_started',
  'visit_completed',
  'payment_receipt',
  'loyalty_earned',
  'loyalty_redeemed',
  'referral_bonus',
  'appointment_missed',
  'waiver_required',
  'waiver_signed',
]);

const TECHNICIAN_TYPES = new Set(['new_assignment', 'assignment_cancelled', 'your_client_checkout']);
const SCHEDULE_TYPES = new Set(['time_off_request', 'time_off_decision', 'schedule_changed']);
const INVENTORY_TYPES = new Set(['inventory_low']);

function lobbyPath(role) {
  switch (role) {
    case 'super_admin':
      return '/superadmin/lobby';
    case 'owner':
      return '/owner/lobby';
    case 'partner':
      return '/partner/lobby';
    case 'admin':
      return '/admin/lobby';
    case 'cashier':
      return '/cashier/lobby';
    default:
      return getHomePath(role);
  }
}

function checkoutPath(role) {
  if (role === 'cashier') return '/cashier/checkout';
  return getHomePath(role);
}

function schedulePath(role) {
  switch (role) {
    case 'super_admin':
      return '/superadmin/schedule';
    case 'owner':
      return '/owner/schedule';
    case 'partner':
      return '/partner/schedule';
    case 'admin':
      return '/admin/schedule';
    case 'cashier':
      return '/cashier/schedule';
    case 'technician':
      return '/technician/schedule';
    default:
      return getHomePath(role);
  }
}

function inventoryPath(role) {
  switch (role) {
    case 'super_admin':
      return '/superadmin/inventory';
    case 'owner':
      return '/owner/inventory';
    case 'partner':
      return '/partner/inventory';
    default:
      return getHomePath(role);
  }
}

function staffPath(role) {
  switch (role) {
    case 'super_admin':
      return '/superadmin/staff';
    case 'owner':
      return '/owner/staff';
    case 'partner':
      return '/partner/staff';
    default:
      return getHomePath(role);
  }
}

/**
 * @param {string | undefined | null} type
 * @param {string | undefined | null} role
 * @returns {string | null}
 */
export function getNotificationWebPath(type, role) {
  if (!type || !role) return null;

  if (CHECKOUT_TYPES.has(type)) return checkoutPath(role);
  if (LOBBY_TYPES.has(type)) return lobbyPath(role);
  if (MANAGEMENT_TYPES.has(type)) {
    if (type === 'staff_added') return staffPath(role);
    if (type === 'inventory_low') return inventoryPath(role);
    if (type === 'time_off_request') return schedulePath(role);
  }
  if (TECHNICIAN_TYPES.has(type) && role === 'technician') return '/technician';
  if (SCHEDULE_TYPES.has(type)) return schedulePath(role);
  if (INVENTORY_TYPES.has(type)) return inventoryPath(role);
  if (CUSTOMER_TYPES.has(type) && role === 'customer') {
    if (type === 'payment_receipt' || type === 'visit_completed') return '/customer/history';
    if (type.startsWith('loyalty') || type === 'referral_bonus') return '/customer/loyalty';
    if (type === 'booking_confirmed' || type === 'appointment_updated') return '/customer/history';
    return '/portal';
  }

  return getHomePath(role);
}

/**
 * @param {string | undefined | null} type
 * @param {string | undefined | null} role
 * @returns {string | null}
 */
export function getNotificationMobileScreen(type, role) {
  if (!type || !role) return null;

  if (CHECKOUT_TYPES.has(type)) return 'Checkout';
  if (LOBBY_TYPES.has(type)) return 'Lobby';
  if (MANAGEMENT_TYPES.has(type)) {
    if (type === 'staff_added') return 'Staff';
    if (type === 'inventory_low') return 'Inventory';
    if (type === 'time_off_request') return 'Schedule';
  }
  if (TECHNICIAN_TYPES.has(type) && role === 'technician') return 'Home';
  if (SCHEDULE_TYPES.has(type)) return 'Schedule';
  if (INVENTORY_TYPES.has(type)) return 'Inventory';
  if (CUSTOMER_TYPES.has(type) && role === 'customer') {
    if (type === 'payment_receipt' || type === 'visit_completed') return 'History';
    if (type.startsWith('loyalty') || type === 'referral_bonus') return 'Loyalty';
    return 'Home';
  }

  return 'Home';
}
