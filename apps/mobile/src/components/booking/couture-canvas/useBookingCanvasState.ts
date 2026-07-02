import { useCallback, useMemo, useState } from 'react';
import { dateAtMinutes, dateToMinutes } from '@nail-couture/shared/utils/coutureTimeline.js';
import { addWeeks } from '@nail-couture/shared/utils/scheduleUtils.js';
import { getDefaultBookingTimeMinutes } from '@nail-couture/shared/constants/salonHours.js';
import { buildMockAppointments } from '@nail-couture/shared/utils/bookingCanvasMocks.js';
import type { BookingConfirmPayload, BookingDraft, CanvasAppointment, CanvasService, CanvasStaffMember } from './types';

const DEFAULT_DRAFT: Omit<BookingDraft, 'date' | 'timeMinutes'> = {
  appointmentId: '',
  durationMinutes: 60,
  clientName: '',
  phone: '',
  customerId: '',
  serviceId: '',
  technicianId: '',
  notes: '',
};

type UseBookingCanvasStateOptions = {
  initialDate?: Date;
  appointments: CanvasAppointment[];
  staff: CanvasStaffMember[];
  services: CanvasService[];
  useMockWhenEmpty?: boolean;
  onConfirmBooking?: (payload: BookingConfirmPayload) => void | Promise<void>;
  onCancelBooking?: (appointmentId: string) => void | Promise<void>;
};

export function useBookingCanvasState({
  initialDate = new Date(),
  appointments,
  staff,
  services,
  useMockWhenEmpty = false,
  onConfirmBooking,
  onCancelBooking,
}: UseBookingCanvasStateOptions) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<BookingDraft>(() => ({
    ...DEFAULT_DRAFT,
    date: initialDate,
    timeMinutes: 12 * 60,
    technicianId: staff[0]?.id ?? '',
    serviceId: services[0]?.id ?? '',
  }));

  const resolvedAppointments = useMemo(() => {
    const mock = useMockWhenEmpty ? buildMockAppointments(selectedDate, dateAtMinutes) : [];
    if (!useMockWhenEmpty) return appointments;
    return [...mock, ...appointments];
  }, [appointments, useMockWhenEmpty, selectedDate]);

  const filteredAppointments = useMemo(() => {
    const forDay = resolvedAppointments.filter(
      (a) => a.startAt.toDateString() === selectedDate.toDateString(),
    );
    if (!selectedStaffId) return forDay;
    return forDay.filter((a) => a.technicianId === selectedStaffId);
  }, [resolvedAppointments, selectedDate, selectedStaffId]);

  const openSheetAt = useCallback(
    (timeMinutes: number, durationMinutes = 60) => {
      setDraft((prev) => ({
        ...prev,
        appointmentId: '',
        date: selectedDate,
        timeMinutes,
        durationMinutes,
        clientName: '',
        phone: '',
        customerId: '',
        notes: '',
        technicianId: selectedStaffId ?? staff[0]?.id ?? prev.technicianId,
        serviceId: services[0]?.id ?? prev.serviceId,
      }));
      setSheetOpen(true);
    },
    [selectedDate, selectedStaffId, staff, services],
  );

  const openSheetFromHourSlot = useCallback(
    (startMinutes: number, durationMinutes = 60) => {
      openSheetAt(startMinutes, Math.min(durationMinutes, 60));
    },
    [openSheetAt],
  );

  const openSheetFromFab = useCallback(() => {
    openSheetAt(getDefaultBookingTimeMinutes(selectedDate), 60);
  }, [openSheetAt, selectedDate]);

  const openSheetForEdit = useCallback(
    (appointment: CanvasAppointment) => {
      const startMinutes = dateToMinutes(appointment.startAt);
      const phoneDigits = (appointment.phone || '').replace(/\D/g, '').slice(0, 10);
      setDraft({
        appointmentId: appointment.id,
        date: new Date(appointment.startAt),
        timeMinutes: startMinutes,
        durationMinutes: appointment.durationMinutes,
        clientName: appointment.clientName,
        phone: phoneDigits,
        customerId: appointment.customerId || '',
        serviceId: appointment.serviceId || services[0]?.id || '',
        technicianId: appointment.technicianId || staff[0]?.id || '',
        notes: appointment.notes || '',
      });
      setSheetOpen(true);
    },
    [staff, services],
  );

  const updateDraft = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setDraft((prev) => ({
      ...prev,
      appointmentId: '',
    }));
  }, []);

  const confirmBooking = useCallback(async () => {
    if (!draft.clientName.trim()) return;
    setSubmitting(true);
    try {
      const scheduledAt = dateAtMinutes(draft.date, draft.timeMinutes);
      const payload: BookingConfirmPayload = {
        appointmentId: draft.appointmentId || '',
        date: draft.date,
        scheduledAt,
        durationMinutes: draft.durationMinutes,
        clientName: draft.clientName.trim(),
        phone: draft.phone.trim(),
        customerId: draft.customerId || '',
        serviceId: draft.serviceId,
        technicianId: draft.technicianId,
        notes: draft.notes.trim(),
      };
      await onConfirmBooking?.(payload);
      setSheetOpen(false);
      setDraft((prev) => ({
        ...prev,
        appointmentId: '',
        clientName: '',
        phone: '',
        customerId: '',
        notes: '',
      }));
    } finally {
      setSubmitting(false);
    }
  }, [draft, onConfirmBooking]);

  const cancelBooking = useCallback(async () => {
    if (!draft.appointmentId) return;
    setSubmitting(true);
    try {
      await onCancelBooking?.(draft.appointmentId);
      setSheetOpen(false);
      setDraft((prev) => ({
        ...prev,
        appointmentId: '',
        clientName: '',
        phone: '',
        customerId: '',
        notes: '',
      }));
    } finally {
      setSubmitting(false);
    }
  }, [draft.appointmentId, onCancelBooking]);

  const goToPrevWeek = useCallback(() => {
    setSelectedDate((prev) => addWeeks(prev, -1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setSelectedDate((prev) => addWeeks(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  return {
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
  };
}

export { buildMockStaff, buildMockServices, buildMockAppointments } from '@nail-couture/shared/utils/bookingCanvasMocks.js';
export { mapStaffFromProfiles, mapAppointmentRow } from '@nail-couture/shared/utils/bookingCanvasData.js';
