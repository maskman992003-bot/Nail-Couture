import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getSupabase } from '@nail-couture/shared/lib/supabase.js';
import { featureFlags } from '@nail-couture/shared/constants/featureFlags.js';
import { useAuth } from '../contexts/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Nail Couture',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('Expo projectId missing — push tokens require EAS projectId in app.json');
    return null;
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenResult.data;
}

export function PushNotificationRegistrar() {
  const { user } = useAuth();
  const registeredToken = useRef<string | null>(null);
  const registeredPhone = useRef<string | null>(null);

  useEffect(() => {
    if (!featureFlags.global.pushNotifications) return undefined;

    let cancelled = false;

    async function syncToken() {
      if (!user?.phone) {
        return;
      }

      const token = await getExpoPushToken();
      if (cancelled || !token) return;

      registeredToken.current = token;
      registeredPhone.current = user.phone;

      try {
        await getSupabase().rpc('register_push_token', {
          p_phone: user.phone,
          p_expo_push_token: token,
          p_platform: Platform.OS,
          p_device_name: Device.modelName ?? undefined,
        });
      } catch (err) {
        console.warn('Failed to register push token', err);
      }
    }

    syncToken();

    return () => {
      cancelled = true;
    };
  }, [user?.phone]);

  useEffect(() => {
    if (user?.phone) return undefined;

    const token = registeredToken.current;
    const phone = registeredPhone.current;
    if (!token || !phone) return undefined;

    getSupabase()
      .rpc('unregister_push_token', {
        p_phone: phone,
        p_expo_push_token: token,
      })
      .catch(() => {});

    registeredToken.current = null;
    registeredPhone.current = null;

    return undefined;
  }, [user?.phone]);

  return null;
}
