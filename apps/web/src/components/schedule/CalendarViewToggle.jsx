import { DAY_LABELS, toDateStr } from '@nail-couture/shared/utils/scheduleUtils';

export default function CalendarViewToggle({ view, onChange }) {
  return (
    <div className="flex items-center bg-secondary border border-light rounded-lg p-0.5">
      {[
        { id: 'month', label: 'Month' },
        { id: 'week', label: 'Week' },
      ].map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={view === opt.id}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            view === opt.id ? 'bg-gold text-charcoal shadow-sm' : 'text-secondary hover:text-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ScheduleWeekNav({
  label,
  onPrev,
  onNext,
  onToday,
  showToday = true,
  showArrows = true,
  stacked = false,
  compact = false,
}) {
  return (
    <div className={`flex gap-2 ${stacked ? 'flex-col items-end' : 'flex-wrap items-center'}`}>
      {showToday && onToday && (
        <button
          type="button"
          onClick={onToday}
          className={`bg-secondary border border-light text-secondary hover:border-gold/30 hover:text-gold rounded-lg font-medium transition-all ${
            compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
          }`}
        >
          Today
        </button>
      )}
      {showArrows ? (
        <div className="flex items-center bg-secondary border border-light rounded-lg p-0.5">
          <button type="button" onClick={onPrev} className="p-1.5 text-secondary hover:text-gold transition-colors" aria-label="Previous">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span
            className={`text-center font-medium tracking-wider text-primary ${
              compact
                ? 'px-2 text-[10px] min-w-0'
                : 'px-3 text-xs min-w-[120px] sm:min-w-[140px]'
            }`}
          >
            {label}
          </span>
          <button type="button" onClick={onNext} className="p-1.5 text-secondary hover:text-gold transition-colors" aria-label="Next">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : (
        <span className={`font-medium tracking-wider text-secondary ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {label}
        </span>
      )}
    </div>
  );
}
