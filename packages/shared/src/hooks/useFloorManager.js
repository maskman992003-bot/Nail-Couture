import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCallerPhone } from '../utils/technicianQueue';
import { fetchLobbyAutoAssignEnabled } from '../utils/lobbyAutoAssign';

const POLL_MS = 15000;

const FLOOR_REFRESH_TYPES = new Set([
  'lobby_waiting',
  'new_booking',
  'new_assignment',
  'checkout_ready',
]);

/**
 * @param {Object} options
 * @param {string | undefined | null} options.callerPhone
 * @param {string | undefined | null} options.userId
 * @param {() => boolean} [options.getIsActive]
 * @param {boolean} [options.enabled=true]
 */
export function useFloorManager({ callerPhone, userId, getIsActive, enabled = true }) {
  const [lobbyAppointments, setLobbyAppointments] = useState([]);
  const [servingAppointments, setServingAppointments] = useState([]);
  const [checkoutReadyAppointments, setCheckoutReadyAppointments] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [techWorkload, setTechWorkload] = useState({});
  const [todayTotal, setTodayTotal] = useState(0);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isActive = useCallback(() => {
    if (getIsActive) return getIsActive();
    if (typeof document !== 'undefined') {
      return document.visibilityState === 'visible';
    }
    return true;
  }, [getIsActive]);

  const refreshFloorManager = useCallback(async (silent = false) => {
    const phone = getCallerPhone(callerPhone);
    if (!phone) {
      setLoading(false);
      return;
    }
    if (!silent) setRefreshing(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [waiting, serving, checkout, pending, techs, workload, countRes] = await Promise.all([
        supabase.rpc('get_appointments', { caller_phone: phone, status_filter: 'waiting', order_asc: true }),
        supabase.rpc('get_appointments', { caller_phone: phone, status_filter: 'serving', order_asc: true }),
        supabase.rpc('get_appointments', { caller_phone: phone, status_filter: 'ready_for_checkout', order_asc: true }),
        supabase.rpc('get_appointments', { caller_phone: phone, status_filter: 'assigned_pending', order_asc: true }),
        supabase.from('profiles').select('*').eq('role', 'technician').order('full_name'),
        supabase.rpc('get_floor_technician_workload'),
        supabase.rpc('get_appointments_count', {
          caller_phone: phone,
          status_filter: 'completed',
          date_from: today.toISOString(),
        }),
      ]);

      if (!waiting.error) setLobbyAppointments(waiting.data || []);
      if (!serving.error) setServingAppointments(serving.data || []);
      if (!checkout.error) setCheckoutReadyAppointments(checkout.data || []);
      if (!pending.error) setPendingAppointments(pending.data || []);
      if (!techs.error) setTechnicians(techs.data || []);

      const map = {};
      if (!workload.error) {
        (workload.data || []).forEach((row) => {
          map[row.id] = row;
        });
      }
      setTechWorkload(map);
      if (!countRes.error) setTodayTotal(countRes.data || 0);
    } catch (err) {
      console.error('Error refreshing floor manager:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [callerPhone]);

  useEffect(() => {
    if (!enabled || !getCallerPhone(callerPhone)) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const init = async () => {
      const autoAssign = await fetchLobbyAutoAssignEnabled();
      if (cancelled) return;
      setAutoAssignEnabled(autoAssign.enabled);
      await refreshFloorManager(true);
    };
    init();

    const channel = supabase
      .channel('floor-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refreshFloorManager(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        refreshFloorManager(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_configurations' }, (payload) => {
        if (payload.new?.lobby_auto_assign_enabled !== undefined) {
          setAutoAssignEnabled(payload.new.lobby_auto_assign_enabled !== false);
        }
      });

    if (userId) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const type = payload.new?.type;
          if (type && FLOOR_REFRESH_TYPES.has(type)) {
            refreshFloorManager(true);
          }
        },
      );
    }

    channel.subscribe();

    const poll = setInterval(() => {
      if (isActive()) refreshFloorManager(true);
    }, POLL_MS);

    let visibilityHandler;
    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.visibilityState === 'visible') refreshFloorManager(true);
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(poll);
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
  }, [enabled, callerPhone, userId, refreshFloorManager, isActive]);

  return {
    lobbyAppointments,
    servingAppointments,
    checkoutReadyAppointments,
    pendingAppointments,
    technicians,
    techWorkload,
    todayTotal,
    autoAssignEnabled,
    setAutoAssignEnabled,
    loading,
    refreshing,
    refreshFloorManager,
  };
}

export default useFloorManager;
