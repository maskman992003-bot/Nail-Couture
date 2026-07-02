export const STAFF_ACCENT_COLORS = ['#C5A059', '#9B7FD4', '#4ADE80', '#F97316'];

export function buildMockStaff() {
  return [
    { id: 'staff-mona', fullName: 'Mona E.', accentColor: STAFF_ACCENT_COLORS[0], initial: 'M' },
    { id: 'staff-ahmed', fullName: 'Ahmed R.', accentColor: STAFF_ACCENT_COLORS[2], initial: 'A' },
    { id: 'staff-layla', fullName: 'Layla S.', accentColor: STAFF_ACCENT_COLORS[1], initial: 'L' },
    { id: 'staff-sam', fullName: 'Sam D.', accentColor: STAFF_ACCENT_COLORS[3], initial: 'S' },
  ];
}

export function buildMockServices() {
  return [
    { id: 'svc-1', name: 'Couture Color', durationMinutes: 60, price: 80 },
    { id: 'svc-2', name: 'Trim & Gloss', durationMinutes: 30, price: 45 },
    { id: 'svc-3', name: 'Full Style', durationMinutes: 60, price: 100 },
  ];
}

export function buildMockAppointments(baseDate, dateAtMinutes) {
  const staff = buildMockStaff();
  const makeAppt = (id, hour, minute, durationMinutes, clientName, serviceName, staffMember) => ({
    id,
    startAt: dateAtMinutes(baseDate, hour * 60 + minute),
    durationMinutes,
    clientName,
    serviceName,
    technicianId: staffMember.id,
    technicianName: staffMember.fullName,
    accentColor: staffMember.accentColor,
  });

  return [
    makeAppt('mock-1', 10, 15, 60, 'Sarah Jenkins', 'Couture Color', staff[0]),
    makeAppt('mock-2', 11, 30, 30, 'Aya Mahmoud', 'Trim & Gloss', staff[2]),
  ];
}
