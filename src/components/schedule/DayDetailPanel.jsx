import {
  DAY_LABELS_FULL,
  SHIFT_TYPES,
} from '../../utils/scheduleUtils';
import useFocusTrap from '../../hooks/useFocusTrap';
import ShiftChip from './ShiftChip';
import {
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS,
  appointmentStatusBadgeClass,
} from './constants';

function formatDayHeader(selectedDay) {
  const date = selectedDay instanceof Date
    ? selectedDay
    : new Date(`${selectedDay}T12:00:00`);
  return {
    dayLabel: DAY_LABELS_FULL[date.getDay()],
    dateLabel: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

function AppointmentsSection({ appointments, loading, mode }) {
  const isRead = mode === 'read';

  return (
    <div className={isRead ? '' : 'pt-3 border-t border-light'}>
      <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">
        {isRead ? `Appointments (${appointments.length})` : `${appointments.length} appointment${appointments.length !== 1 ? 's' : ''}`}
      </p>
      {loading ? (
        <p className="text-sm text-secondary animate-pulse">Loading appointments…</p>
      ) : appointments.length === 0 ? (
        <p className="text-sm text-secondary italic">
          {isRead ? 'No appointments on this day' : 'No appointments'}
        </p>
      ) : (
        <div className={isRead ? 'space-y-3' : 'space-y-2'}>
          {appointments.map((appt) => {
            const key = appt.id ?? appt.appointment_id;
            if (isRead) {
              return (
                <div key={key} className="p-4 rounded-xl bg-secondary border border-light flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-base text-primary">{appt.customer_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${appointmentStatusBadgeClass(appt.status)}`}>
                      {APPOINTMENT_STATUS_LABELS[appt.status] || appt.status}
                    </span>
                  </div>
                  <div className="text-xs text-secondary">{appt.service_name}</div>
                  <div className="text-xs text-gold">
                    {new Date(appt.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              );
            }
            return (
              <div key={key} className="rounded-lg bg-white/[0.03] border border-light p-2.5">
                <div className="text-sm text-primary font-medium truncate">{appt.customer_name}</div>
                <div className="text-[10px] text-secondary truncate">{appt.service_name}</div>
                <div className="text-[10px] text-gold mt-1">
                  {new Date(appt.appointment_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DayDetailContent({
  mode,
  selectedDay,
  shifts,
  appointments,
  appointmentsLoading,
  onClose,
  onDeleteShift,
  onAddShift,
  onOpenCustomModal,
}) {
  const { dayLabel, dateLabel } = formatDayHeader(selectedDay);
  const isRead = mode === 'read';
  const dateStr = selectedDay instanceof Date
    ? selectedDay.toISOString().split('T')[0]
    : selectedDay;

  return (
    <>
      <div className={`flex items-start justify-between gap-2 shrink-0 ${isRead ? 'p-4 sm:p-6 border-b border-light' : 'p-4 border-b border-light'}`}>
        <div className="min-w-0">
          <h3 className={`font-heading text-gold truncate ${isRead ? 'text-lg' : ''}`}>{dayLabel}{isRead ? ' Details' : ''}</h3>
          <p className="text-xs text-secondary mt-0.5">{dateLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors shrink-0"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto min-h-0 ${isRead ? 'p-4 sm:p-6 space-y-5' : 'p-4 space-y-3'}`}>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">Shifts</p>
          {shifts.length === 0 ? (
            <p className="text-sm text-secondary italic text-center py-4">
              {isRead ? 'No shift scheduled' : 'No shifts scheduled'}
            </p>
          ) : (
            <div className={isRead ? 'space-y-2' : 'space-y-2'}>
              {shifts.map((shift) => (
                <ShiftChip
                  key={shift.id}
                  shift={shift}
                  size={isRead ? 'md' : 'md'}
                  onDelete={isRead ? undefined : onDeleteShift}
                />
              ))}
            </div>
          )}
        </div>

        {!isRead && (
          <div className="pt-2 border-t border-light">
            <p className="text-[10px] uppercase tracking-widest text-secondary mb-2">Quick add</p>
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-1.5 mb-3">
              {SHIFT_TYPES.filter((t) => t.value !== 'custom').map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onAddShift(dateStr, t.value)}
                  className="px-2 py-2.5 rounded-lg text-[10px] sm:text-xs font-medium border border-light text-secondary hover:border-gold/30 hover:text-gold transition-all"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenCustomModal}
              className="w-full py-2.5 rounded-lg text-xs font-medium bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors"
            >
              Custom shift
            </button>
          </div>
        )}

        {(isRead || appointmentsLoading || appointments.length > 0) && (
          <AppointmentsSection
            appointments={appointments}
            loading={appointmentsLoading}
            mode={mode}
          />
        )}
      </div>
    </>
  );
}

export default function DayDetailPanel({
  mode = 'read',
  selectedDay,
  shifts = [],
  appointments = [],
  appointmentsLoading = false,
  open = true,
  asModal = false,
  onClose,
  onDeleteShift,
  onAddShift,
  onOpenCustomModal,
}) {
  if (!selectedDay || (!asModal && !open)) return null;
  if (asModal && !open) return null;

  const panelRef = useFocusTrap(asModal && open, onClose);

  const content = (
    <DayDetailContent
      mode={mode}
      selectedDay={selectedDay}
      shifts={shifts}
      appointments={appointments}
      appointmentsLoading={appointmentsLoading}
      onClose={onClose}
      onDeleteShift={onDeleteShift}
      onAddShift={onAddShift}
      onOpenCustomModal={onOpenCustomModal}
    />
  );

  if (asModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-detail-modal-title"
          className="w-full max-w-lg flex flex-col max-h-[min(90dvh,calc(100dvh-2rem))] bg-card rounded-t-2xl sm:rounded-xl overflow-hidden mx-0 sm:mx-4 border border-light shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <span id="day-detail-modal-title" className="sr-only">Day schedule details</span>
          {content}
        </div>
      </div>
    );
  }

  return content;
}

export { APPOINTMENT_STATUS_COLORS };
