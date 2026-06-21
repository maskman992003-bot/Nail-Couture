export const OPEN_NOTIFICATIONS_EVENT = 'nail-couture:open-notifications';

export function openNotificationPanel() {
  window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATIONS_EVENT));
}
