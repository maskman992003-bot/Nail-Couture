import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { fetchPendingAssignmentCount } from '@nail-couture/shared/utils/technicianQueue.js';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../contexts/AuthContext';

const POLL_MS = 30000;

export function useNavBadges() {
  const { user } = useAuth();
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [checkoutQueueCount, setCheckoutQueueCount] = useState(0);

  const userPhone = user?.phone;
  const isTechnician = user?.role === 'technician';
  const isCashier = user?.role === 'cashier';

  const refreshPendingAssignments = useCallback(async () => {
    if (!isTechnician || !user?.id || !userPhone) return;
    const count = await fetchPendingAssignmentCount(user.id, userPhone);
    setPendingAssignments(count);
  }, [isTechnician, user?.id, userPhone]);

  const refreshCheckoutQueue = useCallback(async () => {
    if (!isCashier || !userPhone) return;
    try {
      const { data, error } = await getSupabase().rpc('get_appointments', {
        caller_phone: userPhone,
        status_filter: 'ready_for_checkout',
      });
      if (!error) setCheckoutQueueCount((data || []).length);
    } catch {
      /* ignore */
    }
  }, [isCashier, userPhone]);

  useEffect(() => {
    if (!isTechnician || !user?.id || !userPhone) {
      setPendingAssignments(0);
      return;
    }

    refreshPendingAssignments();

    const channel = getSupabase()
      .channel('sidebar-technician-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refreshPendingAssignments();
      })
      .subscribe();

    const poll = setInterval(() => {
      if (AppState.currentState === 'active') refreshPendingAssignments();
    }, POLL_MS);

    return () => {
      getSupabase().removeChannel(channel);
      clearInterval(poll);
    };
  }, [isTechnician, user?.id, userPhone, refreshPendingAssignments]);

  useEffect(() => {
    if (!isCashier || !userPhone) {
      setCheckoutQueueCount(0);
      return;
    }

    refreshCheckoutQueue();

    const channel = getSupabase()
      .channel('sidebar-cashier-checkout')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refreshCheckoutQueue();
      })
      .subscribe();

    const poll = setInterval(() => {
      if (AppState.currentState === 'active') refreshCheckoutQueue();
    }, POLL_MS);

    return () => {
      getSupabase().removeChannel(channel);
      clearInterval(poll);
    };
  }, [isCashier, userPhone, refreshCheckoutQueue]);

  const getBadgeCount = useCallback(
    (navItemId: string) => {
      if (isTechnician && navItemId === 'home') return pendingAssignments;
      if (isCashier && navItemId === 'checkout') return checkoutQueueCount;
      return 0;
    },
    [isTechnician, isCashier, pendingAssignments, checkoutQueueCount],
  );

  return { pendingAssignments, checkoutQueueCount, getBadgeCount };
}
