export function getDateRangeForPreset(preset, customStart = '', customEnd = '') {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      return { fromDate: startOfToday.toISOString(), toDate: end.toISOString() };
    case '7_days': {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 6);
      return { fromDate: from.toISOString(), toDate: end.toISOString() };
    }
    case '30_days': {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 29);
      return { fromDate: from.toISOString(), toDate: end.toISOString() };
    }
    case 'custom': {
      if (!customStart || !customEnd) return null;
      const from = new Date(customStart);
      from.setHours(0, 0, 0, 0);
      const to = new Date(customEnd);
      to.setHours(23, 59, 59, 999);
      return { fromDate: from.toISOString(), toDate: to.toISOString() };
    }
    default:
      return { fromDate: startOfToday.toISOString(), toDate: end.toISOString() };
  }
}

export function isEventBeforeCursor(event, cursor) {
  if (!cursor) return true;
  const eventTime = new Date(event.date).getTime();
  const cursorTime = new Date(cursor.date).getTime();
  if (eventTime < cursorTime) return true;
  if (eventTime > cursorTime) return false;
  return String(event.id) < String(cursor.id);
}

export function isVisitBeforeCursor(visit, cursor) {
  if (!cursor) return true;
  const visitAt = visit.checked_in_at || visit.scheduled_at || visit.created_at;
  const eventTime = new Date(visitAt).getTime();
  const cursorTime = new Date(cursor.date).getTime();
  if (eventTime < cursorTime) return true;
  if (eventTime > cursorTime) return false;
  return String(visit.id) < String(cursor.id);
}
