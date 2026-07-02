import { SALON_HOURS } from '../constants/salonHours.js';

export const PIXELS_PER_MINUTE = 2.5;

/** Default timeline bounds (Mon–Sat). Use getSalonDayBounds(date) for the selected day. */
export const DAY_START_MINUTES = SALON_HOURS.weekday.openMinutes;
export const DAY_END_MINUTES = SALON_HOURS.weekday.closeMinutes;
export const MIN_GHOST_MINUTES = 15;
export const MAX_GHOST_MINUTES = 60;
export const TIMELINE_AXIS_WIDTH = 64;
/** Minimum booking column width — prevents typography collapse when appointments overlap. */
export const MIN_BOOKING_COLUMN_WIDTH = 200;
/** Horizontal gap between overlapping appointment columns. */
export const BOOKING_COLUMN_GAP = 8;

export function getTimelineColumnsWidth(columnCount) {
  const cols = Math.max(1, columnCount);
  return cols * MIN_BOOKING_COLUMN_WIDTH + (cols - 1) * BOOKING_COLUMN_GAP;
}

export function getBookingColumnLeft(columnIndex) {
  return columnIndex * (MIN_BOOKING_COLUMN_WIDTH + BOOKING_COLUMN_GAP);
}

export function minutesFromMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function timeToOffset(startMinutes, dayStartMinutes = DAY_START_MINUTES) {
  return (startMinutes - dayStartMinutes) * PIXELS_PER_MINUTE;
}

export function durationToHeight(durationMinutes) {
  return durationMinutes * PIXELS_PER_MINUTE;
}

export const HOUR_BAND_MINUTES = 60;

/** Vertical center of an hour band on the timeline (px from canvas top). */
export function getHourBandCenterTop(
  hourStartMinutes,
  dayStartMinutes = DAY_START_MINUTES,
  bandDurationMinutes = HOUR_BAND_MINUTES,
) {
  const bandTop = timeToOffset(hourStartMinutes, dayStartMinutes);
  const bandHeight = durationToHeight(bandDurationMinutes);
  return bandTop + bandHeight / 2;
}

/** Top offset that vertically centers an element inside a time band. */
export function centerInTimeBand(bandTop, bandHeight, elementHeight) {
  return bandTop + Math.max(0, (bandHeight - elementHeight) / 2);
}

/**
 * Hour band containing a booking start time.
 * @returns {{ startMinutes: number, durationMinutes: number } | null}
 */
export function getHourBandForStart(
  startMinutes,
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
  bandMinutes = MAX_GHOST_MINUTES,
) {
  for (const band of buildTimelineSlotBands(dayStartMinutes, dayEndMinutes, bandMinutes)) {
    const bandEnd = band.startMinutes + band.durationMinutes;
    if (startMinutes >= band.startMinutes && startMinutes < bandEnd) {
      return band;
    }
  }
  return null;
}

/** Vertically center a booking card inside its hour band (between slot separators). */
export function getBookingCardTopInHourBand(
  startMinutes,
  cardHeight,
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
  bandMinutes = MAX_GHOST_MINUTES,
) {
  const band = getHourBandForStart(startMinutes, dayStartMinutes, dayEndMinutes, bandMinutes);
  if (!band) {
    return timeToOffset(startMinutes, dayStartMinutes);
  }

  const bandTop = timeToOffset(band.startMinutes, dayStartMinutes);
  const bandHeight = durationToHeight(band.durationMinutes);
  return centerInTimeBand(bandTop, bandHeight, cardHeight);
}

export function getCanvasHeight(dayStartMinutes = DAY_START_MINUTES, dayEndMinutes = DAY_END_MINUTES) {
  return (dayEndMinutes - dayStartMinutes) * PIXELS_PER_MINUTE;
}

export function formatTimeLabel(totalMinutes) {
  const { time, period } = formatTimeLabelParts(totalMinutes);
  return `${time} ${period}`;
}

/** Split a time for stacked axis labels: time on one line, AM/PM on the next. */
export function formatTimeLabelParts(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const time = minutes === 0
    ? `${hours12}`
    : `${hours12}:${String(minutes).padStart(2, '0')}`;
  return { time, period };
}

export function formatTimeRange(startMinutes, endMinutes) {
  return `${formatTimeLabel(startMinutes)} - ${formatTimeLabel(endMinutes)}`;
}

export function formatTimeShort(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function getAppointmentTimelineRange(
  startMinutes,
  durationMinutes,
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
) {
  const endMinutes = startMinutes + durationMinutes;
  if (endMinutes <= dayStartMinutes || startMinutes >= dayEndMinutes) return null;

  return {
    startMinutes: Math.max(startMinutes, dayStartMinutes),
    endMinutes: Math.min(endMinutes, dayEndMinutes),
    durationMinutes: Math.min(endMinutes, dayEndMinutes) - Math.max(startMinutes, dayStartMinutes),
  };
}

/**
 * Assign column positions so overlapping appointments render side-by-side.
 * @param {Array} appointments
 * @param {(appointment: unknown) => number} getStartMinutes
 * @param {(appointment: unknown) => number} getDurationMinutes
 */
export function layoutTimelineAppointments(
  appointments,
  getStartMinutes,
  getDurationMinutes,
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
) {
  const items = appointments
    .map((appointment) => {
      const startMinutes = getStartMinutes(appointment);
      const durationMinutes = getDurationMinutes(appointment);
      const range = getAppointmentTimelineRange(startMinutes, durationMinutes, dayStartMinutes, dayEndMinutes);
      if (!range) return null;
      return { appointment, ...range };
    })
    .filter(Boolean)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

  const columnEnds = [];

  for (const item of items) {
    let columnIndex = columnEnds.findIndex((endMinutes) => endMinutes <= item.startMinutes);
    if (columnIndex === -1) {
      columnIndex = columnEnds.length;
      columnEnds.push(item.endMinutes);
    } else {
      columnEnds[columnIndex] = item.endMinutes;
    }
    item.columnIndex = columnIndex;
  }

  for (const item of items) {
    const overlapping = items.filter(
      (other) => other.startMinutes < item.endMinutes && other.endMinutes > item.startMinutes,
    );
    item.columnCount = Math.max(...overlapping.map((other) => other.columnIndex)) + 1;
  }

  return items;
}

/**
 * Hour-aligned bands covering [dayStart, dayEnd), including a shorter final band when close is not on the hour.
 */
export function buildTimelineSlotBands(
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
  slotMinutes = MAX_GHOST_MINUTES,
  minGapMinutes = MIN_GHOST_MINUTES,
) {
  const bands = [];

  for (let slotStart = dayStartMinutes; slotStart < dayEndMinutes; slotStart += slotMinutes) {
    const slotEnd = Math.min(slotStart + slotMinutes, dayEndMinutes);
    const durationMinutes = slotEnd - slotStart;
    if (durationMinutes < minGapMinutes) break;
    bands.push({ startMinutes: slotStart, durationMinutes });
  }

  return bands;
}

/**
 * Hour-aligned bookable slots. Parallel bookings are unlimited — every band stays bookable.
 * @param {Array<{ startMinutes: number, endMinutes: number }>} [_appointments] kept for API compatibility
 */
export function computeGhostSlots(
  _appointments,
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
  minGapMinutes = MIN_GHOST_MINUTES,
  maxGhostMinutes = MAX_GHOST_MINUTES,
) {
  return buildTimelineSlotBands(dayStartMinutes, dayEndMinutes, maxGhostMinutes, minGapMinutes);
}

/**
 * Count appointments overlapping each hour-aligned slot band.
 * @param {Array<{ startMinutes: number, endMinutes: number }>} appointmentRanges
 */
export function computeHourSlotCounts(
  appointmentRanges,
  dayStartMinutes = DAY_START_MINUTES,
  dayEndMinutes = DAY_END_MINUTES,
  slotMinutes = MAX_GHOST_MINUTES,
) {
  return buildTimelineSlotBands(dayStartMinutes, dayEndMinutes, slotMinutes).map(
    ({ startMinutes, durationMinutes }) => {
      const slotEnd = startMinutes + durationMinutes;
      const bookingCount = appointmentRanges.filter(
        (appt) => appt.startMinutes < slotEnd && appt.endMinutes > startMinutes,
      ).length;

      return { startMinutes, durationMinutes, bookingCount };
    },
  );
}

export function getHourSlotCountMap(hourSlotCounts) {
  return Object.fromEntries(hourSlotCounts.map((slot) => [slot.startMinutes, slot.bookingCount]));
}

export function getHourLabels(dayStartMinutes = DAY_START_MINUTES, dayEndMinutes = DAY_END_MINUTES) {
  return buildTimelineSlotBands(dayStartMinutes, dayEndMinutes).map(({ startMinutes, durationMinutes }) => ({
    minutes: startMinutes,
    durationMinutes,
    label: formatTimeLabel(startMinutes),
  }));
}

export function dateAtMinutes(baseDate, totalMinutes) {
  const d = new Date(baseDate);
  d.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return d;
}

export function minutesToDate(baseDate, totalMinutes) {
  return dateAtMinutes(baseDate, totalMinutes);
}

export function dateToMinutes(date) {
  return minutesFromMidnight(date);
}

export function getStaffAccentColor(staffId, palette) {
  if (!staffId || !palette?.length) return palette?.[0] || '#C5A059';
  let hash = 0;
  for (let i = 0; i < staffId.length; i += 1) {
    hash = staffId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function getInitialFromName(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 1).toUpperCase();
}
