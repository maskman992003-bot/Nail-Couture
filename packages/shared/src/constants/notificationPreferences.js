/**
 * Notification preference groups shown in Settings per role.
 * Users expand each group and toggle individual notification types.
 * Muted types are stored in profiles.notification_preferences.muted_types.
 */

/** @type {Record<string, { label: string, description: string }>} */
export const NOTIFICATION_TYPE_LABELS = {
  booking_confirmed: {
    label: 'Booking confirmed',
    description: 'When your appointment is booked or confirmed',
  },
  appointment_updated: {
    label: 'Appointment updated',
    description: 'When date, time, or services change',
  },
  appointment_cancelled: {
    label: 'Appointment cancelled',
    description: 'When your visit is cancelled',
  },
  checked_in: {
    label: 'Checked in',
    description: 'When you arrive and check in at the salon',
  },
  technician_assigned: {
    label: 'Technician assigned',
    description: 'When a technician is assigned to your visit',
  },
  service_started: {
    label: 'Service started',
    description: 'When your service begins',
  },
  visit_completed: {
    label: 'Visit completed',
    description: 'When your visit is finished',
  },
  appointment_missed: {
    label: 'Missed appointment',
    description: 'When a no-show is recorded',
  },
  appointment_reminder: {
    label: 'Appointment reminders',
    description: 'Upcoming visit reminders',
  },
  payment_receipt: {
    label: 'Payment receipts',
    description: 'After checkout and payment',
  },
  review_request: {
    label: 'Review requests',
    description: 'Reminder to rate your visit after checkout',
  },
  loyalty_earned: {
    label: 'Points earned',
    description: 'When you earn loyalty points',
  },
  loyalty_redeemed: {
    label: 'Rewards redeemed',
    description: 'When you use a loyalty reward',
  },
  referral_bonus: {
    label: 'Referral bonuses',
    description: 'When a referral earns you points',
  },
  waiver_signed: {
    label: 'Waiver signed',
    description: 'When a waiver is completed',
  },
  waiver_required: {
    label: 'Waiver required',
    description: 'When a waiver is needed before service',
  },
  lobby_waiting: {
    label: 'Client waiting in lobby',
    description: 'When a client checks in and is waiting',
  },
  new_booking: {
    label: 'New booking',
    description: 'When a new appointment is created',
  },
  customer_cancelled: {
    label: 'Customer cancellation',
    description: 'When a customer cancels their visit',
  },
  assignment_declined: {
    label: 'Assignment declined',
    description: 'When a technician declines an assignment',
  },
  customer_booking_edit: {
    label: 'Booking edited',
    description: 'When a customer changes their booking',
  },
  service_changed: {
    label: 'Service changed mid-visit',
    description: 'When services are updated during a visit',
  },
  checkout_ready: {
    label: 'Ready for checkout',
    description: 'When a client is ready to pay',
  },
  checkout_price_change: {
    label: 'Price change at checkout',
    description: 'When the final price is adjusted',
  },
  loyalty_at_checkout: {
    label: 'Loyalty at checkout',
    description: 'When a customer redeems points at the register',
  },
  time_off_request: {
    label: 'Time-off requests',
    description: 'When staff request time off',
  },
  staff_added: {
    label: 'New staff member',
    description: 'When someone joins the team',
  },
  inventory_low: {
    label: 'Low inventory',
    description: 'When stock falls below threshold',
  },
  new_assignment: {
    label: 'New client assignment',
    description: 'When you are assigned a client',
  },
  assignment_cancelled: {
    label: 'Assignment cancelled',
    description: 'When an assignment is removed or reassigned',
  },
  your_client_checkout: {
    label: 'Your client checked out',
    description: 'When your assigned client completes checkout',
  },
  schedule_changed: {
    label: 'Schedule changes',
    description: 'When your shifts are added or updated',
  },
  time_off_decision: {
    label: 'Time-off decisions',
    description: 'When your time-off request is approved or denied',
  },
  salon_announcement: {
    label: 'Salon announcements',
    description: 'Promotions and updates from the salon',
  },
  birthday_wish: {
    label: 'Birthday wishes',
    description: 'A birthday greeting and bonus points on your special day',
  },
};

const SALON_UPDATES_GROUP = {
  id: 'salon_updates',
  label: 'Salon updates',
  description: 'Promotions and news from the salon',
  types: ['salon_announcement', 'birthday_wish'],
};

const CUSTOMER_GROUPS = [
  {
    id: 'appointments',
    label: 'Appointments',
    description: 'Bookings, check-in, service updates, and reminders',
    types: [
      'booking_confirmed',
      'appointment_updated',
      'appointment_cancelled',
      'checked_in',
      'technician_assigned',
      'service_started',
      'visit_completed',
      'appointment_missed',
      'appointment_reminder',
    ],
  },
  {
    id: 'payments_loyalty',
    label: 'Payments & rewards',
    description: 'Receipts, points earned, and referral bonuses',
    types: ['payment_receipt', 'review_request', 'loyalty_earned', 'loyalty_redeemed', 'referral_bonus'],
  },
  {
    id: 'waivers',
    label: 'Waivers',
    description: 'Waiver confirmations and requirements',
    types: ['waiver_signed', 'waiver_required'],
  },
  SALON_UPDATES_GROUP,
];

const ADMIN_GROUPS = [
  {
    id: 'lobby',
    label: 'Lobby & bookings',
    description: 'Check-ins, new bookings, and cancellations',
    types: [
      'lobby_waiting',
      'new_booking',
      'customer_cancelled',
      'assignment_declined',
      'customer_booking_edit',
    ],
  },
  {
    id: 'operations',
    label: 'Visit updates',
    description: 'Waivers and mid-visit service changes',
    types: ['waiver_signed', 'service_changed'],
  },
  SALON_UPDATES_GROUP,
];

const CASHIER_GROUPS = [
  {
    id: 'checkout',
    label: 'Checkout queue',
    description: 'Clients ready to pay and price changes',
    types: ['checkout_ready', 'checkout_price_change', 'loyalty_at_checkout'],
  },
  SALON_UPDATES_GROUP,
];

const MANAGEMENT_GROUPS = [
  {
    id: 'management',
    label: 'Salon management',
    description: 'Staff, inventory, and time-off requests',
    types: ['time_off_request', 'staff_added', 'inventory_low'],
  },
  ...ADMIN_GROUPS,
];

const TECHNICIAN_GROUPS = [
  {
    id: 'assignments',
    label: 'Client assignments',
    description: 'New clients, reassignments, and checkout handoffs',
    types: ['new_assignment', 'assignment_cancelled', 'your_client_checkout'],
  },
  {
    id: 'schedule',
    label: 'Schedule & time off',
    description: 'Shift changes and time-off decisions',
    types: ['schedule_changed', 'time_off_decision'],
  },
  SALON_UPDATES_GROUP,
];

const GROUPS_BY_ROLE = {
  customer: CUSTOMER_GROUPS,
  admin: ADMIN_GROUPS,
  cashier: CASHIER_GROUPS,
  technician: TECHNICIAN_GROUPS,
  owner: MANAGEMENT_GROUPS,
  partner: MANAGEMENT_GROUPS,
  super_admin: MANAGEMENT_GROUPS,
};

/**
 * @param {string} type
 */
function formatTypeLabel(type) {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * @param {string | undefined | null} role
 * @returns {Array<{ id: string, label: string, description: string, types: string[] }>}
 */
export function getNotificationGroupsForRole(role) {
  if (!role) return [];
  return GROUPS_BY_ROLE[role] || [];
}

/**
 * @param {string} type
 */
export function getNotificationTypeLabel(type) {
  return NOTIFICATION_TYPE_LABELS[type]?.label || formatTypeLabel(type);
}

/**
 * @param {string} type
 */
export function getNotificationTypeDescription(type) {
  return NOTIFICATION_TYPE_LABELS[type]?.description || '';
}

/**
 * @param {{ types: string[] }} group
 * @param {string[]} mutedTypes
 */
export function buildGroupTypeItems(group, mutedTypes) {
  const muted = Array.isArray(mutedTypes) ? mutedTypes : [];
  return (group?.types || []).map((type) => ({
    id: type,
    label: getNotificationTypeLabel(type),
    description: getNotificationTypeDescription(type),
    enabled: !muted.includes(type),
  }));
}

/**
 * @param {{ types: string[] }} group
 * @param {string[]} mutedTypes
 */
export function getGroupEnabledSummary(group, mutedTypes) {
  const totalCount = group?.types?.length || 0;
  const enabledCount = (group?.types || []).filter((type) => !mutedTypes.includes(type)).length;
  return {
    enabledCount,
    totalCount,
    allEnabled: totalCount > 0 && enabledCount === totalCount,
    noneEnabled: enabledCount === 0,
    partial: enabledCount > 0 && enabledCount < totalCount,
  };
}

/**
 * @param {string} type
 * @param {string[]} mutedTypes
 */
export function isNotificationTypeEnabled(type, mutedTypes) {
  return !mutedTypes.includes(type);
}

/**
 * @param {string} type
 * @param {string[]} mutedTypes
 * @param {boolean} enabled
 * @returns {string[]}
 */
export function applyNotificationTypeToggle(type, mutedTypes, enabled) {
  const current = Array.isArray(mutedTypes) ? [...mutedTypes] : [];
  if (enabled) {
    return current.filter((item) => item !== type);
  }
  if (current.includes(type)) return current;
  return [...current, type];
}

/**
 * @param {{ types: string[] }} group
 * @param {string[]} mutedTypes
 */
export function isNotificationGroupEnabled(group, mutedTypes) {
  if (!group?.types?.length) return true;
  return !group.types.some((type) => mutedTypes.includes(type));
}

/**
 * @param {{ types: string[] }} group
 * @param {string[]} mutedTypes
 * @param {boolean} enabled
 * @returns {string[]}
 */
export function applyNotificationGroupToggle(group, mutedTypes, enabled) {
  const current = Array.isArray(mutedTypes) ? [...mutedTypes] : [];
  if (enabled) {
    return current.filter((type) => !group.types.includes(type));
  }
  return [...new Set([...current, ...group.types])];
}
