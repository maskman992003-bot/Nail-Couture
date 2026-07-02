import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  cancelBookingCanvasAppointment,
  createBookingCanvasAppointment,
  lookupCustomerByPhone,
  updateBookingCanvasAppointment,
} from '@nail-couture/shared/utils/bookingCanvasData.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../../contexts/AuthContext';
import { BookedCustomerSearchModal } from '../../components/booking/couture-canvas/BookedCustomerSearchModal';
import { BookingBottomSheet } from '../../components/booking/couture-canvas/BookingBottomSheet';
import { BookingFab } from '../../components/booking/couture-canvas/BookingFab';
import { CoutureCanvasHeader } from '../../components/booking/couture-canvas/CoutureCanvasHeader';
import { ProportionalTimeline } from '../../components/booking/couture-canvas/ProportionalTimeline';
import { COUTURE_COLORS } from '../../components/booking/couture-canvas/constants';
import { useBookingCanvasData } from '../../components/booking/couture-canvas/useBookingCanvasData';
import { useBookingCanvasState } from '../../components/booking/couture-canvas/useBookingCanvasState';
import type { BookedCustomerSelection } from '../../components/booking/couture-canvas/useBookingCanvasData';
import type { BookingConfirmPayload, CanvasAppointment } from '../../components/booking/couture-canvas/types';

type BookingCanvasScreenProps = {
  onConfirmBooking?: (payload: BookingConfirmPayload) => void | Promise<void>;
  appointments?: CanvasAppointment[];
};

export function BookingCanvasScreen({
  onConfirmBooking,
  appointments: externalAppointments,
}: BookingCanvasScreenProps) {
  const { user } = useAuth();
  const [viewDate, setViewDate] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingAppointmentId, setPendingAppointmentId] = useState<string | null>(null);

  const {
    staff,
    services,
    appointments: fetchedAppointments,
    loading,
    error,
    refresh,
    searchCustomers,
    searchBookedByPhone,
  } = useBookingCanvasData(viewDate);

  const appointments = externalAppointments ?? fetchedAppointments;

  const handleConfirm = useCallback(
    async (payload: BookingConfirmPayload) => {
      if (onConfirmBooking) {
        await onConfirmBooking(payload);
        await refresh();
        return;
      }

      const supabase = getSupabase();

      if (payload.appointmentId) {
        await updateBookingCanvasAppointment(supabase, {
          callerPhone: user?.phone,
          appointmentId: payload.appointmentId,
          serviceId: payload.serviceId,
          technicianId: payload.technicianId,
          scheduledAt: payload.scheduledAt.toISOString(),
          notes: payload.notes,
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

      const service = services.find((s) => s.id === payload.serviceId);
      await createBookingCanvasAppointment(supabase, {
        customerId,
        serviceId: payload.serviceId,
        technicianId: payload.technicianId,
        scheduledAt: payload.scheduledAt.toISOString(),
        notes: payload.notes,
        price: service?.price ?? 0,
      });
      await refresh();
    },
    [onConfirmBooking, services, refresh, user?.phone],
  );

  const handleCancel = useCallback(
    async (appointmentId: string) => {
      await cancelBookingCanvasAppointment(getSupabase(), user?.phone, appointmentId);
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
    filteredAppointments: dayAppointments,
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
    services,
    useMockWhenEmpty: false,
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

  const handleBookedCustomerSelect = useCallback((result: BookedCustomerSelection) => {
    setSearchOpen(false);
    setSelectedDate(new Date(result.scheduledAt));
    setPendingAppointmentId(result.appointmentId);
  }, [setSelectedDate]);

  if (loading && staff.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COUTURE_COLORS.canvasBg, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={COUTURE_COLORS.gold} />
        <Text style={{ marginTop: 12, color: COUTURE_COLORS.textSecondary }}>Loading schedule…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COUTURE_COLORS.canvasBg }} edges={['top']}>
      <View style={{ flex: 1 }}>
        <CoutureCanvasHeader
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onPrevWeek={goToPrevWeek}
          onNextWeek={goToNextWeek}
          onToday={goToToday}
          staff={staff}
          selectedStaffId={selectedStaffId}
          onSelectStaff={setSelectedStaffId}
          onSearchPress={() => setSearchOpen(true)}
        />
        {error ? (
          <Text style={{ color: '#f87171', fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 }}>{error}</Text>
        ) : null}
        <ProportionalTimeline
          selectedDate={selectedDate}
          appointments={dayAppointments}
          onHourSlotPress={openSheetFromHourSlot}
          onAppointmentPress={openSheetForEdit}
        />
        <BookingFab onPress={openSheetFromFab} />
      </View>

      <BookingBottomSheet
        open={sheetOpen}
        draft={draft}
        staff={staff}
        services={services}
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
    </SafeAreaView>
  );
}
