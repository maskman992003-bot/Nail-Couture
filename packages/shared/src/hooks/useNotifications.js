import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabase.js';
import { alertNewNotifications, ensureLocalNotificationPermission } from '../utils/localNotificationAlert.js';

const POLL_MS = 15000;
const BELL_RING_MS = 2000;

/**
 * @typedef {Object} AppNotification
 * @property {string} id
 * @property {string} title
 * @property {string} [body]
 * @property {string} [message]
 * @property {boolean} is_read
 * @property {string} [type]
 * @property {string} created_at
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * @param {Object} options
 * @param {string | undefined | null} options.userPhone
 * @param {string | undefined | null} options.userId
 * @param {boolean} [options.enabled=true]
 * @param {() => boolean} [options.getIsActive]
 * @param {boolean} [options.localAlerts=false]
 */
export function useNotifications({ userPhone, userId, enabled = true, getIsActive, localAlerts = false }) {
  const [notifications, setNotifications] = useState(/** @type {AppNotification[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [bellRing, setBellRing] = useState(false);
  const [bellRingKey, setBellRingKey] = useState(0);
  const channelRef = useRef(null);
  const seenNotificationIdsRef = useRef(/** @type {Set<string>} */ (new Set()));
  const bellRingTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const triggerBellRing = useCallback(() => {
    setBellRing(true);
    setBellRingKey((k) => k + 1);
    if (bellRingTimerRef.current) clearTimeout(bellRingTimerRef.current);
    bellRingTimerRef.current = setTimeout(() => {
      setBellRing(false);
      bellRingTimerRef.current = null;
    }, BELL_RING_MS);
  }, []);

  const isActive = useCallback(() => {
    if (getIsActive) return getIsActive();
    if (typeof document !== 'undefined') {
      return document.visibilityState === 'visible';
    }
    return true;
  }, [getIsActive]);

  const fetchNotifications = useCallback(async () => {
    if (!userPhone) return;
    setLoading(true);
    try {
      const { data, error } = await getSupabase().rpc('get_my_notifications', {
        p_phone: userPhone,
        p_limit: 50,
        p_unread_only: false,
      });
      if (error) {
        console.error('Failed to load notifications:', error.message || error);
      } else {
        const rows = data || [];
        if (localAlerts) {
          const { seenIds, newUnreadCount } = alertNewNotifications(
            rows,
            seenNotificationIdsRef.current,
          );
          seenNotificationIdsRef.current = seenIds;
          if (newUnreadCount > 0) triggerBellRing();
        }
        setNotifications(rows);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
    setLoading(false);
  }, [userPhone, localAlerts, triggerBellRing]);

  useEffect(() => {
    if (!enabled || !userPhone) {
      setNotifications([]);
      seenNotificationIdsRef.current = new Set();
      setBellRing(false);
      return undefined;
    }

    if (localAlerts) {
      ensureLocalNotificationPermission().catch(() => {});
    }

    fetchNotifications();

    const interval = setInterval(() => {
      if (isActive()) fetchNotifications();
    }, POLL_MS);

    let visibilityHandler;
    if (typeof document !== 'undefined') {
      visibilityHandler = () => {
        if (document.visibilityState === 'visible') fetchNotifications();
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    return () => {
      clearInterval(interval);
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
      if (bellRingTimerRef.current) clearTimeout(bellRingTimerRef.current);
    };
  }, [enabled, userPhone, localAlerts, fetchNotifications, isActive]);

  useEffect(() => {
    if (!enabled || !userId || !userPhone) return undefined;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, userId, userPhone, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = useCallback(async () => {
    if (!userPhone || unreadCount === 0) return;
    try {
      await getSupabase().rpc('mark_my_notifications_read', { p_phone: userPhone });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      /* ignore */
    }
  }, [userPhone, unreadCount]);

  const markOneRead = useCallback(
    async (id) => {
      if (!userPhone) return;
      try {
        await getSupabase().rpc('mark_notification_read', {
          p_phone: userPhone,
          p_notif_id: id,
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        );
      } catch {
        /* ignore */
      }
    },
    [userPhone],
  );

  const deleteOne = useCallback(
    async (id) => {
      if (!userPhone) return;
      const previous = notifications;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      seenNotificationIdsRef.current.delete(id);
      try {
        const { error } = await getSupabase().rpc('delete_notification', {
          p_phone: userPhone,
          p_notif_id: id,
        });
        if (error) {
          console.error('Failed to delete notification:', error.message || error);
          setNotifications(previous);
        }
      } catch (err) {
        console.error('Failed to delete notification:', err);
        setNotifications(previous);
      }
    },
    [userPhone, notifications],
  );

  const deleteAll = useCallback(async () => {
    if (!userPhone || notifications.length === 0) return;
    const previous = notifications;
    setNotifications([]);
    seenNotificationIdsRef.current = new Set();
    try {
      const { error } = await getSupabase().rpc('delete_all_my_notifications', { p_phone: userPhone });
      if (error) {
        console.error('Failed to clear notifications:', error.message || error);
        setNotifications(previous);
        throw error;
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      setNotifications(previous);
      throw err;
    }
  }, [userPhone, notifications]);

  return {
    notifications,
    loading,
    unreadCount,
    bellRing,
    bellRingKey,
    fetchNotifications,
    markAllRead,
    markOneRead,
    deleteOne,
    deleteAll,
  };
}

export default useNotifications;
