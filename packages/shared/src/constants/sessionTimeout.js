export const SESSION_MIN_SECONDS = 60;

export const CONFIGURABLE_ROLES = [
  'super_admin',
  'owner',
  'partner',
  'admin',
  'cashier',
  'technician',
  'customer',
];

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  partner: 'Partner',
  admin: 'Admin',
  cashier: 'Cashier',
  technician: 'Technician',
  customer: 'Customer',
  check_in: 'Check-In Kiosk',
};

export const ROLE_COLORS = {
  super_admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  owner: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  partner: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  admin: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cashier: 'bg-green-500/20 text-green-300 border-green-500/30',
  technician: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  customer: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  check_in: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export const CUSTOMER_DEFAULT_IDLE_SECONDS = 900;
export const STAFF_DEFAULT_IDLE_SECONDS = 3600;
export const DEFAULT_WARNING_SECONDS = 60;
