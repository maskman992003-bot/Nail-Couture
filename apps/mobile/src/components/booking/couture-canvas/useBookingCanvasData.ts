import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import {
  fetchBookingCanvasAppointments,
  fetchBookingCanvasServices,
  fetchBookingCanvasStaff,
  searchBookedCustomersByPhone,
  searchBookingCanvasCustomers,
} from '@nail-couture/shared/utils/bookingCanvasData.js';
import { getWeekDates, toDateStr } from '@nail-couture/shared/utils/scheduleUtils.js';
import type { CanvasAppointment, CanvasService, CanvasStaffMember } from './types';

type UseBookingCanvasDataResult = {
  staff: CanvasStaffMember[];
  services: CanvasService[];
  appointments: CanvasAppointment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  searchCustomers: (term: string) => Promise<{ id: string; full_name?: string; phone?: string }[]>;
  searchBookedByPhone: (term: string) => Promise<BookedCustomerSearchResult[]>;
};

export type BookedCustomerAppointment = {
  appointmentId: string;
  scheduledAt: Date;
  isPast: boolean;
};

export type BookedCustomerSearchResult = {
  id: string;
  full_name: string;
  phone: string;
  appointments: BookedCustomerAppointment[];
};

export type BookedCustomerSelection = {
  customerId: string;
  appointmentId: string;
  scheduledAt: Date;
};

export function useBookingCanvasData(referenceDate: Date = new Date()): UseBookingCanvasDataResult {
  const referenceDateRef = useRef(referenceDate);
  const weekStart = useMemo(
    () => toDateStr(getWeekDates(referenceDate)[0]),
    [referenceDate],
  );
  const mountedRef = useRef(true);
  const [staff, setStaff] = useState<CanvasStaffMember[]>([]);
  const [services, setServices] = useState<CanvasService[]>([]);
  const [appointments, setAppointments] = useState<CanvasAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAppointments = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      const rows = await fetchBookingCanvasAppointments(getSupabase(), referenceDateRef.current);
      if (!mountedRef.current) return;
      setAppointments(rows);
      if (!silent) setError(null);
    } catch (err) {
      console.error('Error fetching booking canvas appointments:', err);
      if (!mountedRef.current || silent) return;
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    }
  }, []);

  const loadLookups = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const [staffRows, serviceRows] = await Promise.all([
        fetchBookingCanvasStaff(supabase),
        fetchBookingCanvasServices(supabase),
      ]);
      if (!mountedRef.current) return;
      setStaff(staffRows);
      setServices(serviceRows);
      setError(null);
    } catch (err) {
      console.error('Error fetching booking canvas lookups:', err);
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load staff or services');
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    await Promise.all([loadLookups(), loadAppointments()]);
    if (mountedRef.current) setLoading(false);
  }, [loadLookups, loadAppointments]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    referenceDateRef.current = referenceDate;
    loadAppointments({ silent: true });
  }, [weekStart, referenceDate, loadAppointments]);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel('booking-canvas-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadAppointments({ silent: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAppointments]);

  const searchCustomers = useCallback(
    (term: string) => searchBookingCanvasCustomers(getSupabase(), term),
    [],
  );
  const searchBookedByPhone = useCallback(
    (term: string) => searchBookedCustomersByPhone(getSupabase(), term),
    [],
  );

  return {
    staff,
    services,
    appointments,
    loading,
    error,
    refresh,
    searchCustomers,
    searchBookedByPhone,
  };
}
