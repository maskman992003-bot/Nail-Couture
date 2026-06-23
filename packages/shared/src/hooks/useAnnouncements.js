import { useCallback, useEffect, useRef, useState } from 'react';
import { featureFlags } from '../constants/featureFlags.js';
import {
  drainAnnouncementFanout,
  estimateAnnouncementRecipients,
  listAnnouncementStaffCandidates,
  listSalonAnnouncements,
  resumePendingAnnouncementFanouts,
  sendSalonAnnouncement,
} from '../utils/announcements.js';
import { getSupabaseErrorMessage } from '../utils/supabaseErrors.js';

const HISTORY_FETCH_LIMIT = 500;
const ESTIMATE_DEBOUNCE_MS = 300;

/**
 * @param {string | undefined | null} userPhone
 * @param {string | undefined | null} role
 */
export function useAnnouncements(userPhone, role) {
  const enabled = Boolean(
    userPhone
    && ['super_admin', 'owner', 'partner'].includes(role ?? '')
    && (role === 'super_admin' || featureFlags.staff.announcements === true),
  );

  const [staffCandidates, setStaffCandidates] = useState(/** @type {Array<{ id: string, full_name: string, role: string }>} */ ([]));
  const [staffLoading, setStaffLoading] = useState(false);
  const [estimate, setEstimate] = useState({ total: 0, customerCount: 0, staffCount: 0 });
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [announcements, setAnnouncements] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);
  const [error, setError] = useState('');
  const estimateTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const resumeRanRef = useRef(false);

  const loadStaffCandidates = useCallback(async () => {
    if (!enabled || !userPhone) return;
    setStaffLoading(true);
    try {
      const data = await listAnnouncementStaffCandidates(userPhone);
      setStaffCandidates(data);
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to load staff list.'));
    } finally {
      setStaffLoading(false);
    }
  }, [enabled, userPhone]);

  const estimateRecipients = useCallback((
    audience,
    staffTargetMode = 'all',
    staffProfileIds = [],
  ) => {
    if (!enabled || !userPhone) return;

    if (estimateTimerRef.current) {
      clearTimeout(estimateTimerRef.current);
    }

    estimateTimerRef.current = setTimeout(async () => {
      setEstimateLoading(true);
      try {
        const counts = await estimateAnnouncementRecipients(
          userPhone,
          audience,
          staffTargetMode,
          staffProfileIds,
        );
        setEstimate(counts);
        setError('');
      } catch (err) {
        setError(getSupabaseErrorMessage(err, 'Failed to estimate recipients.'));
      } finally {
        setEstimateLoading(false);
      }
    }, ESTIMATE_DEBOUNCE_MS);
  }, [enabled, userPhone]);

  const refreshHistory = useCallback(async () => {
    if (!enabled || !userPhone) return;
    setIsLoadingHistory(true);
    try {
      const rows = await listSalonAnnouncements(userPhone, HISTORY_FETCH_LIMIT, 0);
      setAnnouncements(rows);
      setError('');
    } catch (err) {
      setError(getSupabaseErrorMessage(err, 'Failed to load announcement history.'));
    } finally {
      setIsLoadingHistory(false);
    }
  }, [enabled, userPhone]);

  const deliverAnnouncement = useCallback(async (announcementId) => {
    if (!enabled || !userPhone || !announcementId) return null;
    setIsDelivering(true);
    try {
      const result = await drainAnnouncementFanout(userPhone, announcementId);
      setError('');
      return result;
    } catch (err) {
      throw new Error(getSupabaseErrorMessage(err, 'Failed to deliver announcement.'));
    } finally {
      setIsDelivering(false);
    }
  }, [enabled, userPhone]);

  const sendAnnouncement = useCallback(async (params) => {
    const {
      title,
      body,
      audience,
      staffTargetMode = 'all',
      staffProfileIds = [],
      attachments = [],
    } = /** @type {{ title: string, body: string, audience: string, staffTargetMode?: string, staffProfileIds?: string[], attachments?: Array<Record<string, unknown>> }} */ (params);
    if (!enabled || !userPhone) {
      throw new Error('You must be signed in to send announcements.');
    }
    if (isSending) {
      return null;
    }

    setIsSending(true);
    setError('');
    try {
      const result = await sendSalonAnnouncement({
        callerPhone: userPhone,
        title,
        body,
        audience,
        staffTargetMode,
        staffProfileIds,
        attachments,
      });
      if (!result?.id) {
        throw new Error('Announcement was not created. Run sql/052_announcement_attachments.sql in Supabase.');
      }

      let deliveryWarning = '';
      try {
        await deliverAnnouncement(result.id);
      } catch (deliverErr) {
        deliveryWarning = getSupabaseErrorMessage(
          deliverErr,
          'Delivery is still pending and will retry automatically.',
        );
      }

      try {
        await refreshHistory();
      } catch (historyErr) {
        console.warn('Failed to refresh announcement history:', getSupabaseErrorMessage(historyErr));
      }

      setError('');
      return deliveryWarning ? { ...result, deliveryWarning } : result;
    } catch (err) {
      const message = getSupabaseErrorMessage(err, 'Failed to send announcement.');
      setError(message);
      throw new Error(message);
    } finally {
      setIsSending(false);
    }
  }, [enabled, userPhone, isSending, deliverAnnouncement, refreshHistory]);

  useEffect(() => {
    if (!enabled || !userPhone) return undefined;
    loadStaffCandidates();

    (async () => {
      if (!resumeRanRef.current) {
        resumeRanRef.current = true;
        try {
          await resumePendingAnnouncementFanouts(userPhone);
        } catch (err) {
          console.warn('Failed to resume pending announcements:', err);
        }
      }
      await refreshHistory();
    })();

    return () => {
      if (estimateTimerRef.current) {
        clearTimeout(estimateTimerRef.current);
      }
    };
  }, [enabled, userPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    enabled,
    staffCandidates,
    staffLoading,
    estimate,
    estimateLoading,
    estimateRecipients,
    announcements,
    isLoadingHistory,
    refreshHistory,
    hasMore: false,
    loadMore: () => {},
    isSending,
    isDelivering,
    sendAnnouncement,
    deliverAnnouncement,
    error,
    setError,
  };
}
