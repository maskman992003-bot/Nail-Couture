import { useEffect, useState } from 'react';
import { BELL_PATH } from '../icons/paths.js';

function formatTimestamp(createdAt) {
  const date = new Date(createdAt);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function stopEvent(e) {
  e.stopPropagation();
}

/**
 * Mobile WebViews (especially Android flutter_inappwebview) can miss clicks on
 * buttons nested inside overflow + position:sticky. Run the handler from pointerup.
 */
function handleTap(handler) {
  return (e) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowClearConfirm(false);
      setIsClearing(false);
    }
  }, [open]);

  if (!open) return null;

  const bg = theme === 'dark' ? '#111' : '#fff';
  const border = theme === 'dark' ? 'rgba(197,160,89,0.15)' : 'rgba(197,160,89,0.2)';
  const textMuted = theme === 'dark' ? 'text-offwhite/40' : 'text-charcoal/40';
  const textPrimary = theme === 'dark' ? 'text-offwhite' : 'text-charcoal';
  const textSecondary = theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60';
  const cancelBtnClass = `flex-1 px-3 py-2.5 text-xs font-medium border rounded-xl transition-colors text-center cursor-pointer select-none ${theme === 'dark' ? 'text-offwhite/70 border-white/10 active:bg-white/5' : 'text-charcoal/70 border-charcoal/10 active:bg-charcoal/5'}`;
  const dangerBtnClass = 'flex-1 px-3 py-2.5 text-xs font-medium text-red-400/90 border border-red-400/30 rounded-xl active:bg-red-500/10 transition-colors text-center cursor-pointer select-none';

  const handleClearAll = () => {
    if (notifications.length === 0 || isClearing) return;
    setShowClearConfirm(true);
  };

  const handleConfirmClearAll = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      await onDeleteAll();
      setShowClearConfirm(false);
    } finally {
      setIsClearing(false);
    }
  };

  const handleRowClick = (notif) => {
    if (!notif.is_read) onMarkOneRead(notif.id);
    onNotificationPress?.(notif);
  };

  return (
    <div className="fixed inset-0 z-[200]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 border-0 p-0 cursor-default"
        onClick={onClose}
        aria-label="Close notifications"
      />
      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col shadow-2xl"
        style={{
          backgroundColor: bg,
          borderLeft: `1px solid ${theme === 'dark' ? 'rgba(197,160,89,0.2)' : 'rgba(197,160,89,0.3)'}`,
          paddingTop: 'var(--safe-top)',
          paddingBottom: 'var(--safe-bottom)',
        }}
        onClick={stopEvent}
        onPointerDown={stopEvent}
      >
        <div
          className="relative z-10 flex-shrink-0 border-b"
          style={{ borderColor: border, backgroundColor: bg }}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0">
              <h2 className="font-heading text-2xl text-gold leading-tight">Notifications</h2>
              <p className={`text-xs mt-1.5 ${textMuted}`}>
                {unreadCount > 0 ? (
                  <>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-charcoal mr-1.5" style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}>
                      {unreadCount} unread
                    </span>
                  </>
                ) : (
                  <span>All caught up</span>
                )}
                {notifications.length > 0 ? (
                  <span>{unreadCount > 0 ? ' · ' : ''}{notifications.length} total</span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onPointerUp={handleTap(onClose)}
              className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl border transition-colors active:bg-white/5 cursor-pointer select-none ${textMuted}`}
              style={{ borderColor: border }}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {(unreadCount > 0 || notifications.length > 0) ? (
            <div className="flex gap-2 px-5 pb-4">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onPointerUp={handleTap(onMarkAllRead)}
                  className="flex-1 px-3 py-2.5 text-xs font-medium text-gold border border-gold/40 rounded-xl active:bg-gold/10 transition-colors text-center cursor-pointer select-none"
                >
                  Mark all read
                </button>
              ) : null}
              {notifications.length > 0 ? (
                <button
                  type="button"
                  onPointerUp={handleTap(handleClearAll)}
                  disabled={isClearing}
                  className={`${dangerBtnClass} disabled:opacity-50`}
                >
                  Clear all
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
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
                  onPointerUp={handleTap(() => onDeleteOne(notif.id))}
                  className={`absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg opacity-60 active:opacity-100 active:bg-red-500/10 active:text-red-400 transition-all cursor-pointer select-none ${textMuted}`}
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

        {showClearConfirm ? (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-5"
            onClick={stopEvent}
            onPointerDown={stopEvent}
          >
            <div
              className="w-full max-w-xs rounded-2xl border p-5 shadow-2xl"
              style={{
                backgroundColor: bg,
                borderColor: theme === 'dark' ? 'rgba(197,160,89,0.25)' : 'rgba(197,160,89,0.35)',
              }}
            >
              <h3 className={`font-heading text-lg mb-2 ${textPrimary}`}>Clear all notifications?</h3>
              <p className={`text-sm mb-5 ${textSecondary}`}>This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onPointerUp={handleTap(() => setShowClearConfirm(false))}
                  disabled={isClearing}
                  className={cancelBtnClass}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onPointerUp={handleTap(handleConfirmClearAll)}
                  disabled={isClearing}
                  className={`${dangerBtnClass} disabled:opacity-50`}
                >
                  {isClearing ? 'Clearing…' : 'Clear all'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
