import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { useAuth } from '../contexts/AuthContext';

export type AppNotification = {
  id: string;
  title: string;
  body?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
};

const POLL_MS = 15000;

export function useNotifications(enabled: boolean) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const userPhone = user?.phone;

  const fetchNotifications = useCallback(async () => {
    if (!userPhone) return;
    setLoading(true);
    try {
      const { data, error } = await getSupabase().rpc('get_my_notifications', { p_phone: userPhone });
      if (!error) setNotifications((data as AppNotification[]) || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [userPhone]);

  useEffect(() => {
    if (!enabled || !userPhone) return;

    fetchNotifications();

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') fetchNotifications();
    }, POLL_MS);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchNotifications();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [enabled, userPhone, fetchNotifications]);

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
    async (id: string) => {
      if (!userPhone) return;
      try {
        await getSupabase().rpc('mark_notification_read', { p_phone: userPhone, p_notif_id: id });
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      } catch {
        /* ignore */
      }
    },
    [userPhone],
  );

  return { notifications, loading, unreadCount, fetchNotifications, markAllRead, markOneRead };
}
