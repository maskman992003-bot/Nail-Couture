import { AppState } from 'react-native';
import { useCallback, useEffect } from 'react';
import { useNotifications as useSharedNotifications } from '@nail-couture/shared/hooks/useNotifications.js';
import { featureFlags } from '@nail-couture/shared/constants/featureFlags.js';
import { useAuth } from '../contexts/AuthContext';

export type AppNotification = {
  id: string;
  title: string;
  body?: string;
  message?: string;
  is_read: boolean;
  type?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export function useNotifications(_enabled = true) {
  const { user } = useAuth();

  const getIsActive = useCallback(
    () => AppState.currentState === 'active',
    [],
  );

  const result = useSharedNotifications({
    userPhone: user?.phone,
    userId: user?.id,
    enabled: Boolean(user?.phone),
    getIsActive,
    localAlerts: featureFlags.global.notifications,
  });

  useEffect(() => {
    if (!user?.phone) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') result.fetchNotifications();
    });
    return () => subscription.remove();
  }, [user?.phone, result.fetchNotifications]);

  return result;
}
