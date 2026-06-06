export const APPOINTMENT_STATUS_COLORS = {
  waiting: 'bg-yellow-400',
  assigned_pending: 'bg-blue-400',
  serving: 'bg-green-400',
  completed: 'bg-offwhite/40',
  cancelled: 'bg-red-400',
};

export const APPOINTMENT_STATUS_LABELS = {
  waiting: 'Waiting',
  assigned_pending: 'Assigned',
  serving: 'Serving',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function appointmentStatusBadgeClass(status) {
  switch (status) {
    case 'waiting':
      return 'bg-yellow-400/20 text-yellow-400';
    case 'serving':
      return 'bg-green-400/20 text-green-400';
    case 'completed':
      return 'bg-white/10 text-secondary';
    default:
      return 'bg-red-400/20 text-red-400';
  }
}
