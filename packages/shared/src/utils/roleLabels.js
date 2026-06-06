export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  partner: 'Partner',
  admin: 'Admin',
  cashier: 'Cashier',
  technician: 'Technician',
  customer: 'Customer',
};

export const ROLE_COLORS = {
  super_admin: { bg: 'rgba(147,51,234,0.2)', text: '#c084fc' },
  owner: { bg: 'rgba(147,51,234,0.2)', text: '#c084fc' },
  partner: { bg: 'rgba(99,102,241,0.2)', text: '#818cf8' },
  admin: { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' },
  cashier: { bg: 'rgba(34,197,94,0.2)', text: '#4ade80' },
  technician: { bg: 'rgba(234,179,8,0.2)', text: '#facc15' },
  customer: { bg: 'rgba(107,114,128,0.2)', text: '#9ca3af' },
};

export function formatPhone(phone) {
  if (!phone) return 'Not set';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function formatProfileDate(timestamp) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function normalizeStaffPhone(rawPhone) {
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = `1${cleanPhone}`;
  if (cleanPhone.length !== 11) return null;
  return `+${cleanPhone}`;
}
