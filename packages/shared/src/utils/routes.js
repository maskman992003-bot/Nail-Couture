export const STAFF_ROLES = ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'];
export const CHECK_IN_ROLE = 'check_in';

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function isCheckInRole(role) {
  return role === CHECK_IN_ROLE;
}

export function getHomePath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin';
    case 'owner': return '/owner';
    case 'partner': return '/partner';
    case 'admin': return '/admin';
    case 'cashier': return '/cashier';
    case 'technician': return '/technician';
    case 'check_in': return '/check-in';
    case 'customer': return '/portal';
    default: return '/login';
  }
}

export function getSettingsPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/settings';
    case 'owner': return '/owner/settings';
    case 'partner': return '/partner/settings';
    case 'admin': return '/admin/settings';
    case 'cashier':
      return '/cashier/settings';
    case 'technician':
      return '/technician/settings';
    case 'customer':
      return '/customer/settings';
    default:
      return '/customer/settings';
  }
}

export function getCustomersPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/customers';
    case 'owner': return '/owner/customers';
    case 'partner': return '/partner/customers';
    case 'admin': return '/admin/customers';
    case 'cashier': return '/cashier/customers';
    case 'technician': return '/technician/customers';
    default: return '/portal';
  }
}

export function getCustomerDetailPath(role, customerId) {
  return `${getCustomersPath(role)}/${customerId}`;
}

export function getSalonActivityPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/salon-activity';
    case 'owner': return '/owner/salon-activity';
    case 'partner': return '/partner/salon-activity';
    default: return '/portal';
  }
}

export function getAnnouncementsPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/announcements';
    case 'owner': return '/owner/announcements';
    case 'partner': return '/partner/announcements';
    default: return '/portal';
  }
}

export function getSalonUpdatesPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/salon-updates';
    case 'owner': return '/owner/salon-updates';
    case 'partner': return '/partner/salon-updates';
    case 'admin': return '/admin/salon-updates';
    case 'cashier': return '/cashier/salon-updates';
    case 'technician': return '/technician/salon-updates';
    case 'customer': return '/customer/salon-updates';
    default: return '/portal';
  }
}

export function getGiftCardsPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/gift-cards';
    case 'owner': return '/owner/gift-cards';
    case 'partner': return '/partner/gift-cards';
    case 'cashier': return '/cashier/gift-cards';
    case 'customer': return '/customer/gift-cards';
    default: return getHomePath(role);
  }
}

export function getFitnessAssessmentPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/fitness-assessment';
    case 'owner': return '/owner/fitness-assessment';
    case 'partner': return '/partner/fitness-assessment';
    case 'admin': return '/admin/fitness-assessment';
    case 'cashier': return '/cashier/fitness-assessment';
    case 'technician': return '/technician/fitness-assessment';
    case 'customer': return '/customer/fitness-assessment';
    default: return '/fitness-assessment';
  }
}

export function getNailAssessmentPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/nail-assessment';
    case 'owner': return '/owner/nail-assessment';
    case 'partner': return '/partner/nail-assessment';
    case 'admin': return '/admin/nail-assessment';
    case 'cashier': return '/cashier/nail-assessment';
    case 'technician': return '/technician/nail-assessment';
    case 'customer': return '/customer/nail-assessment';
    default: return '/nail-assessment';
  }
}

export function getMySchedulePath(role) {
  switch (role) {
    case 'cashier': return '/cashier/schedule';
    case 'technician': return '/technician/schedule';
    default: return '/technician/schedule';
  }
}

export function getMyTipsPath(role) {
  if (role === 'technician') return '/technician/tips';
  return '/technician/tips';
}

export function getCashierTransactionsPath(role) {
  if (role === 'cashier') return '/cashier/transactions';
  return '/cashier/transactions';
}

export function getStaffPlannerPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/schedule';
    case 'owner': return '/owner/schedule';
    case 'partner': return '/partner/schedule';
    case 'admin': return '/admin/schedule';
    default: return `/${role}/staff/schedule`;
  }
}

export function getReviewsPath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin/reviews';
    case 'owner': return '/owner/reviews';
    case 'partner': return '/partner/reviews';
    case 'admin': return '/admin/reviews';
    case 'cashier': return '/cashier/reviews';
    case 'technician': return '/technician/reviews';
    default: return '/login';
  }
}
