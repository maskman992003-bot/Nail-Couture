import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  getCallerPhone,
  fetchMyQueue,
  fetchFloorSnapshot,
  fetchFloorTechnicians,
  fetchWeekAppointments,
  fetchTechnicianDayPayments,
  computeQueueStats,
  computeWeekStats,
  notifyNewAssignment,
  playAssignmentChime,
  sumTipsFromPayments,
  mapPaymentsByAppointment,
} from '@nail-couture/shared/utils/technicianQueue';
import { toggleChecklistItem } from '@nail-couture/shared/utils/serviceChecklist';
import { logInventoryUsage } from '@nail-couture/shared/utils/inventoryUsage';

export function useTechnicianQueue(technicianId, callerPhoneFallback) {
  const [myAppointments, setMyAppointments] = useState([]);
  const [floorAppointments, setFloorAppointments] = useState([]);
  const [floorTechnicians, setFloorTechnicians] = useState([]);
  const [weekAppointments, setWeekAppointments] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState(null);
  const [newAssignmentIds, setNewAssignmentIds] = useState([]);
  const [newAssignmentBanner, setNewAssignmentBanner] = useState([]);
  const [priceConfirmAppt, setPriceConfirmAppt] = useState(null);
  const toastTimer = useRef(null);
  const knownPendingIds = useRef(new Set());
  const initialLoadDone = useRef(false);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleFreshAssignments = useCallback((fresh) => {
    if (fresh.length === 0) return;

    setNewAssignmentIds((prev) => [...new Set([...prev, ...fresh.map((a) => a.id)])]);
    setNewAssignmentBanner((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      const added = fresh
        .filter((a) => !existing.has(a.id))
        .map((a) => ({
          id: a.id,
          name: a.customer?.full_name || 'Client',
        }));
      return [...prev, ...added];
    });

    fresh.forEach((a) => notifyNewAssignment(a));
    playAssignmentChime();

    if (fresh.length === 1) {
      showToast(`New assignment: ${fresh[0].customer?.full_name || 'Client'}`);
    } else {
      const names = fresh.map((a) => a.customer?.full_name || 'Client').join(', ');
      showToast(`${fresh.length} new assignments: ${names}`);
    }

    if (localStorage.getItem('tech_alert_autoscroll') !== 'false') {
      requestAnimationFrame(() => {
        document.getElementById('my-assignments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [showToast]);

  const refetch = useCallback(async (silent = false) => {
    if (!technicianId) return;
    if (!silent) setRefreshing(true);
    const phone = getCallerPhone(callerPhoneFallback);
    try {
      const [mineResult, floorResult, techResult, weekResult, paymentsResult] = await Promise.allSettled([
        fetchMyQueue(technicianId, phone),
        fetchFloorSnapshot(phone),
        fetchFloorTechnicians(),
        fetchWeekAppointments(technicianId),
        fetchTechnicianDayPayments(technicianId),
      ]);

      if (mineResult.status === 'fulfilled') {
        const mine = mineResult.value;
        setMyAppointments(mine);

        const pending = mine.filter((a) => a.status === 'assigned_pending');
        const pendingIds = new Set(pending.map((a) => a.id));

        if (initialLoadDone.current) {
          const fresh = pending.filter((a) => !knownPendingIds.current.has(a.id));
          handleFreshAssignments(fresh);
        } else {
          initialLoadDone.current = true;
        }
        knownPendingIds.current = pendingIds;
      }
      if (floorResult.status === 'fulfilled') {
        setFloorAppointments(floorResult.value);
      }
      if (techResult.status === 'fulfilled') {
        setFloorTechnicians(techResult.value);
      }
      if (weekResult.status === 'fulfilled') {
        setWeekAppointments(weekResult.value);
      }
      if (paymentsResult.status === 'fulfilled') {
        setTodayPayments(paymentsResult.value);
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
      if (!silent) showToast(err.message || 'Failed to refresh queue', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [technicianId, callerPhoneFallback, showToast, handleFreshAssignments]);

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
      setNewAssignmentBanner((prev) => prev.filter((a) => a.id !== appointment.id));
      showToast(`Started: ${appointment.customer?.full_name || 'Client'}`);
      await refetch(true);
    } catch (err) {
      console.error('Error starting appointment:', err);
      showToast(err.message || 'Failed to start service', 'error');
    } finally {
      setActionId(null);
    }
  }, [refetch, showToast, callerPhoneFallback]);

  const doSendToCheckout = useCallback(async (appointment, price) => {
    setActionId(appointment.id);
    try {
      const phone = getCallerPhone(callerPhoneFallback);
      const { error } = await supabase.rpc('send_to_checkout', {
        caller_phone: phone,
        appointment_id: appointment.id,
        p_final_price: price,
      });
      if (error) {
        if (error.message?.includes('send_to_checkout') || error.code === '42883') {
          throw new Error('Checkout workflow unavailable. Run sql/031_cashier_workflow.sql in Supabase.');
        }
        throw error;
      }

      showToast(`Sent to checkout: ${appointment.customer?.full_name || 'Client'}`);
      await refetch(true);
    } catch (err) {
      console.error('Error sending to checkout:', err);
      showToast(err.message || 'Failed to send to checkout', 'error');
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
    await doSendToCheckout(appointment, price);
  }, [doSendToCheckout]);

  const confirmCompleteWithoutPrice = useCallback(async () => {
    if (!priceConfirmAppt) return;
    const appt = priceConfirmAppt;
    setPriceConfirmAppt(null);
    await doSendToCheckout(appt, null);
  }, [priceConfirmAppt, doSendToCheckout]);

  const cancelPriceConfirm = useCallback(() => setPriceConfirmAppt(null), []);

  const updateServingServices = useCallback(async (appointment, { service_id, add_ons, final_price, selected_service_names }) => {
    setActionId(appointment.id);
    try {
      const phone = getCallerPhone(callerPhoneFallback);
      const { error } = await supabase.rpc('update_appointment', {
        caller_phone: phone,
        appointment_id: appointment.id,
        p_service_id: service_id ?? null,
        p_add_ons: add_ons ?? null,
        p_final_price: final_price ?? null,
        p_selected_service_names: selected_service_names ?? null,
      });
      if (error) throw error;
      showToast('Services updated');
      await refetch(true);
      return { success: true };
    } catch (err) {
      console.error('Error updating services:', err);
      const message = err.message || 'Failed to update services';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setActionId(null);
    }
  }, [refetch, showToast, callerPhoneFallback]);

  const updateChecklistItem = useCallback(async (appointment, itemId, completed) => {
    setActionId(appointment.id);
    try {
      const phone = getCallerPhone(callerPhoneFallback);
      const newMetadata = toggleChecklistItem(appointment.metadata, itemId, completed);
      const { error } = await supabase.rpc('update_appointment', {
        caller_phone: phone,
        appointment_id: appointment.id,
        p_metadata: newMetadata,
      });
      if (error) throw error;
      await refetch(true);
      return { success: true };
    } catch (err) {
      console.error('Error updating checklist:', err);
      showToast(err.message || 'Failed to update checklist', 'error');
      return { success: false, error: err.message };
    } finally {
      setActionId(null);
    }
  }, [refetch, showToast, callerPhoneFallback]);

  const logProductUsage = useCallback(async (appointment, { inventoryId, quantity, logType }) => {
    setActionId(appointment.id);
    try {
      const phone = getCallerPhone(callerPhoneFallback);
      const result = await logInventoryUsage(phone, {
        inventoryId,
        quantityChanged: -Math.abs(quantity),
        appointmentId: appointment.id,
        customerId: appointment.customer_id,
        reason: logType === 'waste' ? 'Waste during service' : 'Used during service',
        logType,
      });
      if (!result.success) throw new Error(result.error);
      showToast(logType === 'waste' ? 'Waste logged' : 'Usage logged');
      return result;
    } catch (err) {
      console.error('Error logging usage:', err);
      showToast(err.message || 'Failed to log usage', 'error');
      return { success: false, error: err.message };
    } finally {
      setActionId(null);
    }
  }, [showToast, callerPhoneFallback]);

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
      setNewAssignmentBanner((prev) => prev.filter((a) => a.id !== appointment.id));
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
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
        filter: `technician_id=eq.${technicianId}`,
      }, () => {
        refetch(true);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payment_transactions' }, () => {
        fetchTechnicianDayPayments(technicianId).then(setTodayPayments).catch(() => {});
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchFloorTechnicians().then(setFloorTechnicians).catch(() => {});
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
  const tipsToday = sumTipsFromPayments(todayPayments);
  const paymentsByAppointment = useMemo(
    () => mapPaymentsByAppointment(todayPayments),
    [todayPayments]
  );

  const dismissNewAssignment = useCallback((id) => {
    setNewAssignmentIds((prev) => prev.filter((x) => x !== id));
    setNewAssignmentBanner((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearNewAssignments = useCallback(() => {
    setNewAssignmentIds([]);
    setNewAssignmentBanner([]);
  }, []);

  const scrollToAssignments = useCallback(() => {
    document.getElementById('my-assignments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return {
    myAppointments,
    floorAppointments,
    floorTechnicians,
    stats,
    weekStats,
    tipsToday,
    todayPayments,
    paymentsByAppointment,
    loading,
    refreshing,
    actionId,
    toast,
    newAssignmentIds,
    newAssignmentBanner,
    refetch,
    acceptAssignment,
    markComplete,
    dismissToast: () => setToast(null),
    dismissNewAssignment,
    clearNewAssignments,
    scrollToAssignments,
    declineAssignment,
    updateServingServices,
    updateChecklistItem,
    logProductUsage,
    priceConfirmAppt,
    confirmCompleteWithoutPrice,
    cancelPriceConfirm,
  };
}
