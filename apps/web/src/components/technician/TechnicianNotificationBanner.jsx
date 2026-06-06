import { useState } from 'react';
import { requestNotificationPermission } from '@nail-couture/shared/utils/technicianQueue';

export default function TechnicianNotificationBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('tech_notif_banner_dismissed') === '1'
  );
  const [permission, setPermission] = useState(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  );

  if (dismissed || permission !== 'default') return null;

  const handleEnable = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      sessionStorage.setItem('tech_notif_banner_dismissed', '1');
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('tech_notif_banner_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gold/10 border border-gold/30 rounded-xl">
      <div className="min-w-0">
        <p className="text-primary text-sm font-medium">Enable assignment alerts</p>
        <p className="text-secondary text-xs mt-0.5">
          Get a desktop notification when the lobby assigns you a new client.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          className="px-4 py-2 min-h-[44px] bg-gold text-charcoal text-sm font-medium rounded-lg hover:bg-gold/90"
        >
          Enable
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-2 text-secondary text-sm hover:text-primary"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
