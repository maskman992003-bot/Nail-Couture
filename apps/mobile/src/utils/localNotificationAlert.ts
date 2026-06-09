import * as Notifications from 'expo-notifications';
import { featureFlags } from '@nail-couture/shared/constants/featureFlags.js';

type LocalNotification = {
  id?: string;
  title: string;
  body?: string;
  message?: string;
};

export async function showMobileLocalNotification(notification: LocalNotification) {
  if (!featureFlags.global.notifications) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body || notification.message || '',
      data: { notificationId: notification.id },
    },
    trigger: null,
  });
}

// Bridge for shared localNotificationAlert.js (avoids RN imports in web bundle)
declare global {
  // eslint-disable-next-line no-var
  var __NC_SHOW_LOCAL_NOTIFICATION__: ((n: LocalNotification) => void) | undefined;
}

globalThis.__NC_SHOW_LOCAL_NOTIFICATION__ = (notification) => {
  showMobileLocalNotification(notification).catch(() => {});
};
