export const CRM_MANAGEMENT_ROLES = ['super_admin', 'owner', 'partner'];

export const CRM_STAFF_ROLES = ['super_admin', 'owner', 'partner', 'admin', 'cashier', 'technician'];

export function canAccessStaffCrm(role) {
  return CRM_STAFF_ROLES.includes(role);
}

export function canEditCustomerProfile(role) {
  return CRM_MANAGEMENT_ROLES.includes(role);
}

export function canAdjustLoyalty(role) {
  return CRM_MANAGEMENT_ROLES.includes(role);
}

export function canUploadVisitPhotos(role) {
  return CRM_STAFF_ROLES.includes(role);
}

export function canAddStaffNotes(role) {
  return CRM_STAFF_ROLES.includes(role);
}
