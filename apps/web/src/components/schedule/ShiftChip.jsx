import { SHIFT_COLORS, formatTime } from '@nail-couture/shared/utils/scheduleUtils';

export default function ShiftChip({ shift, size = 'sm', onDelete, className = '' }) {
  const colorClass = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.custom;
  const isSmall = size === 'sm';

  return (
    <div
      className={`${isSmall ? 'rounded-lg px-2 py-1.5 text-[10px]' : 'rounded-xl border p-3'} ${colorClass} ${className}`}
    >
      <div className={`flex items-center justify-between gap-2 ${isSmall ? '' : ''}`}>
        <div className={`font-semibold capitalize ${isSmall ? '' : 'text-sm'}`}>{shift.shift_type}</div>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(shift.id)}
            className="text-current/50 hover:text-red-400 text-lg leading-none shrink-0"
            aria-label="Remove shift"
          >
            &times;
          </button>
        )}
      </div>
      <div className={`opacity-70 ${isSmall ? '' : 'text-xs mt-1'}`}>
        {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
      </div>
    </div>
  );
}
