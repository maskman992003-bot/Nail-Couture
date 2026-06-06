import clsx from 'clsx';

export default function TechnicianNewAssignmentBanner({
  assignments = [],
  onView,
  onDismissAll,
}) {
  if (assignments.length === 0) return null;

  const label = assignments.length === 1
    ? `New client assigned: ${assignments[0].name}`
    : `${assignments.length} new assignments`;

  return (
    <div
      className={clsx(
        'sticky top-0 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-2',
        'p-3 sm:p-4 bg-gold text-charcoal rounded-xl shadow-lg animate-pulse'
      )}
      role="alert"
    >
      <p className="text-sm font-medium min-w-0 truncate">{label}</p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onView}
          className="px-4 py-2 min-h-[44px] bg-charcoal text-gold text-sm font-medium rounded-lg hover:bg-charcoal/90"
        >
          View assignments
        </button>
        <button
          type="button"
          onClick={onDismissAll}
          className="px-3 py-2 text-sm opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
