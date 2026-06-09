import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { featureFlags } from '../constants/featureFlags.js';
import {
  applyNotificationGroupToggle,
  applyNotificationTypeToggle,
  buildGroupTypeItems,
  getGroupEnabledSummary,
  getNotificationGroupsForRole,
} from '../constants/notificationPreferences.js';
import { getSupabase } from '../lib/supabase.js';

/**
 * @param {string | undefined | null} userPhone
 * @param {string | undefined | null} role
 */
export function useNotificationPreferences(userPhone, role) {
  const groups = useMemo(() => getNotificationGroupsForRole(role), [role]);
  const [mutedTypes, setMutedTypes] = useState(/** @type {string[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(true);
  const mutedTypesRef = useRef(mutedTypes);
  const saveVersionRef = useRef(0);

  useEffect(() => {
    mutedTypesRef.current = mutedTypes;
  }, [mutedTypes]);

  const enabled = Boolean(
    featureFlags.global.notificationPreferences && userPhone && groups.length > 0,
  );

  const fetchPreferences = useCallback(async () => {
    if (!enabled || !userPhone) {
      setMutedTypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await getSupabase().rpc('get_notification_preferences', {
        p_phone: userPhone,
      });
      if (rpcError) {
        if (rpcError.message?.includes('get_notification_preferences')) {
          setAvailable(false);
        } else {
          setError(rpcError.message);
        }
        setMutedTypes([]);
      } else {
        const list = data?.muted_types;
        setMutedTypes(Array.isArray(list) ? list : []);
        setAvailable(true);
      }
    } catch {
      setError('Could not load notification preferences');
    }
    setLoading(false);
  }, [enabled, userPhone]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const persistMutedTypes = useCallback(
    async (nextMuted, previousMuted) => {
      if (!userPhone) return;

      const saveVersion = ++saveVersionRef.current;
      setError('');

      try {
        const { data, error: rpcError } = await getSupabase().rpc('update_notification_preferences', {
          p_phone: userPhone,
          p_muted_types: nextMuted,
        });
        if (rpcError) throw rpcError;

        const list = data?.muted_types;
        const saved = Array.isArray(list) ? list : nextMuted;
        if (saveVersion === saveVersionRef.current) {
          setMutedTypes(saved);
          mutedTypesRef.current = saved;
        }
      } catch (err) {
        if (saveVersion === saveVersionRef.current) {
          setMutedTypes(previousMuted);
          mutedTypesRef.current = previousMuted;
          setError(err instanceof Error ? err.message : 'Failed to save preferences');
        }
      }
    },
    [userPhone],
  );

  const toggleType = useCallback(
    (typeId, nextEnabled) => {
      const previousMuted = mutedTypesRef.current;
      const nextMuted = applyNotificationTypeToggle(typeId, previousMuted, nextEnabled);
      setMutedTypes(nextMuted);
      mutedTypesRef.current = nextMuted;
      void persistMutedTypes(nextMuted, previousMuted);
    },
    [persistMutedTypes],
  );

  const toggleGroup = useCallback(
    (groupId, nextEnabled) => {
      const group = groups.find((item) => item.id === groupId);
      if (!group) return;

      const previousMuted = mutedTypesRef.current;
      const nextMuted = applyNotificationGroupToggle(group, previousMuted, nextEnabled);
      setMutedTypes(nextMuted);
      mutedTypesRef.current = nextMuted;
      void persistMutedTypes(nextMuted, previousMuted);
    },
    [groups, persistMutedTypes],
  );

  const groupStates = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        ...getGroupEnabledSummary(group, mutedTypes),
        types: buildGroupTypeItems(group, mutedTypes),
      })),
    [groups, mutedTypes],
  );

  return {
    enabled,
    available,
    loading,
    error,
    groups: groupStates,
    toggleType,
    toggleGroup,
    refresh: fetchPreferences,
  };
}

export default useNotificationPreferences;
