import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  dateAtMinutes,
  dateToMinutes,
} from '@nail-couture/shared/utils/coutureTimeline.js';
import { addWeeks } from '@nail-couture/shared/utils/scheduleUtils.js';
import { getDefaultBookingTimeMinutes } from '@nail-couture/shared/constants/salonHours.js';

const DEFAULT_DRAFT = {
  appointmentId: '',
  durationMinutes: 60,
  clientName: '',
  phone: '',
  customerId: '',
  serviceId: '',
  technicianId: '',
  notes: '',
  selectedServices: [],
  selectedAddOns: [],
};

export function useBookingCanvasState({
  initialDate = new Date(),
  appointments,
  staff,
  onConfirmBooking,
  onCancelBooking,
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(() => ({
    ...DEFAULT_DRAFT,
    date: initialDate,
    timeMinutes: 12 * 60,
    technicianId: staff[0]?.id ?? '',
  }));

  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      technicianId: prev.technicianId || staff[0]?.id || '',
    }));
  }, [staff]);

  const filteredAppointments = useMemo(() => {
    const forDay = appointments.filter(
      (a) => a.startAt.toDateString() === selectedDate.toDateString(),
    );
    if (!selectedStaffId) return forDay;
    return forDay.filter((a) => a.technicianId === selectedStaffId);
  }, [appointments, selectedDate, selectedStaffId]);

  const openSheetAt = useCallback(
    (timeMinutes, durationMinutes = 60) => {
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
        serviceId: '',
        selectedServices: [],
        selectedAddOns: [],
      }));
      setSheetOpen(true);
    },
    [selectedDate, selectedStaffId, staff],
  );

  const openSheetForEdit = useCallback(
    (appointment) => {
      const startMinutes = dateToMinutes(appointment.startAt);
      const phoneDigits = (appointment.phone || '').replace(/\D/g, '').slice(0, 10);
      const selectedServices = appointment.selectedServices || [];
      const selectedAddOns = appointment.selectedAddOns || [];
      setDraft({
        appointmentId: appointment.id,
        date: new Date(appointment.startAt),
        timeMinutes: startMinutes,
        durationMinutes: appointment.durationMinutes,
        clientName: appointment.clientName,
        phone: phoneDigits,
        customerId: appointment.customerId || '',
        serviceId: appointment.serviceId || selectedServices[0]?.id || '',
        technicianId: appointment.technicianId || staff[0]?.id || '',
        notes: appointment.notes || '',
        selectedServices,
        selectedAddOns,
      });
      setSheetOpen(true);
    },
    [staff],
  );

  const openSheetFromHourSlot = useCallback(
    (startMinutes, durationMinutes = 60) => {
      openSheetAt(startMinutes, Math.min(durationMinutes, 60));
    },
    [openSheetAt],
  );

  const openSheetFromFab = useCallback(() => {
    openSheetAt(getDefaultBookingTimeMinutes(selectedDate), 60);
  }, [openSheetAt, selectedDate]);

  const updateDraft = useCallback((patch) => {
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
    const clientName = String(draft.clientName ?? '').trim();
    const phone = String(draft.phone ?? '').trim();
    if (!clientName || !draft.selectedServices?.length) return;
    setSubmitting(true);
    try {
      const scheduledAt = dateAtMinutes(draft.date, draft.timeMinutes);
      const payload = {
        appointmentId: draft.appointmentId || '',
        date: draft.date,
        scheduledAt,
        durationMinutes: draft.durationMinutes,
        clientName,
        phone,
        customerId: draft.customerId || null,
        serviceId: draft.serviceId || draft.selectedServices[0]?.id || '',
        technicianId: draft.technicianId,
        notes: String(draft.notes ?? '').trim(),
        selectedServices: draft.selectedServices,
        selectedAddOns: draft.selectedAddOns,
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
        serviceId: '',
        selectedServices: [],
        selectedAddOns: [],
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
