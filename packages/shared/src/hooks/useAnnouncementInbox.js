import { useCallback, useEffect, useState } from 'react';
import {
  listMyAnnouncements,
  setAnnouncementArchived,
  setAnnouncementSaved,
} from '../utils/announcementInbox.js';
import { getSupabase } from '../lib/supabase.js';

const PAGE_SIZE = 20;

/**
 * @param {string | undefined | null} userPhone
 */
export function useAnnouncementInbox(userPhone) {
  const [filter, setFilter] = useState(/** @type {'all' | 'saved' | 'archived'} */ ('all'));
  const [items, setItems] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPage = useCallback(
    async (nextFilter, nextOffset, append = false) => {
      if (!userPhone) return;
      setLoading(true);
      setError('');
      try {
        const rows = await listMyAnnouncements(userPhone, nextFilter, PAGE_SIZE, nextOffset);
        setItems((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(rows.length === PAGE_SIZE);
        setOffset(nextOffset + rows.length);
      } catch (err) {
        setError(err?.message || 'Failed to load announcements.');
        if (!append) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [userPhone],
  );

  const refresh = useCallback(() => {
    setOffset(0);
    return loadPage(filter, 0, false);
  }, [filter, loadPage]);

  useEffect(() => {
    if (!userPhone) {
      setItems([]);
      return;
    }
    setOffset(0);
    loadPage(filter, 0, false);
  }, [userPhone, filter, loadPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadPage(filter, offset, true);
    }
  }, [loading, hasMore, filter, offset, loadPage]);

  const changeFilter = useCallback((nextFilter) => {
    setFilter(nextFilter);
  }, []);

  const toggleSaved = useCallback(
    async (announcementId, currentlySaved) => {
      if (!userPhone) return;
      const nextSaved = !currentlySaved;
      try {
        await setAnnouncementSaved(userPhone, announcementId, nextSaved);
        setItems((prev) =>
          prev
            .map((item) =>
              item.announcement_id === announcementId
                ? { ...item, is_saved: nextSaved }
                : item,
            )
            .filter((item) => {
              if (filter === 'saved' && !nextSaved) return false;
              return true;
            }),
        );
      } catch (err) {
        setError(err?.message || 'Failed to update saved state.');
      }
    },
    [userPhone, filter],
  );

  const toggleArchived = useCallback(
    async (announcementId, currentlyArchived) => {
      if (!userPhone) return;
      const nextArchived = !currentlyArchived;
      try {
        await setAnnouncementArchived(userPhone, announcementId, nextArchived);
        setItems((prev) =>
          prev.filter((item) => {
            if (item.announcement_id !== announcementId) return true;
            if (filter === 'archived') return nextArchived;
            if (filter !== 'archived' && nextArchived) return false;
            return true;
          }),
        );
      } catch (err) {
        setError(err?.message || 'Failed to update archive state.');
      }
    },
    [userPhone, filter],
  );

  const markNotificationRead = useCallback(
    async (notificationId) => {
      if (!userPhone || !notificationId) return;
      try {
        await getSupabase().rpc('mark_notification_read', {
          p_phone: userPhone,
          p_notif_id: notificationId,
        });
        setItems((prev) =>
          prev.map((item) =>
            item.notification_id === notificationId ? { ...item, is_read: true } : item,
          ),
        );
      } catch {
        /* ignore */
      }
    },
    [userPhone],
  );

  return {
    filter,
    items,
    loading,
    error,
    hasMore,
    setError,
    changeFilter,
    loadMore,
    refresh,
    toggleSaved,
    toggleArchived,
    markNotificationRead,
  };
}
