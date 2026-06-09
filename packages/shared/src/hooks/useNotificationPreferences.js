import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(true);

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

  const saveMutedTypes = useCallback(
    async (nextMuted) => {
      if (!userPhone) return false;

      setSaving(true);
      setError('');
      try {
        const { data, error: rpcError } = await getSupabase().rpc('update_notification_preferences', {
          p_phone: userPhone,
          p_muted_types: nextMuted,
        });
        if (rpcError) throw rpcError;
        const list = data?.muted_types;
        setMutedTypes(Array.isArray(list) ? list : nextMuted);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save preferences');
        await fetchPreferences();
        return false;
      } finally {
        setSaving(false);
      }
    },
    [userPhone, fetchPreferences],
  );

  const toggleType = useCallback(
    async (typeId, nextEnabled) => {
      const nextMuted = applyNotificationTypeToggle(typeId, mutedTypes, nextEnabled);
      await saveMutedTypes(nextMuted);
    },
    [mutedTypes, saveMutedTypes],
  );

  const toggleGroup = useCallback(
    async (groupId, nextEnabled) => {
      const group = groups.find((item) => item.id === groupId);
      if (!group) return;

      const nextMuted = applyNotificationGroupToggle(group, mutedTypes, nextEnabled);
      await saveMutedTypes(nextMuted);
    },
    [groups, mutedTypes, saveMutedTypes],
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
    saving,
    error,
    groups: groupStates,
    toggleType,
    toggleGroup,
    refresh: fetchPreferences,
  };
}

export default useNotificationPreferences;
