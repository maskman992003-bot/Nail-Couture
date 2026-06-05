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
  notifyNewAssignment,
} from '../utils/technicianQueue';

export function useTechnicianQueue(technicianId, callerPhoneFallback) {
  const [myAppointments, setMyAppointments] = useState([]);
  const [floorAppointments, setFloorAppointments] = useState([]);
  const [weekAppointments, setWeekAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState(null);
  const [newAssignmentIds, setNewAssignmentIds] = useState([]);
  const [postComplete, setPostComplete] = useState(null);
  const [priceConfirmAppt, setPriceConfirmAppt] = useState(null);
  const toastTimer = useRef(null);
  const knownPendingIds = useRef(new Set());
  const initialLoadDone = useRef(false);

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
        const mine = mineResult.value;
        setMyAppointments(mine);

        const pending = mine.filter((a) => a.status === 'assigned_pending');
        const pendingIds = new Set(pending.map((a) => a.id));

        if (initialLoadDone.current) {
          const fresh = pending.filter((a) => !knownPendingIds.current.has(a.id));
          if (fresh.length > 0) {
            setNewAssignmentIds((prev) => [...new Set([...prev, ...fresh.map((a) => a.id)])]);
            fresh.forEach((a) => notifyNewAssignment(a));
            showToast(`New assignment: ${fresh[0].customer?.full_name || 'Client'}`);
          }
        } else {
          initialLoadDone.current = true;
        }
        knownPendingIds.current = pendingIds;
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
      setNewAssignmentIds((prev) => prev.filter((id) => id !== appointment.id));
      showToast(`Started: ${appointment.customer?.full_name || 'Client'}`);
      await refetch(true);
    } catch (err) {
      console.error('Error starting appointment:', err);
      showToast(err.message || 'Failed to start service', 'error');
    } finally {
      setActionId(null);
    }
  }, [refetch, showToast, callerPhoneFallback]);

  const doComplete = useCallback(async (appointment, price) => {
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
      setPostComplete({
        customerId: appointment.customer_id || appointment.customer?.id || null,
        customerName: appointment.customer?.full_name || 'Client',
        appointmentId: appointment.id,
        serviceId: appointment.service_id,
      });
      await refetch(true);
    } catch (err) {
      console.error('Error completing appointment:', err);
      showToast(err.message || 'Failed to complete service', 'error');
    } finally {
      setActionId(null);
    }
  }, [refetch, showToast, callerPhoneFallback]);

  const markComplete = useCallback(async (appointment) => {
    const price = appointment.final_price ?? appointment.services?.price ?? null;
    if (price == null) {
      setPriceConfirmAppt(appointment);
      return;
    }
    await doComplete(appointment, price);
  }, [doComplete]);

  const confirmCompleteWithoutPrice = useCallback(async () => {
    if (!priceConfirmAppt) return;
    const appt = priceConfirmAppt;
    setPriceConfirmAppt(null);
    await doComplete(appt, null);
  }, [priceConfirmAppt, doComplete]);

  const cancelPriceConfirm = useCallback(() => setPriceConfirmAppt(null), []);

  const declineAssignment = useCallback(async (appointment, reason = '') => {
    setActionId(appointment.id);
    try {
      const phone = getCallerPhone(callerPhoneFallback);
      const { error } = await supabase.rpc('decline_assignment', {
        caller_phone: phone,
        appointment_id: appointment.id,
        p_reason: reason || null,
      });
      if (error) throw error;
      setNewAssignmentIds((prev) => prev.filter((id) => id !== appointment.id));
      showToast(`Returned to waiting: ${appointment.customer?.full_name || 'Client'}`);
      await refetch(true);
    } catch (err) {
      console.error('Error declining assignment:', err);
      showToast(err.message || 'Failed to decline assignment', 'error');
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
      initialLoadDone.current = false;
      knownPendingIds.current = new Set();
    };
  }, [technicianId, refetch]);

  const stats = computeQueueStats(myAppointments);
  const weekStats = computeWeekStats(weekAppointments);

  const dismissNewAssignment = useCallback((id) => {
    setNewAssignmentIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearNewAssignments = useCallback(() => setNewAssignmentIds([]), []);

  const dismissPostComplete = useCallback(() => setPostComplete(null), []);

  return {
    myAppointments,
    floorAppointments,
    stats,
    weekStats,
    loading,
    refreshing,
    actionId,
    toast,
    newAssignmentIds,
    postComplete,
    refetch,
    acceptAssignment,
    markComplete,
    dismissToast: () => setToast(null),
    dismissNewAssignment,
    clearNewAssignments,
    dismissPostComplete,
    declineAssignment,
    priceConfirmAppt,
    confirmCompleteWithoutPrice,
    cancelPriceConfirm,
  };
}
