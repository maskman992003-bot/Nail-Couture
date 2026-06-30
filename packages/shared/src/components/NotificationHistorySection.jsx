import { useState } from 'react';
import { Link } from 'react-router-dom';

function formatTimestamp(createdAt) {
  const date = new Date(createdAt);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/**
 * @param {{
 *   notifications: Array<{ id: string, title: string, body?: string, message?: string, is_read: boolean, created_at: string, type?: string }>,
 *   theme?: 'dark' | 'light',
 *   panelClass?: string,
 *   cardClass?: (theme: string) => string,
 *   onMarkOneRead: (id: string) => void,
 *   onDeleteOne: (id: string) => void,
 *   onDeleteAll: () => void,
 *   onNotificationPress?: (notif: object) => void,
 *   preferencesLink?: string,
 *   showPreferencesLink?: boolean,
 * }} props
 */
export default function NotificationHistorySection({
  notifications,
  theme = 'dark',
  panelClass = '',
  cardClass,
  onMarkOneRead,
  onDeleteOne,
  onDeleteAll,
  onNotificationPress,
  preferencesLink = '',
  showPreferencesLink = true,
}) {
  const textPrimary = theme === 'dark' ? 'text-offwhite' : 'text-charcoal';
  const textSecondary = theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60';
  const textMuted = theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40';
  const defaultCard = theme === 'dark'
    ? 'p-4 rounded-xl border border-white/5 bg-white/[0.02]'
    : 'p-4 rounded-xl border border-charcoal/5 bg-charcoal/[0.02]';
  const card = cardClass ? cardClass(theme) : defaultCard;

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    setShowClearConfirm(true);
  };

  const handleConfirmClearAll = () => {
    onDeleteAll();
    setShowClearConfirm(false);
  };

  const handleRowClick = (notif) => {
    if (!notif.is_read) onMarkOneRead(notif.id);
    onNotificationPress?.(notif);
  };

  return (
    <div className={panelClass}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className={`${textPrimary} font-medium`}>Notifications</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {showPreferencesLink && preferencesLink ? (
            <Link to={preferencesLink} className="text-gold text-xs font-medium hover:underline">
              Preferences →
            </Link>
          ) : null}
          {notifications.length > 0 ? (
            showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className={`text-xs ${textSecondary}`}>Clear all?</span>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className={`px-2 py-1 text-xs border rounded-lg transition-colors ${theme === 'dark' ? 'text-offwhite/70 border-white/10 hover:bg-white/5' : 'text-charcoal/70 border-charcoal/10 hover:bg-charcoal/5'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  className="px-2 py-1 text-xs text-red-400/80 border border-red-400/30 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  Confirm
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 text-xs text-red-400/80 border border-red-400/30 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Clear all
              </button>
            )
          ) : null}
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className={`text-sm ${textMuted} text-center py-6`}>No notifications yet</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`${card} relative cursor-pointer transition-all ${!notif.is_read ? 'border-gold/30' : ''}`}
              onClick={() => handleRowClick(notif)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteOne(notif.id);
                }}
                className={`absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 hover:text-red-400 ${textMuted}`}
                aria-label="Delete notification"
              >
                &times;
              </button>
              <div className="flex items-start gap-2 pr-8">
                {!notif.is_read ? (
                  <span className="w-2 h-2 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-gold">{notif.title}</div>
                  {(notif.body || notif.message) ? (
                    <div className={`${textSecondary} text-xs mt-1`}>{notif.body || notif.message}</div>
                  ) : null}
                  <div className={`${textMuted} text-[10px] mt-2`}>{formatTimestamp(notif.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
