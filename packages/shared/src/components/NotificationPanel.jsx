import { BELL_PATH } from '../icons/paths.js';

function formatTimestamp(createdAt) {
  const date = new Date(createdAt);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   notifications: Array<{ id: string, title: string, body?: string, message?: string, is_read: boolean, created_at: string, type?: string }>,
 *   unreadCount: number,
 *   theme?: 'dark' | 'light',
 *   onMarkAllRead: () => void,
 *   onMarkOneRead: (id: string) => void,
 *   onDeleteOne: (id: string) => void,
 *   onDeleteAll: () => void,
 *   onNotificationPress?: (notif: object) => void,
 * }} props
 */
export default function NotificationPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  theme = 'dark',
  onMarkAllRead,
  onMarkOneRead,
  onDeleteOne,
  onDeleteAll,
  onNotificationPress,
}) {
  if (!open) return null;

  const bg = theme === 'dark' ? '#111' : '#fff';
  const border = theme === 'dark' ? 'rgba(197,160,89,0.15)' : 'rgba(197,160,89,0.2)';
  const textMuted = theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40';
  const textPrimary = theme === 'dark' ? 'text-offwhite' : 'text-charcoal';
  const textSecondary = theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60';

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    if (window.confirm('Clear all notifications? This cannot be undone.')) {
      onDeleteAll();
    }
  };

  const handleDeleteOne = (e, id) => {
    e.stopPropagation();
    onDeleteOne(id);
  };

  const handleRowClick = (notif) => {
    if (!notif.is_read) onMarkOneRead(notif.id);
    onNotificationPress?.(notif);
  };

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto shadow-2xl"
        style={{
          backgroundColor: bg,
          borderLeft: `1px solid ${theme === 'dark' ? 'rgba(197,160,89,0.2)' : 'rgba(197,160,89,0.3)'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between p-6 border-b"
          style={{ borderColor: border, backgroundColor: bg }}
        >
          <div>
            <h2 className="font-heading text-2xl text-gold">Notifications</h2>
            {unreadCount > 0 ? (
              <p className={`text-xs mt-1 ${textMuted}`}>{unreadCount} unread</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="px-3 py-1.5 text-xs text-gold border border-gold/40 rounded-xl hover:bg-gold/10 transition-colors"
              >
                Mark all read
              </button>
            ) : null}
            {notifications.length > 0 ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 text-xs text-red-400/80 border border-red-400/30 rounded-xl hover:bg-red-500/10 transition-colors"
              >
                Clear all
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-xl ${textMuted}`}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className={`w-10 h-10 mx-auto mb-3 ${theme === 'dark' ? 'text-offwhite/20' : 'text-charcoal/20'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={BELL_PATH} />
              </svg>
              <p className={`text-sm ${textMuted}`}>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleRowClick(notif)}
                className="rounded-xl p-4 border transition-all cursor-pointer relative group"
                style={{
                  backgroundColor: theme === 'dark'
                    ? (notif.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(197,160,89,0.06)')
                    : (notif.is_read ? 'rgba(197,160,89,0.03)' : 'rgba(197,160,89,0.1)'),
                  borderColor: theme === 'dark'
                    ? (notif.is_read ? 'rgba(255,255,255,0.06)' : 'rgba(197,160,89,0.3)')
                    : (notif.is_read ? 'rgba(197,160,89,0.15)' : 'rgba(197,160,89,0.4)'),
                }}
              >
                <button
                  type="button"
                  onClick={(e) => handleDeleteOne(e, notif.id)}
                  className={`absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg opacity-60 hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all ${textMuted}`}
                  aria-label="Delete notification"
                >
                  &times;
                </button>
                <div className="flex items-start gap-3 pr-6">
                  {!notif.is_read ? (
                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-gold" />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <div className={`font-heading text-sm mb-1 ${textPrimary}`}>{notif.title}</div>
                    {(notif.body || notif.message) ? (
                      <div className={`text-xs mb-2 ${textSecondary}`}>{notif.body || notif.message}</div>
                    ) : null}
                    <div className={`text-[10px] ${theme === 'dark' ? 'text-offwhite/30' : 'text-charcoal/30'}`}>
                      {formatTimestamp(notif.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
