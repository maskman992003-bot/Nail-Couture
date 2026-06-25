import { useCallback, useEffect, useState } from 'react';
import { featureFlags } from '../constants/featureFlags.js';
import {
  canManageMysteryGift,
  finalizeMysteryGiftAwards,
  getMysteryGiftLeaderboard,
  getMysteryGiftStatus,
  setMysteryGiftOpening,
  shouldShowMysteryGiftTeaser,
} from '../utils/mysteryGift.js';
import { getSupabaseErrorMessage } from '../utils/supabaseErrors.js';

/**
 * Customer-facing Mystery Gift experience (hero, slide-in, detail modal).
 * @param {{ enabled?: boolean }} [options]
 */
export function useMysteryGiftTeaser(options = {}) {
  const enabled = options.enabled ?? featureFlags.customer.mysteryGift === true;
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setStatus(null);
      return;
    }

    setLoading(true);
    try {
      const next = await getMysteryGiftStatus();
      setStatus(next);
      setError('');
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to load Mystery Gift status.'));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const showHero = enabled && shouldShowMysteryGiftTeaser(status);
  const showSlideIn = showHero && !sessionDismissed && !detailOpen;

  const dismissSlideIn = useCallback(() => {
    setSessionDismissed(true);
  }, []);

  const openDetail = useCallback(() => {
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setSessionDismissed(true);
  }, []);

  return {
    enabled,
    loading,
    error,
    status,
    showTeaser: showHero,
    showHero,
    showSlideIn,
    detailOpen,
    dismissSlideIn,
    openDetail,
    closeDetail,
    refresh,
  };
}

/**
 * Owner / super_admin Mystery Gift management.
 * @param {string | null | undefined} callerPhone
 * @param {string | null | undefined} role
 */
export function useMysteryGiftAdmin(callerPhone, role) {
  const enabled = Boolean(
    callerPhone
    && canManageMysteryGift(role)
    && featureFlags.staff.mysteryGiftAdmin === true,
  );

  const [status, setStatus] = useState(null);
  const [leaderboard, setLeaderboard] = useState({ entries: [] });
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) {
      setStatus(null);
      setLeaderboard({ entries: [] });
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [nextStatus, nextLeaderboard] = await Promise.all([
        getMysteryGiftStatus(),
        getMysteryGiftLeaderboard(callerPhone),
      ]);
      setStatus(nextStatus);
      setLeaderboard(nextLeaderboard);
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to load Mystery Gift campaign.'));
    } finally {
      setLoading(false);
    }
  }, [callerPhone, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startTracking = useCallback(async (openingAt) => {
    if (!callerPhone) return { success: false };
    setActing(true);
    setError('');
    setMessage('');
    try {
      await setMysteryGiftOpening(callerPhone, openingAt);
      await refresh();
      setMessage('Mystery Gift tracking has started.');
      return { success: true };
    } catch (err) {
      const text = getSupabaseErrorMessage(err, 'Failed to start Mystery Gift tracking.');
      setError(text);
      return { success: false, error: text };
    } finally {
      setActing(false);
    }
  }, [callerPhone, refresh]);

  const finalizeAwards = useCallback(async () => {
    if (!callerPhone) return { success: false };
    setActing(true);
    setError('');
    setMessage('');
    try {
      const result = await finalizeMysteryGiftAwards(callerPhone);
      await refresh();
      setMessage(
        result?.already_finalized
          ? 'Mystery Gift awards were already issued.'
          : `Issued ${result?.winners_count ?? 0} Mystery Gift cards.`,
      );
      return { success: true, result };
    } catch (err) {
      const text = getSupabaseErrorMessage(err, 'Failed to finalize Mystery Gift awards.');
      setError(text);
      return { success: false, error: text };
    } finally {
      setActing(false);
    }
  }, [callerPhone, refresh]);

  return {
    enabled,
    loading,
    acting,
    error,
    message,
    status,
    leaderboard,
    entries: leaderboard?.entries ?? [],
    refresh,
    startTracking,
    finalizeAwards,
  };
}
