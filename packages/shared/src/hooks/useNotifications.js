import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabase.js';
import { alertNewNotifications } from '../utils/localNotificationAlert.js';

const POLL_MS = 15000;

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
  const channelRef = useRef(null);
  const seenNotificationIdsRef = useRef(/** @type {Set<string>} */ (new Set()));

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
      if (!error) {
        const rows = data || [];
        if (localAlerts) {
          seenNotificationIdsRef.current = alertNewNotifications(rows, seenNotificationIdsRef.current);
        }
        setNotifications(rows);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [userPhone, localAlerts]);

  useEffect(() => {
    if (!enabled || !userPhone) {
      setNotifications([]);
      seenNotificationIdsRef.current = new Set();
      return undefined;
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
    };
  }, [enabled, userPhone, fetchNotifications, isActive]);

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

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAllRead,
    markOneRead,
  };
}

export default useNotifications;
