export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  assigned_pending: 'Assigned',
  serving: 'In Chair',
  ready_for_checkout: 'At Checkout',
  completed: 'Completed',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  pending: 'Pending',
  in_progress: 'In Progress',
};

export const APPOINTMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  waiting: { bg: 'rgba(234,179,8,0.2)', text: '#ca8a04' },
  assigned_pending: { bg: 'rgba(59,130,246,0.2)', text: '#2563eb' },
  serving: { bg: 'rgba(34,197,94,0.2)', text: '#16a34a' },
  ready_for_checkout: { bg: 'rgba(245,158,11,0.2)', text: '#d97706' },
  completed: { bg: 'rgba(34,197,94,0.15)', text: '#15803d' },
  cancelled: { bg: 'rgba(239,68,68,0.2)', text: '#dc2626' },
  confirmed: { bg: 'rgba(59,130,246,0.2)', text: '#2563eb' },
};

export const TIER_COLORS: Record<string, string> = {
  Silver: '#9ca3af',
  Gold: '#C5A059',
  Platinum: '#d1d5db',
  Diamond: '#22d3ee',
};
