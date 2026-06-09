import { featureFlags } from '../constants/featureFlags.js';
import { playNotificationAlertSound } from './notificationAlertSound.js';

/**
 * Show a local/system alert when a new in-app notification arrives.
 * Works without remote push webhooks (Phase 2 bridge).
 *
 * @param {{ title: string, body?: string, id?: string }} notification
 */
export function showLocalNotificationAlert(notification) {
  if (!featureFlags.global.notifications || !notification?.title) return;

  const body = notification.body || notification.message || '';
  const tag = notification.id ? `nc-${notification.id}` : undefined;

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
      try {
        new Notification(notification.title, { body, tag });
      } catch {
        /* ignore */
      }
    } else {
      playNotificationAlertSound();
    }
    return;
  }

  playNotificationAlertSound();

  // React Native — loaded dynamically so web bundle stays clean
  if (typeof globalThis !== 'undefined' && globalThis.__NC_SHOW_LOCAL_NOTIFICATION__) {
    globalThis.__NC_SHOW_LOCAL_NOTIFICATION__(notification);
  }
}

/**
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function requestLocalNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Prompt once per browser session after login.
 */
export async function ensureLocalNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  if (sessionStorage.getItem('nc_notif_perm_asked') === '1') return;
  sessionStorage.setItem('nc_notif_perm_asked', '1');
  await requestLocalNotificationPermission();
}

/**
 * Detect newly arrived unread notifications and fire local alerts.
 *
 * @param {Array<{ id: string, is_read: boolean, title: string, body?: string, message?: string }>} next
 * @param {Set<string>} seenIds
 * @returns {{ seenIds: Set<string>, newUnreadCount: number }}
 */
export function alertNewNotifications(next, seenIds) {
  if (!Array.isArray(next)) return { seenIds, newUnreadCount: 0 };

  let newUnreadCount = 0;

  for (const notif of next) {
    if (!notif?.id || notif.is_read || seenIds.has(notif.id)) continue;
    showLocalNotificationAlert(notif);
    seenIds.add(notif.id);
    newUnreadCount += 1;
  }

  for (const id of [...seenIds]) {
    if (!next.some((n) => n.id === id)) {
      seenIds.delete(id);
    }
  }

  return { seenIds, newUnreadCount };
}
