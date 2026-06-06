export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  waiting: '#facc15',
  assigned_pending: '#60a5fa',
  serving: '#4ade80',
  ready_for_checkout: '#fbbf24',
  completed: '#22c55e',
  cancelled: '#f87171',
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  assigned_pending: 'Assigned',
  serving: 'In Chair',
  ready_for_checkout: 'Checkout',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function appointmentStatusBadgeStyle(status: string) {
  const color = APPOINTMENT_STATUS_COLORS[status] || '#9ca3af';
  return {
    backgroundColor: `${color}22`,
    borderColor: `${color}55`,
    color,
  };
}

export type ShiftChipStyle = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

export const SHIFT_CHIP_STYLES: Record<string, ShiftChipStyle> = {
  morning: { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', borderColor: 'rgba(245, 158, 11, 0.3)' },
  afternoon: { backgroundColor: 'rgba(14, 165, 233, 0.2)', color: '#7dd3fc', borderColor: 'rgba(14, 165, 233, 0.3)' },
  evening: { backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.3)' },
  custom: { backgroundColor: 'rgba(197, 160, 89, 0.2)', color: '#C5A059', borderColor: 'rgba(197, 160, 89, 0.3)' },
};

export const SHIFT_DOT_COLORS: Record<string, string> = {
  morning: '#fbbf24',
  afternoon: '#38bdf8',
  evening: '#a78bfa',
  custom: '#C5A059',
};

export function getShiftChipStyle(shiftType: string): ShiftChipStyle {
  return SHIFT_CHIP_STYLES[shiftType] || SHIFT_CHIP_STYLES.custom;
}
