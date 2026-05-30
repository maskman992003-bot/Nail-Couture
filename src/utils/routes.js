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
    case 'technician':
      return '/superadmin/settings';
    default: return '/customer/profile';
  }
}
