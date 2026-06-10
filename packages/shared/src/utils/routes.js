export const STAFF_ROLES = ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function getHomePath(role) {
  switch (role) {
    case 'super_admin': return '/superadmin';
    case 'owner': return '/owner';
    case 'partner': return '/partner';
    case 'admin': return '/admin';
    case 'cashier': return '/cashier';
    case 'technician': return '/technician';
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
