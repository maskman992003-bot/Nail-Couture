export default function TimeOffChip({ status = 'approved', size = 'sm' }) {
  const isPending = status === 'pending';
  const sizeClass = size === 'sm'
    ? 'text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-lg'
    : 'text-[10px] px-2 py-1 rounded-lg';

  return (
    <span
      className={`block truncate border font-medium ${sizeClass} ${
        isPending
          ? 'bg-yellow-500/10 text-yellow-400/90 border-yellow-500/25'
          : 'bg-white/[0.04] text-muted border-white/15'
      }`}
    >
      {isPending ? 'Pending off' : 'Time off'}
    </span>
  );
}
