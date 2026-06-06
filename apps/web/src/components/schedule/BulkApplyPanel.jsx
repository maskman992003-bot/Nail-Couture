import { ROLE_LABELS, getMonthLabel } from '@nail-couture/shared/utils/scheduleUtils';

function ChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function BulkApplyPanel({
  viewYear,
  viewMonth,
  isCurrentMonth,
  previewCount,
  bulkTarget,
  replaceExisting,
  selectedMember,
  applying,
  applyMessage,
  applyError,
  monthShiftCount,
  onPrevMonth,
  onNextMonth,
  onToday,
  onBulkTargetChange,
  onReplaceExistingChange,
  onApply,
  onClear,
}) {
  return (
    <div className="space-y-4 pt-4 border-t border-dashed border-gold/20">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-2 rounded-lg border border-light text-secondary hover:text-gold hover:border-gold/30 transition-all shrink-0"
            aria-label="Previous month"
          >
            <ChevronLeft />
          </button>
          <span className="font-heading text-base sm:text-lg text-primary text-center min-w-[140px] sm:min-w-[160px]">
            {getMonthLabel(viewYear, viewMonth)}
          </span>
          <button
            type="button"
            onClick={onNextMonth}
            className="p-2 rounded-lg border border-light text-secondary hover:text-gold hover:border-gold/30 transition-all shrink-0"
            aria-label="Next month"
          >
            <ChevronRight />
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={onToday}
              className="text-xs px-3 py-1.5 rounded-lg text-gold border border-gold/20 hover:bg-gold/10 transition-colors shrink-0"
            >
              Today
            </button>
          )}
        </div>
        <div className="text-xs text-secondary text-center sm:text-left">
          Pattern fills <span className="text-gold font-medium">{previewCount}</span> days in this month
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-secondary block mb-1.5">Apply to</label>
          <select
            value={bulkTarget}
            onChange={(e) => onBulkTargetChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-input border border-light rounded-xl text-sm text-primary focus:border-gold focus:outline-none"
          >
            <option value="selected">Only {selectedMember.full_name}</option>
            <option value="role">All {ROLE_LABELS[selectedMember.role] || selectedMember.role}s</option>
            <option value="all">Entire team</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-xl border border-light w-full">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => onReplaceExistingChange(e.target.checked)}
              className="rounded border-white/20 bg-transparent text-gold focus:ring-gold/30"
            />
            <span className="text-sm text-primary">Replace existing shifts in range</span>
          </label>
        </div>
      </div>

      {(applyMessage || applyError) && (
        <p className={`text-sm ${applyError ? 'text-red-400' : 'text-green-400'}`}>{applyError || applyMessage}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onApply}
          disabled={applying || previewCount === 0}
          className="w-full sm:flex-1 px-6 py-3 bg-gold text-charcoal rounded-xl text-sm font-medium hover:bg-gold/90 transition-colors shadow-lg shadow-gold/10 disabled:opacity-50"
        >
          {applying ? 'Applying…' : `Apply to ${getMonthLabel(viewYear, viewMonth)}`}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={applying || monthShiftCount === 0}
          className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-medium border border-red-500/30 text-red-400/80 hover:bg-red-500/10 transition-colors disabled:opacity-40"
        >
          Clear month
        </button>
      </div>
    </div>
  );
}
