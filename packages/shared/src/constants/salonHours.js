/** Salon operating hours — Mon–Sat and Sun (matches public-facing footer). */
export const SALON_HOURS = {
  /** Monday through Saturday (getDay() 1–6) */
  weekday: {
    openMinutes: 9 * 60,
    closeMinutes: 18 * 60 + 30,
  },
  /** Sunday (getDay() 0) */
  sunday: {
    openMinutes: 10 * 60,
    closeMinutes: 18 * 60,
  },
};

export const SALON_HOURS_DISPLAY = [
  'Mon – Sat: 9 AM – 6:30 PM',
  'Sun: 10 AM – 6 PM',
];

export function getSalonDayBounds(date = new Date()) {
  const hours = date.getDay() === 0 ? SALON_HOURS.sunday : SALON_HOURS.weekday;
  return {
    dayStartMinutes: hours.openMinutes,
    dayEndMinutes: hours.closeMinutes,
  };
}

/** Preferred booking time within salon hours for a given day. */
export function getDefaultBookingTimeMinutes(date = new Date()) {
  const { dayStartMinutes, dayEndMinutes } = getSalonDayBounds(date);
  const preferred = 12 * 60;
  if (preferred >= dayStartMinutes && preferred + 60 <= dayEndMinutes) {
    return preferred;
  }
  return dayStartMinutes + 60 <= dayEndMinutes ? dayStartMinutes + 60 : dayStartMinutes;
}
