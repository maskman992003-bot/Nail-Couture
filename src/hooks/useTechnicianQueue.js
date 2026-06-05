import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  getCallerPhone,
  fetchMyQueue,
  fetchFloorSnapshot,
  fetchWeekAppointments,
  computeQueueStats,
  computeWeekStats,
  decrementRefreshmentInventory,
} from '../utils/technicianQueue';

export function useTechnicianQueue(technicianId, callerPhoneFallback) {
  const [myAppointments, setMyAppointments] = useState([]);
  const [floorAppointments, setFloorAppointments] = useState([]);
  const [weekAppointments, setWeekAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const refetch = useCallback(async (silent = false) => {
    if (!technicianId) return;
    if (!silent) setRefreshing(true);
    const phone = getCallerPhone(callerPhoneFallback);
    try {
      const [mineResult, floorResult, weekResult] = await Promise.allSettled([
        fetchMyQueue(technicianId, phone),
        fetchFloorSnapshot(phone),
        fetchWeekAppointments(technicianId),
      ]);

      if (mineResult.status === 'fulfilled') {
        setMyAppointments(mineResult.value);
      }
      if (floorResult.status === 'fulfilled') {
        setFloorAppointments(floorResult.value);
      }
      if (weekResult.status === 'fulfilled') {
        setWeekAppointments(weekResult.value);
      }

      const coreFailed = mineResult.status === 'rejected' || floorResult.status === 'rejected';
      if (coreFailed) {
        const err = mineResult.reason || floorResult.reason;
        console.error('Error fetching technician queue:', err);
        if (!silent) {
          showToast(err?.message || 'Failed to refresh queue', 'error');
        }
      } else if (weekResult.status === 'rejected') {
        console.warn('Week stats fetch failed:', weekResult.reason);
      }
    } catch (err) {
      console.error('Error fetching technician queue:', err);
      if (!silent) showToast(err?.message || 'Failed to refresh queue', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [technicianId, callerPhoneFallback, showToast]);

  const acceptAssignment = useCallback(async (appointment) => {
    setActionId(appointment.id);
    try {
      const phone = getCallerPhone(callerPhoneFallback);
      const { error } = await supabase.rpc('start_appointment', {
        caller_phone: phone,
        appointment_id: appointment.id,
      });
      if (error) throw error;
      showToast(`Started: ${appointment.customer?.full_name || 'Client'}`);
      await refetch(true);
    } catch (err) {
      console.error('Error starting appointment:', err);
      showToast(err.message || 'Failed to start service', 'error');
    } finally {
      setActionId(null);
    }
  }, [refetch, showToast, callerPhoneFallback]);

  const markComplete = useCallback(async (appointment) => {
    const price = appointment.final_price ?? appointment.services?.price ?? null;
    if (price == null) {
      const confirmed = window.confirm(
        'No final price set. Complete anyway? Cashier can adjust at checkout.'
      );
      if (!confirmed) return;
    }

    setActionId(appointment.id);
    try {
      const phone = getCallerPhone(callerPhoneFallback);
      const { error } = await supabase.rpc('complete_appointment', {
        caller_phone: phone,
        appointment_id: appointment.id,
        p_final_price: price,
      });
      if (error) throw error;

      if (appointment.customer?.refreshment_pref) {
        await decrementRefreshmentInventory(appointment.customer.refreshment_pref);
      }

      showToast(`Completed: ${appointment.customer?.full_name || 'Client'}`);
      await refetch(true);
    } catch (err) {
      console.error('Error completing appointment:', err);
      showToast(err.message || 'Failed to complete service', 'error');
    } finally {
      setActionId(null);
    }
  }, [refetch, showToast, callerPhoneFallback]);

  useEffect(() => {
    if (!technicianId) return;
    refetch(true);

    const channel = supabase
      .channel('technician-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refetch(true);
      })
      .subscribe();

    const poll = setInterval(() => refetch(true), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [technicianId, refetch]);

  const stats = computeQueueStats(myAppointments);
  const weekStats = computeWeekStats(weekAppointments);

  return {
    myAppointments,
    floorAppointments,
    stats,
    weekStats,
    loading,
    refreshing,
    actionId,
    toast,
    refetch,
    acceptAssignment,
    markComplete,
    dismissToast: () => setToast(null),
  };
}
