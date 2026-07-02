export const SHIFT_TYPES = [
  { value: 'morning', label: 'Morning', short: 'AM', defaultStart: '09:00', defaultEnd: '15:00', color: 'amber' },
  { value: 'afternoon', label: 'Afternoon', short: 'PM', defaultStart: '14:00', defaultEnd: '19:00', color: 'sky' },
  { value: 'evening', label: 'Evening', short: 'EVE', defaultStart: '18:00', defaultEnd: '22:00', color: 'violet' },
  { value: 'custom', label: 'Custom', short: 'CUS', defaultStart: '09:00', defaultEnd: '17:00', color: 'gold' },
];

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ROLE_LABELS = {
  technician: 'Technician',
  cashier: 'Cashier',
  admin: 'Admin',
};

export const SHIFT_COLORS = {
  morning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  afternoon: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  evening: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  custom: 'bg-gold/20 text-gold border-gold/30',
};

export const SHIFT_DOT = {
  morning: 'bg-amber-400',
  afternoon: 'bg-sky-400',
  evening: 'bg-violet-400',
  custom: 'bg-gold',
};

/** Default weekly patterns by role (null = day off) */
export const ROLE_TEMPLATES = {
  technician: [null, 'morning', 'morning', 'morning', 'morning', 'morning', 'morning'],
  cashier: [null, 'afternoon', 'afternoon', 'afternoon', 'afternoon', 'afternoon', 'morning'],
  admin: [null, 'morning', 'morning', 'morning', 'morning', 'morning', null],
};

export const PATTERN_PRESETS = [
  { id: 'weekdays-am', label: 'Mon–Fri · Morning', pattern: [null, 'morning', 'morning', 'morning', 'morning', 'morning', null] },
  { id: 'weekdays-pm', label: 'Mon–Fri · Afternoon', pattern: [null, 'afternoon', 'afternoon', 'afternoon', 'afternoon', 'afternoon', null] },
  { id: 'full-week-am', label: 'Every day · Morning', pattern: ['morning', 'morning', 'morning', 'morning', 'morning', 'morning', 'morning'] },
  { id: 'tue-sat', label: 'Tue–Sat · Morning', pattern: [null, null, 'morning', 'morning', 'morning', 'morning', 'morning'] },
  { id: 'weekends', label: 'Weekends only', pattern: ['morning', null, null, null, null, null, 'morning'] },
];

export function emptyWeekPattern() {
  return Array(7).fill(null);
}

export function patternFromRole(role) {
  const template = ROLE_TEMPLATES[role];
  if (!template) return emptyWeekPattern();
  return [...template];
}

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getMonthRange(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toDateStr(start), end: toDateStr(end), startDate: start, endDate: end };
}

export function getMonthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Calendar grid cells (null = padding outside month) */
export function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

export function shiftConfig(shiftType) {
  return SHIFT_TYPES.find((t) => t.value === shiftType) || SHIFT_TYPES[0];
}

/** Pattern slot: preset string, custom object, or null (off) */
export function normalizeSlot(slot) {
  if (!slot) return null;
  if (typeof slot === 'string') {
    const cfg = shiftConfig(slot);
    return { shift_type: slot, start_time: cfg.defaultStart, end_time: cfg.defaultEnd };
  }
  const cfg = shiftConfig(slot.shift_type);
  return {
    shift_type: slot.shift_type,
    start_time: slot.start_time || cfg.defaultStart,
    end_time: slot.end_time || cfg.defaultEnd,
  };
}

export function getSlotShiftType(slot) {
  if (!slot) return null;
  return typeof slot === 'string' ? slot : slot.shift_type;
}

export function isCustomSlot(slot) {
  return getSlotShiftType(slot) === 'custom';
}

export function createSlot(shiftType, startTime, endTime) {
  if (shiftType === 'custom') {
    const cfg = shiftConfig('custom');
    return {
      shift_type: 'custom',
      start_time: startTime || cfg.defaultStart,
      end_time: endTime || cfg.defaultEnd,
    };
  }
  return shiftType;
}

export function slotColorKey(slot) {
  return getSlotShiftType(slot) || 'custom';
}

/** Expand weekly pattern into concrete shift rows for a date range */
export function expandPatternToShifts(pattern, startDateStr, endDateStr) {
  const start = parseDateStr(startDateStr);
  const end = parseDateStr(endDateStr);
  const rows = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const dayIdx = cursor.getDay();
    const slot = normalizeSlot(pattern[dayIdx]);
    if (slot) {
      rows.push({
        dateStr: toDateStr(cursor),
        dayIdx,
        shift_type: slot.shift_type,
        start_time: slot.start_time,
        end_time: slot.end_time,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}

export function countPatternShifts(pattern, startDateStr, endDateStr) {
  return expandPatternToShifts(pattern, startDateStr, endDateStr).length;
}

export function getInitials(name) {
  return (name || '??').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function isSameMonth(dateStr, year, month) {
  const d = parseDateStr(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
}

export function isToday(dateStr) {
  return dateStr === toDateStr(new Date());
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

export function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Sunday-start week containing `date` */
export function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    dates.push(dt);
  }
  return dates;
}

export function formatWeekRange(dates) {
  const start = dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${start} – ${end}`;
}

/**
 * Map each date in time-off ranges to status for a staff member.
 * Later requests overwrite earlier ones on the same date.
 */
export function buildTimeOffDateMap(requests, { staffId = null, statuses = ['approved', 'pending'] } = {}) {
  const map = {};
  const filtered = requests.filter((r) => {
    if (staffId && r.staff_id !== staffId) return false;
    return statuses.includes(r.status);
  });

  for (const req of filtered) {
    const cursor = parseDateStr(req.start_date);
    const end = parseDateStr(req.end_date);
    while (cursor <= end) {
      map[toDateStr(cursor)] = req.status;
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return map;
}

export function sortTimeOffRequests(requests) {
  return [...requests].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return a.start_date.localeCompare(b.start_date);
  });
}
