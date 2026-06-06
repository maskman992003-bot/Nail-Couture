import ShiftChip from './ShiftChip';
import TimeOffChip from './TimeOffChip';
import { APPOINTMENT_STATUS_COLORS } from './constants';
import { DAY_LABELS, toDateStr } from '@nail-couture/shared/utils/scheduleUtils';

export default function WeekGrid({
  weekDates,
  mode = 'employee',
  shiftsByDate = {},
  selectedStaffId = null,
  timeOffByDate = {},
  appointments = [],
  selectedDay = null,
  onDayClick,
  todayStr,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {weekDates.map((dateObj, idx) => {
        const dateIso = toDateStr(dateObj);
        const isToday = dateIso === todayStr;
        const dayShifts = mode === 'manager' && selectedStaffId
          ? (shiftsByDate[dateIso] || []).filter((s) => s.employee_id === selectedStaffId)
          : (shiftsByDate[dateIso] || []);
        const timeOffStatus = timeOffByDate[dateIso];
        const isTimeOff = Boolean(timeOffStatus);
        const isWorking = dayShifts.length > 0;
        const dayAppts = appointments.filter((a) => a.appointment_time?.split('T')[0] === dateIso);
        const isSelected = selectedDay === dateIso;

        return (
          <button
            key={dateIso}
            type="button"
            onClick={() => onDayClick(dateObj, dateIso)}
            className={`flex flex-col min-h-[140px] md:min-h-[220px] bg-secondary border rounded-xl p-3 text-left transition-all hover:border-gold/30 ${
              isToday ? 'border-gold/40 bg-gold/[0.04]' :
              isSelected ? 'border-gold ring-1 ring-gold/30 bg-gold/[0.04]' :
              'border-light'
            }`}
          >
            <div className="flex items-center justify-between border-b border-light pb-2 mb-2">
              <div className="flex flex-col">
                <span className={`text-[10px] font-bold tracking-widest ${isToday ? 'text-gold' : 'text-secondary'}`}>
                  {DAY_LABELS[dateObj.getDay()]}
                </span>
                <span className={`text-sm font-heading ${isToday ? 'text-gold' : 'text-primary'}`}>
                  {dateObj.getDate()}
                </span>
              </div>
              {mode === 'employee' && (
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isTimeOff
                    ? 'bg-white/10 text-muted border border-white/15'
                    : isWorking
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {isTimeOff ? 'OFF' : isWorking ? 'ON' : 'OFF'}
                </span>
              )}
            </div>

            {isTimeOff && (
              <div className="mb-2">
                <TimeOffChip status={timeOffStatus} />
              </div>
            )}

            {dayShifts.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {dayShifts.map((shift) => (
                  <ShiftChip key={shift.id} shift={shift} size="sm" />
                ))}
              </div>
            )}

            {mode === 'employee' && (
              <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                {dayAppts.slice(0, 3).map((appt) => (
                  <div key={appt.id} className="text-[10px] p-1.5 rounded bg-white/[0.03] border border-light flex flex-col gap-0.5 truncate">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-primary truncate">{appt.customer_name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${APPOINTMENT_STATUS_COLORS[appt.status] || 'bg-gray-400'}`} />
                    </div>
                    <span className="text-gold/80 truncate">{appt.service_name}</span>
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <div className="text-[9px] text-gold/60 text-center font-medium mt-auto pt-1">
                    + {dayAppts.length - 3} more
                  </div>
                )}
                {dayAppts.length === 0 && isWorking && !isTimeOff && (
                  <div className="text-[10px] text-muted italic my-auto text-center">No assignments</div>
                )}
              </div>
            )}

            {mode === 'manager' && dayShifts.length === 0 && !isTimeOff && (
              <div className="text-[10px] text-muted italic my-auto text-center">No shifts</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
