import {
  DAY_LABELS,
  SHIFT_TYPES,
  SHIFT_COLORS,
  SHIFT_DOT,
  toDateStr,
  isToday,
  shiftConfig,
} from '@nail-couture/shared/utils/scheduleUtils';
import TimeOffChip from './TimeOffChip';

function CellShiftChip({ shift, ghost = false }) {
  const typeCfg = shiftConfig(shift.shift_type);
  const colorClass = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.custom;

  return (
    <span
      className={`block truncate text-[7px] sm:text-[8px] leading-tight px-0.5 sm:px-1 py-0.5 rounded border font-semibold ${
        ghost
          ? 'opacity-40 border-dashed border-gold/40 text-gold/70 bg-gold/[0.06]'
          : colorClass
      }`}
    >
      {typeCfg.short}
    </span>
  );
}

export default function ScheduleCalendar({
  monthGrid,
  shiftsByDate,
  selectedStaffId,
  selectedDay,
  onDayClick,
  ghostShiftsByDate = {},
  timeOffByDate = {},
  emptyMessage,
}) {
  const hasAnyShifts = monthGrid.some((date) => {
    if (!date) return false;
    const dateStr = toDateStr(date);
    const saved = (shiftsByDate[dateStr] || []).filter((s) => s.employee_id === selectedStaffId);
    const ghost = ghostShiftsByDate[dateStr] || [];
    return saved.length > 0 || ghost.length > 0 || timeOffByDate[dateStr];
  });

  return (
    <div className="rounded-2xl border border-light bg-secondary p-3 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <h3 className="text-sm font-medium text-primary">Month overview</h3>
        {Object.keys(ghostShiftsByDate).length > 0 && (
          <span className="text-[10px] uppercase tracking-wider text-gold/80 border border-dashed border-gold/30 px-2 py-0.5 rounded-full">
            Preview
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted py-1">
            {d.slice(0, 1)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {monthGrid.map((date, idx) => {
          if (!date) {
            return <div key={`pad-${idx}`} className="min-h-[2.75rem] sm:min-h-0 sm:aspect-square" />;
          }

          const dateStr = toDateStr(date);
          const dayShifts = (shiftsByDate[dateStr] || []).filter((s) => s.employee_id === selectedStaffId);
          const ghostShifts = ghostShiftsByDate[dateStr] || [];
          const timeOffStatus = timeOffByDate[dateStr];
          const today = isToday(dateStr);
          const hasShift = dayShifts.length > 0 || ghostShifts.length > 0 || timeOffStatus;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDayClick(dateStr)}
              className={`min-h-[2.75rem] sm:aspect-square rounded-md sm:rounded-xl border p-0.5 sm:p-1 flex flex-col items-stretch transition-all ${
                today ? 'border-gold/40 bg-gold/[0.06]' :
                selectedDay === dateStr ? 'border-gold ring-1 ring-gold/30 bg-gold/[0.04]' :
                hasShift ? 'border-light bg-white/[0.02] hover:border-gold/30 active:border-gold/30' :
                'border-light hover:border-white/15 active:border-white/15'
              }`}
            >
              <span className={`text-[10px] sm:text-xs font-medium text-center shrink-0 ${today ? 'text-gold' : 'text-secondary'}`}>
                {date.getDate()}
              </span>
              <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden min-h-0">
                {timeOffStatus && <TimeOffChip status={timeOffStatus} size="sm" />}
                {dayShifts.slice(0, timeOffStatus ? 1 : 2).map((s) => (
                  <CellShiftChip key={s.id} shift={s} />
                ))}
                {ghostShifts.slice(0, Math.max(0, (timeOffStatus ? 1 : 2) - dayShifts.length)).map((g, i) => (
                  <CellShiftChip key={`ghost-${i}`} shift={g} ghost />
                ))}
                {(dayShifts.length + ghostShifts.length + (timeOffStatus ? 1 : 0)) > 2 && (
                  <span className="text-[7px] text-muted text-center">+{dayShifts.length + ghostShifts.length + (timeOffStatus ? 1 : 0) - 2}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!hasAnyShifts && emptyMessage && (
        <p className="text-sm text-secondary text-center py-4 mt-3 border-t border-light">{emptyMessage}</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-light">
        {SHIFT_TYPES.map((t) => (
          <div key={t.value} className="flex items-center gap-1.5 text-[10px] text-secondary">
            <span className={`w-2 h-2 rounded-full ${SHIFT_DOT[t.value]}`} />
            {t.label}
          </div>
        ))}
        {Object.keys(ghostShiftsByDate).length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-secondary">
            <span className="w-2 h-2 rounded-full border border-dashed border-gold/50 opacity-50" />
            Draft preview
          </div>
        )}
        {Object.keys(timeOffByDate).length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-secondary">
            <span className="w-2 h-2 rounded-full bg-white/20" />
            Time off
          </div>
        )}
      </div>
    </div>
  );
}
