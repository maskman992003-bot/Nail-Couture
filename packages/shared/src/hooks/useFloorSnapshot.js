import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCallerPhone, fetchFloorSnapshot, fetchFloorTechnicians } from '../utils/technicianQueue';

export function useFloorSnapshot(callerPhoneFallback) {
  const [floorAppointments, setFloorAppointments] = useState([]);
  const [floorTechnicians, setFloorTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refetch = useCallback(async (silent = false) => {
    const phone = getCallerPhone(callerPhoneFallback);
    if (!phone) {
      setLoading(false);
      return;
    }
    if (!silent) setRefreshing(true);
    try {
      const [floorResult, techResult] = await Promise.allSettled([
        fetchFloorSnapshot(phone),
        fetchFloorTechnicians(),
      ]);
      if (floorResult.status === 'fulfilled') {
        setFloorAppointments(floorResult.value);
      }
      if (techResult.status === 'fulfilled') {
        setFloorTechnicians(techResult.value);
      }
      if (floorResult.status === 'rejected') {
        console.error('Error fetching floor snapshot:', floorResult.reason);
      }
    } catch (err) {
      console.error('Error fetching floor snapshot:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [callerPhoneFallback]);

  useEffect(() => {
    refetch(true);

    const channel = supabase
      .channel('floor-snapshot')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        refetch(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchFloorTechnicians().then(setFloorTechnicians).catch(() => {});
      })
      .subscribe();

    const poll = setInterval(() => refetch(true), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [refetch]);

  return { floorAppointments, floorTechnicians, loading, refreshing, refetch };
}
