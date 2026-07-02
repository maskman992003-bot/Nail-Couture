import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchBookingCanvasAppointments,
  fetchBookingCanvasServices,
  fetchBookingCanvasStaff,
  searchBookedCustomersByPhone,
  searchBookingCanvasCustomers,
} from '@nail-couture/shared/utils/bookingCanvasData.js';
import { getWeekDates, toDateStr } from '@nail-couture/shared/utils/scheduleUtils.js';

export function useBookingCanvasData(referenceDate = new Date()) {
  const referenceDateRef = useRef(referenceDate);
  const weekStart = useMemo(
    () => toDateStr(getWeekDates(referenceDate)[0]),
    [referenceDate],
  );
  const mountedRef = useRef(true);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAppointments = useCallback(async ({ silent = false } = {}) => {
    try {
      const rows = await fetchBookingCanvasAppointments(supabase, referenceDateRef.current);
      if (!mountedRef.current) return;
      setAppointments(rows);
      if (!silent) setError(null);
    } catch (err) {
      console.error('Error fetching booking canvas appointments:', err);
      if (!mountedRef.current || silent) return;
      setError(err?.message || 'Failed to load appointments');
    }
  }, []);

  const loadLookups = useCallback(async () => {
    try {
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
      setError(err?.message || 'Failed to load staff or services');
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

  const searchCustomers = useCallback((term) => searchBookingCanvasCustomers(supabase, term), []);
  const searchBookedByPhone = useCallback(
    (term) => searchBookedCustomersByPhone(supabase, term),
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
