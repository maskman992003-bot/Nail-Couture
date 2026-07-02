import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getWeekDates, toDateStr, formatWeekRange, getMonthGrid, getMonthLabel, DAY_LABELS, isToday, addMonths } from '@nail-couture/shared/utils/scheduleUtils.js';
import {
  computeHourSlotCounts,
  getHourSlotCountMap,
  dateToMinutes,
  durationToHeight,
  formatTimeLabel,
  formatTimeLabelParts,
  formatTimeRange,
  formatTimeShort,
  getAppointmentTimelineRange,
  getBookingCardTopInHourBand,
  getCanvasHeight,
  getHourBandCenterTop,
  getHourLabels,
  getInitialFromName,
  layoutTimelineAppointments,
  minutesFromMidnight,
  PIXELS_PER_MINUTE,
  timeToOffset,
  TIMELINE_AXIS_WIDTH,
  getBookingColumnLeft,
  getTimelineColumnsWidth,
  MIN_BOOKING_COLUMN_WIDTH,
  BOOKING_COLUMN_GAP,
} from '@nail-couture/shared/utils/coutureTimeline.js';
import { getSalonDayBounds } from '@nail-couture/shared/constants/salonHours.js';
import {
  cancelBookingCanvasAppointment,
  createBookingCanvasAppointment,
  createBookingCanvasCustomer,
  lookupCustomerByPhone,
  updateBookingCanvasAppointment,
} from '@nail-couture/shared/utils/bookingCanvasData.js';
import ScrollSelect from '../ScrollSelect.jsx';
import ServiceSelection from '../ServiceSelection.jsx';
import AppModal, {
  modalBtnDanger,
  modalBtnPrimary,
  modalBtnSecondary,
  modalInputClass,
  modalTextareaClass,
} from '../AppModal.jsx';
import { useBookingCanvasState } from '../../hooks/useBookingCanvasState.js';
import { useBookingCanvasData } from '../../hooks/useBookingCanvasData.js';
import { ScheduleWeekNav } from '../schedule/CalendarViewToggle.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { supabase } from '../../lib/supabase';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '@nail-couture/shared/utils/appointmentHelpers.js';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DURATION_OPTIONS = [
  { value: '15', label: '15 mins' },
  { value: '30', label: '30 mins' },
  { value: '45', label: '45 mins' },
  { value: '60', label: '60 mins' },
  { value: '90', label: '90 mins' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PERIODS = ['AM', 'PM'];

function formatSelectedDateLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function parseTimeMinutes(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const minuteIndex = Math.round(minutes / 5) % 12;
  return {
    hourIndex: HOURS.indexOf(hours12),
    minuteIndex: minuteIndex >= 0 ? minuteIndex : 0,
    periodIndex: period === 'PM' ? 1 : 0,
  };
}

function buildTimeMinutes(hourIndex, minuteIndex, periodIndex) {
  let hours12 = HOURS[hourIndex] ?? 12;
  const minutes = MINUTES[minuteIndex] ?? 0;
  const period = PERIODS[periodIndex] ?? 'AM';
  if (period === 'PM' && hours12 !== 12) hours12 += 12;
  if (period === 'AM' && hours12 === 12) hours12 = 0;
  return hours12 * 60 + minutes;
}

function TimeWheelPicker({ timeMinutes, onChange }) {
  const parsed = parseTimeMinutes(timeMinutes);

  const setPart = (part, index) => {
    const next = { ...parsed, [part]: index };
    onChange(buildTimeMinutes(next.hourIndex, next.minuteIndex, next.periodIndex));
  };

  const wheelClass =
    'w-full rounded-lg border border-input bg-input py-2 text-center text-sm text-primary focus:border-gold focus:outline-none';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <select
          className={wheelClass}
          value={parsed.hourIndex >= 0 ? parsed.hourIndex : 0}
          onChange={(e) => setPart('hourIndex', Number(e.target.value))}
        >
          {HOURS.map((h, i) => (
            <option key={h} value={i}>{h}</option>
          ))}
        </select>
        <select
          className={wheelClass}
          value={parsed.minuteIndex}
          onChange={(e) => setPart('minuteIndex', Number(e.target.value))}
        >
          {MINUTES.map((m, i) => (
            <option key={m} value={i}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
        <select
          className={wheelClass}
          value={parsed.periodIndex}
          onChange={(e) => setPart('periodIndex', Number(e.target.value))}
        >
          {PERIODS.map((p, i) => (
            <option key={p} value={i}>{p}</option>
          ))}
        </select>
      </div>
      <p className="text-center text-xs text-muted">Selected: {formatTimeShort(timeMinutes)}</p>
    </div>
  );
}

function GlassCard({ children, accentColor, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-card bg-card ${className}`}
      style={{ borderLeftWidth: accentColor ? 3 : 1, borderLeftColor: accentColor || 'var(--border-light)' }}
    >
      {children}
    </div>
  );
}

function BookingCard({ appointment, columnIndex, dayStartMinutes, dayEndMinutes, onPress }) {
  const startMinutes = dateToMinutes(appointment.startAt);
  const range = getAppointmentTimelineRange(
    startMinutes,
    appointment.durationMinutes,
    dayStartMinutes,
    dayEndMinutes,
  );
  if (!range) return null;

  const height = Math.max(durationToHeight(range.durationMinutes), 56);
  const top = getBookingCardTopInHourBand(
    range.startMinutes,
    height,
    dayStartMinutes,
    dayEndMinutes,
  );
  const initial = getInitialFromName(appointment.technicianName).slice(0, 1);
  const left = getBookingColumnLeft(columnIndex);
  const status = appointment.status || 'confirmed';
  const statusLabel = APPOINTMENT_STATUS_LABELS[status];
  const statusColors = APPOINTMENT_STATUS_COLORS[status];
  const showStatusBadge = status === 'checking_in' || status === 'assigned_pending';

  return (
    <button
      type="button"
      onClick={() => onPress?.(appointment)}
      className={`absolute z-20 text-left transition-opacity hover:opacity-90 ${status === 'checking_in' ? 'opacity-90' : ''}`}
      style={{ top, height, left, width: MIN_BOOKING_COLUMN_WIDTH }}
    >
      <GlassCard
        accentColor={appointment.accentColor}
        className={`flex h-full flex-row gap-2 p-3 ${status === 'checking_in' ? 'border-dashed' : ''}`}
      >
        <div className="min-w-0 flex-1">
          {showStatusBadge && statusLabel && statusColors ? (
            <span
              className="mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
            >
              {statusLabel}
            </span>
          ) : null}
          <p className="mb-1 text-[11px] text-muted">
            {formatTimeRange(range.startMinutes, range.endMinutes)}
          </p>
          <p className="truncate text-[15px] font-bold text-primary">{appointment.clientName}</p>
          <p className="truncate text-xs text-secondary">{appointment.serviceName}</p>
          <p className="truncate text-[11px] text-muted">{appointment.technicianName}</p>
        </div>
        <div
          className="flex size-9 shrink-0 items-center justify-center self-center rounded-full border-[1.5px] text-sm font-bold"
          style={{ borderColor: appointment.accentColor, color: appointment.accentColor }}
        >
          {initial}
        </div>
      </GlassCard>
    </button>
  );
}

function formatVisitCount(count) {
  return `${count} ${count === 1 ? 'visit' : 'visits'}`;
}

function TimelineHourBands({ slots, dayStartMinutes }) {
  if (!slots.length) return null;

  return slots.map((slot, index) => (
    <div
      key={`hour-band-${slot.startMinutes}`}
      className={`pointer-events-none absolute inset-x-0 z-0 ${
        index % 2 === 0 ? 'booking-timeline-hour-band--even' : 'booking-timeline-hour-band--odd'
      }`}
      style={{
        top: timeToOffset(slot.startMinutes, dayStartMinutes),
        height: durationToHeight(slot.durationMinutes),
      }}
    />
  ));
}

function HourSlotSeparators({ slots, dayStartMinutes }) {
  if (slots.length < 2) return null;

  return slots.slice(1).map((slot) => {
    const hourIndex = Math.round((slot.startMinutes - dayStartMinutes) / 60);
    const isAccent = hourIndex % 2 === 1;

    return (
      <div
        key={`slot-sep-${slot.startMinutes}`}
        className={`pointer-events-none absolute inset-x-0 z-[5] booking-timeline-hour-line${
          isAccent ? ' booking-timeline-hour-line--accent' : ''
        }`}
        style={{ top: timeToOffset(slot.startMinutes, dayStartMinutes) }}
      />
    );
  });
}

function ColumnSeparators({ columnCount, canvasHeight }) {
  if (columnCount < 2) return null;

  return Array.from({ length: columnCount - 1 }, (_, index) => (
    <div
      key={`col-sep-${index}`}
      className="booking-timeline-column-line pointer-events-none absolute top-0 z-[4] w-px"
      style={{
        left: getBookingColumnLeft(index + 1) - BOOKING_COLUMN_GAP / 2,
        height: canvasHeight,
      }}
    />
  ));
}

function StaffFilterPill({ staff, selectedStaffId, onSelectStaff }) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    selectedStaffId === null
      ? 'All Staff'
      : staff.find((s) => s.id === selectedStaffId)?.fullName || 'All Staff';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-light bg-input px-3.5 py-2 text-xs font-medium text-primary"
      >
        {selectedLabel}
        <svg className="size-3.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close filter" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-light bg-secondary shadow-xl">
            <button
              type="button"
              className={`block w-full px-4 py-2.5 text-left text-sm ${selectedStaffId === null ? 'bg-gold/10 text-gold' : 'text-primary hover:bg-input'}`}
              onClick={() => { onSelectStaff(null); setOpen(false); }}
            >
              All Staff
            </button>
            {staff.map((member) => (
              <button
                key={member.id}
                type="button"
                className={`block w-full px-4 py-2.5 text-left text-sm ${selectedStaffId === member.id ? 'bg-gold/10 text-gold' : 'text-primary hover:bg-input'}`}
                onClick={() => { onSelectStaff(member.id); setOpen(false); }}
              >
                {member.fullName}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function WeekStripNavButton({ onClick, direction = 'prev', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full border border-light bg-input text-secondary transition-colors hover:text-gold ${className}`}
      aria-label={direction === 'prev' ? 'Previous week' : 'Next week'}
    >
      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {direction === 'prev' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        )}
      </svg>
    </button>
  );
}

function WeekDateStrip({ selectedDate, onSelectDate, onPrevWeek, onNextWeek, onToday }) {
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const selectedStr = toDateStr(selectedDate);
  const weekLabel = formatWeekRange(weekDates);

  return (
    <div className="space-y-2 px-4 pb-1">
      <div className="flex items-center gap-1.5 xl:gap-2">
        <WeekStripNavButton onClick={onPrevWeek} className="xl:hidden" />
        <div className="flex min-w-0 flex-1 gap-2.5 overflow-x-auto scrollbar-none">
          {weekDates.map((dateObj) => {
            const dateStr = toDateStr(dateObj);
            const isSelected = dateStr === selectedStr;
            const isTodayDate = isToday(dateStr);
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onSelectDate(dateObj)}
                className={`flex h-[60px] w-12 shrink-0 flex-col items-center justify-center rounded-xl transition-all ${
                  isSelected
                    ? 'border border-transparent bg-gradient-to-br from-gold/20 to-gold/5 ring-1 ring-gold/60'
                    : 'border border-transparent text-secondary hover:text-primary'
                }`}
              >
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-gold' : ''}`}>
                  {DAY_LETTERS[dateObj.getDay()]}
                </span>
                <span className={`text-lg font-bold ${isSelected ? 'text-primary' : ''}`}>
                  {dateObj.getDate()}
                </span>
                {isTodayDate && !isSelected ? (
                  <span className="mt-0.5 size-1 rounded-full bg-gold" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
        <WeekStripNavButton onClick={onNextWeek} direction="next" className="xl:hidden" />
        <div className="hidden shrink-0 xl:block">
          <ScheduleWeekNav
            label={weekLabel}
            onPrev={onPrevWeek}
            onNext={onNextWeek}
            onToday={onToday}
            stacked
            compact
          />
        </div>
      </div>
      <div className="flex items-center justify-end xl:hidden">
        <ScheduleWeekNav
          label={weekLabel}
          onToday={onToday}
          showArrows={false}
          compact
        />
      </div>
    </div>
  );
}

const fieldTriggerClass =
  'w-full rounded-lg border border-input bg-input px-3 py-2 text-left text-sm text-primary flex items-center justify-between transition-colors hover:border-gold focus:border-gold focus:outline-none';

function MonthDatePickerGrid({ viewDate, setViewDate, selectedDate, onSelectDate, onClose }) {
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const cells = getMonthGrid(viewYear, viewMonth);
  const paddedCells = [...cells];
  while (paddedCells.length < 42) paddedCells.push(null);
  const selectedStr = toDateStr(selectedDate);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewDate(addMonths(viewDate, -1))}
          className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-input hover:text-gold"
          aria-label="Previous month"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-primary">{getMonthLabel(viewYear, viewMonth)}</span>
        <button
          type="button"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-input hover:text-gold"
          aria-label="Next month"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 grid-rows-[auto_repeat(6,2.25rem)] gap-0.5">
        {DAY_LABELS.map((day) => (
          <div key={day} className="flex items-center justify-center text-[10px] font-medium text-muted">
            {day}
          </div>
        ))}
        {paddedCells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} aria-hidden />;
          }
          const dateStr = toDateStr(cell);
          const isSelected = dateStr === selectedStr;
          const isTodayDate = isToday(dateStr);
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => {
                onSelectDate(cell);
                onClose?.();
              }}
              className={`flex size-full items-center justify-center rounded-lg text-sm transition-colors ${
                isSelected
                  ? 'bg-gold font-semibold text-charcoal'
                  : isTodayDate
                    ? 'font-semibold text-gold ring-1 ring-gold/40 hover:bg-gold/10'
                    : 'text-primary hover:bg-input'
              }`}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>
    </>
  );
}

function MonthDatePickerModal({ open, onClose, selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(selectedDate);

  useEffect(() => {
    if (open) setViewDate(selectedDate);
  }, [open, selectedDate]);

  return (
    <AppModal open={open} onClose={onClose} title="Select Date" maxWidth="max-w-sm" zIndex="z-[250]" centered>
      <MonthDatePickerGrid
        viewDate={viewDate}
        setViewDate={setViewDate}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onClose={onClose}
      />
    </AppModal>
  );
}

function MonthDatePicker({ open, onClose, selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(selectedDate);

  useEffect(() => {
    if (open) setViewDate(selectedDate);
  }, [open, selectedDate]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="fixed inset-0 z-40" aria-label="Close calendar" onClick={onClose} />
      <div className="absolute left-4 z-50 mt-1 w-[min(100vw-2rem,300px)] overflow-hidden rounded-xl border border-light bg-secondary p-3 shadow-xl">
        <MonthDatePickerGrid
          viewDate={viewDate}
          setViewDate={setViewDate}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          onClose={onClose}
        />
      </div>
    </>
  );
}

function normalizePhoneDigits(phone) {
  return String(phone ?? '').replace(/\D/g, '').slice(0, 10);
}

function safeTrim(value) {
  return String(value ?? '').trim();
}

function formatPhoneDisplay(phone) {
  const digits = normalizePhoneDigits(phone).slice(-10);
  if (digits.length !== 10) return String(phone ?? '');
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatAppointmentLabel(scheduledAt) {
  return `${scheduledAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${formatTimeShort(dateToMinutes(scheduledAt))}`;
}

function centerScrollOnElement(container, target, { rowHeight = 39, visibleRows = 3 } = {}) {
  if (!container || !target) return;
  const containerHeight = container.clientHeight || rowHeight * visibleRows;
  const targetTop = target.offsetTop;
  const targetHeight = target.offsetHeight || rowHeight;
  const middleOffset = containerHeight / 2 - targetHeight / 2;
  const scrollTop = targetTop - middleOffset;
  container.scrollTop = Math.max(0, Math.min(scrollTop, container.scrollHeight - containerHeight));
}

function CustomerAppointmentScrollList({ customer, onSelect }) {
  const scrollRef = useRef(null);
  const firstUpcomingRef = useRef(null);
  const rowClass = 'block h-[2.4375rem] w-full border-b border-light px-3 py-2.5 text-left last:border-b-0 hover:bg-input';
  const appointments = customer.appointments ?? [];

  const firstUpcomingIndex = appointments.findIndex((appointment) => !appointment.isPast);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const frame = requestAnimationFrame(() => {
      const anchor = firstUpcomingRef.current
        || (firstUpcomingIndex < 0 && container.lastElementChild);
      centerScrollOnElement(container, anchor);
    });

    return () => cancelAnimationFrame(frame);
  }, [appointments, firstUpcomingIndex]);

  if (!appointments.length) return null;

  return (
    <div ref={scrollRef} className="theme-scrollbar max-h-[7.3125rem] overflow-y-auto bg-card">
      {appointments.map((appointment, index) => (
        <button
          key={appointment.appointmentId}
          ref={index === firstUpcomingIndex ? firstUpcomingRef : undefined}
          type="button"
          onClick={() => onSelect({
            customerId: customer.id,
            appointmentId: appointment.appointmentId,
            scheduledAt: appointment.scheduledAt,
          })}
          className={rowClass}
        >
          <span
            className={`block text-[11px] ${appointment.isPast ? 'text-muted' : 'text-gold'}`}
          >
            {appointment.isPast ? 'Previous · ' : 'Upcoming · '}
            {formatAppointmentLabel(appointment.scheduledAt)}
          </span>
        </button>
      ))}
    </div>
  );
}

function BookedCustomerSearchModal({ open, onClose, onSelect, searchBookedByPhone }) {
  const [phoneQuery, setPhoneQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setPhoneQuery('');
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const digits = normalizePhoneDigits(phoneQuery);
    if (digits.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchBookedByPhone(digits);
        if (!mountedRef.current) return;
        setResults(Array.isArray(rows) ? rows : []);
      } catch {
        if (!mountedRef.current) return;
        setResults([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }, 250);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [phoneQuery, searchBookedByPhone]);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Find Booked Customer"
      maxWidth="max-w-md"
      centered
      centerTitle
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] text-muted">Phone Number</label>
          <input
            type="tel"
            inputMode="numeric"
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(normalizePhoneDigits(e.target.value))}
            placeholder="Enter phone digits"
            autoFocus
            className={modalInputClass}
          />
        </div>
        {loading ? (
          <p className="text-[11px] text-muted">Searching booked customers…</p>
        ) : null}
        {!loading && normalizePhoneDigits(phoneQuery).length >= 3 && results.length === 0 ? (
          <p className="text-[11px] text-muted">No booked customers match that phone number.</p>
        ) : null}
        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((customer) => (
              <div
                key={customer.id}
                className="overflow-hidden rounded-xl border border-card bg-card"
              >
                <div className="border-b border-light bg-input px-3 py-2.5">
                  <span className="block text-sm font-medium text-primary">{customer.full_name}</span>
                  <span className="block text-[11px] text-muted">{formatPhoneDisplay(customer.phone)}</span>
                </div>
                <CustomerAppointmentScrollList customer={customer} onSelect={onSelect} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}

function BookingBottomSheet({
  open,
  draft,
  staff,
  onClose,
  onChange,
  onConfirm,
  onCancelAppointment,
  submitting,
  searchCustomers,
}) {
  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [phoneLookupError, setPhoneLookupError] = useState('');
  const [isUnregisteredPhone, setIsUnregisteredPhone] = useState(false);
  const [registeringCustomer, setRegisteringCustomer] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(true);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const searchTimerRef = useRef(null);
  const phoneLookupRef = useRef(0);
  const isEditing = Boolean(draft.appointmentId);
  const clientName = safeTrim(draft.clientName);

  useEffect(() => {
    if (!open) {
      setCustomerResults([]);
      setPhoneLookupError('');
      setIsUnregisteredPhone(false);
      setRegisteringCustomer(false);
      setShowCancelConfirm(false);
      setDatePickerOpen(false);
      setTimePickerOpen(true);
      setShowServiceSelection(false);
    }
  }, [open]);

  const runCustomerSearch = useCallback((term) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setCustomerResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const results = await searchCustomers(trimmed);
        setCustomerResults(results);
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 250);
  }, [searchCustomers]);

  const selectCustomer = useCallback((customer) => {
    onChange({
      clientName: customer.full_name || '',
      phone: customer.phone || '',
      customerId: customer.id,
    });
    setCustomerResults([]);
    setPhoneLookupError('');
    setIsUnregisteredPhone(false);
  }, [onChange]);

  const handleClientNameChange = (clientName) => {
    onChange({ clientName, customerId: '' });
    runCustomerSearch(clientName);
  };

  const handlePhoneChange = (phone) => {
    const digits = normalizePhoneDigits(phone);
    const lookupId = phoneLookupRef.current + 1;
    phoneLookupRef.current = lookupId;

    onChange({ phone: digits, customerId: '' });
    setPhoneLookupError('');
    setIsUnregisteredPhone(false);
    if (digits.length < 10) return;

    void (async () => {
      try {
        const customer = await lookupCustomerByPhone(supabase, digits);
        if (phoneLookupRef.current !== lookupId) return;
        if (!customer) {
          setPhoneLookupError('This phone number is not registered.');
          setIsUnregisteredPhone(true);
          return;
        }
        onChange({
          phone: normalizePhoneDigits(customer.phone) || digits,
          clientName: safeTrim(customer.full_name) || clientName,
          customerId: customer.id,
        });
        setCustomerResults([]);
      } catch {
        if (phoneLookupRef.current !== lookupId) return;
        setPhoneLookupError('Could not look up customer.');
      }
    })();
  };

  const handleRegisterCustomer = async () => {
    if (!clientName) return;
    setRegisteringCustomer(true);
    setPhoneLookupError('');
    try {
      const customer = await createBookingCanvasCustomer(supabase, {
        phone: draft.phone,
        fullName: clientName,
      });
      onChange({
        phone: normalizePhoneDigits(customer.phone) || normalizePhoneDigits(draft.phone),
        clientName: safeTrim(customer.full_name) || clientName,
        customerId: customer.id,
      });
      setIsUnregisteredPhone(false);
      setCustomerResults([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not register customer.';
      setPhoneLookupError(message);
    } finally {
      setRegisteringCustomer(false);
    }
  };

  if (!open) return null;

  const selectedServices = draft.selectedServices || [];
  const selectedAddOns = draft.selectedAddOns || [];
  const totalServicePrice =
    selectedServices.reduce((sum, service) => sum + (service.price || 0), 0) +
    selectedAddOns.reduce((sum, addOn) => sum + (addOn.price || 0), 0);

  const serviceSelectionOverlay = showServiceSelection
    ? createPortal(
      <div className="fixed inset-0 z-[260] overflow-y-auto bg-primary">
        <ServiceSelection
          onSelect={({ services: chosenServices, addOns }) => {
            onChange({
              selectedServices: chosenServices || [],
              selectedAddOns: addOns || [],
              serviceId: chosenServices?.[0]?.id || '',
            });
            setShowServiceSelection(false);
          }}
          onBack={() => setShowServiceSelection(false)}
          initialServices={selectedServices}
          initialAddOns={selectedAddOns.map((addOn) => addOn.id)}
        />
      </div>,
      document.body,
    )
    : null;

  return (
    <>
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'var(--modal-overlay)' }}
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[68vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-card bg-card backdrop-blur-xl transition-transform duration-300 ease-out">
        <div className="flex items-center justify-between border-b border-light px-5 py-4">
          <h2 className="font-heading text-2xl text-primary">{isEditing ? 'Edit Appointment' : 'New Appointment'}</h2>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary" aria-label="Close">
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="mb-1 block text-[11px] text-muted">Date</p>
              <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                className={fieldTriggerClass}
                aria-haspopup="dialog"
                aria-expanded={datePickerOpen}
              >
                <span className="truncate">{formatSelectedDateLabel(draft.date)}</span>
                <svg className="size-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div>
              <p className="mb-1 block text-[11px] text-muted">Time</p>
              <button
                type="button"
                onClick={() => setTimePickerOpen((prev) => !prev)}
                className={fieldTriggerClass}
                aria-expanded={timePickerOpen}
              >
                <span>{formatTimeShort(draft.timeMinutes)}</span>
                <svg
                  className={`size-3.5 shrink-0 text-muted transition-transform ${timePickerOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div>
              <p className="mb-1 block text-[11px] text-muted">Duration</p>
              <ScrollSelect
                options={DURATION_OPTIONS}
                value={String(draft.durationMinutes)}
                onChange={(v) => onChange({ durationMinutes: Number(v) })}
                placeholder="Duration"
              />
            </div>
          </div>

          {timePickerOpen ? (
            <TimeWheelPicker timeMinutes={draft.timeMinutes} onChange={(timeMinutes) => onChange({ timeMinutes })} />
          ) : null}

          <MonthDatePickerModal
            open={datePickerOpen}
            onClose={() => setDatePickerOpen(false)}
            selectedDate={draft.date}
            onSelectDate={(date) => onChange({ date })}
          />

          <div>
            <label className="mb-1 block text-[11px] text-muted">Phone</label>
            <input
              type="tel"
              inputMode="numeric"
              value={normalizePhoneDigits(draft.phone)}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(555) 000-0000"
              maxLength={10}
              className={modalInputClass}
            />
            {phoneLookupError ? (
              <div className="mt-1 space-y-1">
                <p className="text-[11px] text-red-400">{phoneLookupError}</p>
                {isUnregisteredPhone ? (
                  <button
                    type="button"
                    onClick={handleRegisterCustomer}
                    disabled={registeringCustomer || !clientName}
                    className="text-left text-[11px] text-gold-strong underline hover:text-gold disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                  >
                    {registeringCustomer
                      ? 'Creating customer account…'
                      : clientName
                        ? `Register ${clientName} as a new customer`
                        : 'Enter client name below to register as a new customer'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-muted">Client Name</label>
            <input
              type="text"
              value={draft.clientName}
              onChange={(e) => handleClientNameChange(e.target.value)}
              placeholder="Search customer by name"
              className={modalInputClass}
            />
            {customerSearchLoading ? (
              <p className="mt-1 text-[11px] text-muted">Searching customers…</p>
            ) : null}
            {customerResults.length > 0 ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-light bg-secondary">
                {customerResults.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer)}
                    className="block w-full border-b border-light px-3 py-2.5 text-left last:border-b-0 hover:bg-input"
                  >
                    <span className="block text-sm text-primary">{customer.full_name}</span>
                    {customer.phone ? (
                      <span className="block text-[11px] text-muted">{customer.phone}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-muted">Services</label>
            <button
              type="button"
              onClick={() => setShowServiceSelection(true)}
              className="w-full rounded-xl border border-theme py-3 text-gold-strong transition-all hover:bg-card"
            >
              {selectedServices.length > 0 ? 'Change Services' : 'Select Services'}
            </button>
            {selectedServices.length > 0 ? (
              <div className="mt-3 rounded-xl border border-theme bg-secondary p-4 text-left">
                <p className="mb-2 text-sm text-secondary">Selected:</p>
                <div className="space-y-1">
                  {selectedServices.map((service) => (
                    <p key={service.id} className="font-heading text-base text-primary">
                      {service.name} — ${service.price}
                    </p>
                  ))}
                  {selectedAddOns.map((addOn) => (
                    <p key={addOn.id} className="font-heading text-base text-primary">
                      {addOn.name} — ${addOn.price}
                    </p>
                  ))}
                </div>
                <div className="mt-2 font-heading text-2xl text-gold">${totalServicePrice.toFixed(2)}</div>
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-1 block text-[11px] uppercase tracking-wide text-muted">Staff Assignment</p>
            <p className="mb-3 text-xs text-muted">Select Staff Member</p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {staff.map((member) => {
                const selected = draft.technicianId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onChange({ technicianId: member.id })}
                    className="flex shrink-0 flex-col items-center gap-1.5"
                  >
                    <span className="relative">
                      <span
                        className={`flex size-12 items-center justify-center rounded-full text-base font-bold text-charcoal ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-[var(--bg-primary)]' : ''}`}
                        style={{ backgroundColor: member.accentColor, boxShadow: selected ? `0 0 12px ${member.accentColor}88` : undefined }}
                      >
                        {member.initial}
                      </span>
                      {selected ? (
                        <span
                          className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full border-2 border-primary text-[10px] text-charcoal"
                          style={{ backgroundColor: member.accentColor }}
                        >
                          ✓
                        </span>
                      ) : null}
                    </span>
                    <span className={`max-w-[56px] truncate text-[10px] ${selected ? 'text-primary' : 'text-muted'}`}>
                      {member.fullName.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-muted">Notes</label>
            <textarea
              value={draft.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Optional notes"
              rows={3}
              className={modalTextareaClass}
            />
          </div>

          <button
            type="button"
            disabled={
              submitting
              || registeringCustomer
              || !clientName
              || !draft.customerId
              || !selectedServices.length
            }
            onClick={onConfirm}
            className={modalBtnPrimary}
          >
            {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Confirm Booking'}
          </button>

          {isEditing ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowCancelConfirm(true)}
              className="w-full rounded-xl border border-red-400/40 py-3 text-sm font-medium text-red-400 hover:bg-red-400/10 disabled:opacity-50"
            >
              Cancel Appointment
            </button>
          ) : null}
        </div>
      </div>

      <AppModal
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel Appointment"
        maxWidth="max-w-md"
        zIndex="z-[210]"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              className={modalBtnSecondary}
            >
              Keep
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onCancelAppointment}
              className={modalBtnDanger}
            >
              {submitting ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
          </>
        }
      >
        <p className="text-secondary text-sm">
          Cancel this appointment for {draft.clientName}?
        </p>
      </AppModal>
    </div>
    {serviceSelectionOverlay}
    </>
  );
}

function ProportionalTimeline({ selectedDate, appointments, onHourSlotPress, onAppointmentPress }) {
  const scrollRef = useRef(null);
  const hasAutoScrolledRef = useRef(false);

  const { dayStartMinutes, dayEndMinutes } = useMemo(
    () => getSalonDayBounds(selectedDate),
    [selectedDate],
  );

  const canvasHeight = getCanvasHeight(dayStartMinutes, dayEndMinutes);
  const hourLabels = getHourLabels(dayStartMinutes, dayEndMinutes);

  const appointmentRanges = useMemo(() => (
    appointments
      .map((a) => {
        const start = dateToMinutes(a.startAt);
        return getAppointmentTimelineRange(
          start,
          a.durationMinutes,
          dayStartMinutes,
          dayEndMinutes,
        );
      })
      .filter(Boolean)
  ), [appointments, dayStartMinutes, dayEndMinutes]);

  const laidOutAppointments = useMemo(
    () => layoutTimelineAppointments(
      appointments,
      (a) => dateToMinutes(a.startAt),
      (a) => a.durationMinutes,
      dayStartMinutes,
      dayEndMinutes,
    ),
    [appointments, dayStartMinutes, dayEndMinutes],
  );

  const hourSlotCounts = useMemo(
    () => computeHourSlotCounts(appointmentRanges, dayStartMinutes, dayEndMinutes),
    [appointmentRanges, dayStartMinutes, dayEndMinutes],
  );

  const slotCountByStart = useMemo(
    () => getHourSlotCountMap(hourSlotCounts),
    [hourSlotCounts],
  );

  const appointmentColumns = useMemo(
    () => (laidOutAppointments.length
      ? Math.max(...laidOutAppointments.map((item) => item.columnCount))
      : 1),
    [laidOutAppointments],
  );
  const columnsWidth = getTimelineColumnsWidth(appointmentColumns);

  const isToday = toDateStr(selectedDate) === toDateStr(new Date());
  const nowMinutes = minutesFromMidnight(new Date());
  const nowTop = timeToOffset(nowMinutes, dayStartMinutes);
  const closeTimeLabel = formatTimeLabelParts(dayEndMinutes);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [selectedDate]);

  useEffect(() => {
    if (!isToday || !scrollRef.current || hasAutoScrolledRef.current) return;
    const offset = (nowMinutes - dayStartMinutes) * PIXELS_PER_MINUTE - 120;
    if (offset > 0) {
      scrollRef.current.scrollTo({ top: Math.max(0, offset), behavior: 'auto' });
      hasAutoScrolledRef.current = true;
    }
  }, [isToday, nowMinutes, dayStartMinutes]);

  return (
    <div ref={scrollRef} className="booking-timeline-scroll min-h-0 flex-1 overflow-y-auto pb-8">
      <div className="flex" style={{ minHeight: canvasHeight + 40 }}>
        <div
          className="booking-timeline-axis sticky left-0 z-30 shrink-0 self-start bg-primary pr-1"
          style={{ width: TIMELINE_AXIS_WIDTH, minHeight: canvasHeight + 40 }}
        >
          <TimelineHourBands slots={hourSlotCounts} dayStartMinutes={dayStartMinutes} />
          <HourSlotSeparators slots={hourSlotCounts} dayStartMinutes={dayStartMinutes} />
          {hourLabels.map(({ minutes, durationMinutes, label }) => {
            const bookingCount = slotCountByStart[minutes] ?? 0;
            return (
              <button
                key={minutes}
                type="button"
                onClick={() => onHourSlotPress(minutes, durationMinutes)}
                className="absolute right-1 flex -translate-y-1/2 cursor-pointer flex-col items-end gap-0.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-input/80 active:bg-input"
                style={{ top: getHourBandCenterTop(minutes, dayStartMinutes, durationMinutes) }}
                aria-label={`New appointment at ${label}`}
              >
                <span className="text-[10px] font-medium text-muted">{label}</span>
                {bookingCount > 0 ? (
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-semibold tabular-nums text-gold">
                    {formatVisitCount(bookingCount)}
                  </span>
                ) : null}
              </button>
            );
          })}
          <div
            className="absolute right-1 flex -translate-y-1/2 flex-col items-end gap-0.5 text-[9px] font-medium text-muted/50"
            style={{ top: timeToOffset(dayEndMinutes, dayStartMinutes) }}
          >
            <span>Closes</span>
            <span className="tabular-nums">{closeTimeLabel.time}</span>
            <span>{closeTimeLabel.period}</span>
          </div>
        </div>
        <div className="booking-timeline-columns min-w-0 flex-1 overflow-x-auto overscroll-x-contain px-2 scrollbar-none">
          <div className="relative" style={{ width: columnsWidth, height: canvasHeight }}>
            <TimelineHourBands slots={hourSlotCounts} dayStartMinutes={dayStartMinutes} />
            <HourSlotSeparators slots={hourSlotCounts} dayStartMinutes={dayStartMinutes} />
            <ColumnSeparators columnCount={appointmentColumns} canvasHeight={canvasHeight} />
            {isToday && nowMinutes >= dayStartMinutes && nowMinutes <= dayEndMinutes ? (
              <div className="pointer-events-none absolute left-0 right-0 z-10 flex items-center" style={{ top: nowTop }}>
                <span className="mr-1 rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold text-charcoal">
                  {formatTimeLabel(nowMinutes)}
                </span>
                <div className="h-0.5 flex-1 bg-gold/85" />
              </div>
            ) : null}
            {laidOutAppointments.map((item) => (
              <BookingCard
                key={item.appointment.id}
                appointment={item.appointment}
                columnIndex={item.columnIndex}
                dayStartMinutes={dayStartMinutes}
                dayEndMinutes={dayEndMinutes}
                onPress={onAppointmentPress}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingCanvas({ onConfirmBooking }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingAppointmentId, setPendingAppointmentId] = useState(null);

  const {
    staff,
    appointments,
    loading,
    error,
    refresh,
    searchCustomers,
    searchBookedByPhone,
  } = useBookingCanvasData(viewDate);

  const handleConfirm = useCallback(
    async (payload) => {
      if (onConfirmBooking) {
        await onConfirmBooking(payload);
        await refresh();
        return;
      }

      if (payload.appointmentId) {
        await updateBookingCanvasAppointment(supabase, {
          callerPhone: user?.phone,
          appointmentId: payload.appointmentId,
          serviceId: payload.serviceId,
          technicianId: payload.technicianId,
          scheduledAt: payload.scheduledAt.toISOString(),
          notes: payload.notes,
          selectedServices: payload.selectedServices || [],
          selectedAddOns: payload.selectedAddOns || [],
        });
        await refresh();
        return;
      }

      let customerId = payload.customerId;
      if (!customerId && payload.phone) {
        const customer = await lookupCustomerByPhone(supabase, payload.phone);
        if (!customer) throw new Error('Customer phone is not registered.');
        customerId = customer.id;
      }
      if (!customerId) throw new Error('Please select a registered customer.');

      await createBookingCanvasAppointment(supabase, {
        customerId,
        serviceId: payload.serviceId,
        technicianId: payload.technicianId,
        scheduledAt: payload.scheduledAt.toISOString(),
        notes: payload.notes,
        selectedServices: payload.selectedServices || [],
        selectedAddOns: payload.selectedAddOns || [],
      });
      await refresh();
    },
    [onConfirmBooking, refresh, user?.phone],
  );

  const handleCancel = useCallback(
    async (appointmentId) => {
      await cancelBookingCanvasAppointment(supabase, user?.phone, appointmentId);
      await refresh();
    },
    [refresh, user?.phone],
  );

  const {
    selectedDate,
    setSelectedDate,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    selectedStaffId,
    setSelectedStaffId,
    filteredAppointments,
    sheetOpen,
    draft,
    submitting,
    openSheetFromHourSlot,
    openSheetFromFab,
    openSheetForEdit,
    updateDraft,
    closeSheet,
    confirmBooking,
    cancelBooking,
  } = useBookingCanvasState({
    initialDate: new Date(),
    appointments,
    staff,
    onConfirmBooking: handleConfirm,
    onCancelBooking: handleCancel,
  });

  useEffect(() => {
    setViewDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!pendingAppointmentId) return;
    const appointment = appointments.find((row) => row.id === pendingAppointmentId);
    if (appointment) {
      openSheetForEdit(appointment);
      setPendingAppointmentId(null);
    }
  }, [appointments, pendingAppointmentId, openSheetForEdit]);

  const handleBookedCustomerSelect = useCallback((result) => {
    setSearchOpen(false);
    setSelectedDate(new Date(result.scheduledAt));
    setPendingAppointmentId(result.appointmentId);
  }, [setSelectedDate]);

  if (loading && staff.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary pl-sidebar text-primary">
        <p className="animate-pulse text-gold">Loading schedule…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-primary text-primary transition-all duration-300 pl-sidebar">
      <style>{`.booking-canvas select, .booking-canvas option { background: var(--input-bg); color: var(--text-primary); } .booking-canvas input[type="tel"], .booking-canvas input[type="text"], .booking-canvas textarea { color-scheme: ${theme}; }`}</style>
      <div className="booking-canvas mobile-page flex min-h-[100dvh] flex-col lg:h-screen lg:max-h-screen">
        <header className="shrink-0 pb-2 pt-2 lg:pt-4">
          <div className="mb-3 flex items-center justify-between px-4">
            <h1 className="font-heading text-2xl tracking-wide text-gold lg:text-3xl">Nail Couture</h1>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex size-10 items-center justify-center rounded-full border border-light bg-input text-secondary hover:text-primary"
              aria-label="Search booked customers by phone"
            >
              <svg className="size-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <WeekDateStrip
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevWeek={goToPrevWeek}
            onNextWeek={goToNextWeek}
            onToday={goToToday}
          />
          <div className="relative mt-2 flex items-center justify-between px-4">
            <button
              type="button"
              onClick={() => setMonthPickerOpen((open) => !open)}
              className="flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary"
              aria-expanded={monthPickerOpen}
              aria-haspopup="dialog"
            >
              {formatSelectedDateLabel(selectedDate)}
              <svg className={`size-3.5 transition-transform ${monthPickerOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <MonthDatePicker
              open={monthPickerOpen}
              onClose={() => setMonthPickerOpen(false)}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            <StaffFilterPill staff={staff} selectedStaffId={selectedStaffId} onSelectStaff={setSelectedStaffId} />
          </div>
          {error && !loading ? (
            <div className="flex items-center justify-between gap-3 px-4 pt-1">
              <p className="text-xs text-red-400">{error}</p>
              <button
                type="button"
                onClick={refresh}
                className="shrink-0 text-xs text-gold hover:text-gold/80"
              >
                Retry
              </button>
            </div>
          ) : null}
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <ProportionalTimeline
            selectedDate={selectedDate}
            appointments={filteredAppointments}
            onHourSlotPress={openSheetFromHourSlot}
            onAppointmentPress={openSheetForEdit}
          />

          <button
            type="button"
            onClick={openSheetFromFab}
            className="fixed right-6 z-[100] flex size-14 items-center justify-center rounded-full bg-gold text-2xl font-light text-charcoal transition-colors hover:bg-gold/90 hover:scale-105 bottom-[max(5.75rem,calc(5rem+env(safe-area-inset-bottom)))] lg:absolute lg:bottom-8 lg:right-8"
            aria-label="New booking"
          >
            +
          </button>
        </div>

        <BookingBottomSheet
          open={sheetOpen}
          draft={draft}
          staff={staff}
          onClose={closeSheet}
          onChange={updateDraft}
          onConfirm={confirmBooking}
          onCancelAppointment={cancelBooking}
          submitting={submitting}
          searchCustomers={searchCustomers}
        />

        <BookedCustomerSearchModal
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelect={handleBookedCustomerSelect}
          searchBookedByPhone={searchBookedByPhone}
        />
      </div>
    </div>
  );
}
