import { BELL_PATH } from '../icons/paths.js';

/**
 * @param {{
 *   unreadCount?: number,
 *   ring?: boolean,
 *   onClick?: () => void,
 *   theme?: 'dark' | 'light',
 *   size?: 'sm' | 'md',
 *   className?: string,
 *   ariaLabel?: string,
 * }} props
 */
export default function NotificationBell({
  unreadCount = 0,
  ring = false,
  onClick,
  theme = 'dark',
  size = 'md',
  className = '',
  ariaLabel = 'Notifications',
}) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const badgeSize = size === 'sm' ? 'min-w-[14px] h-3.5 text-[7px]' : 'min-w-[16px] h-4 text-[8px]';
  const iconColor = theme === 'dark' ? 'text-offwhite/55' : 'text-charcoal/75';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center p-1.5 rounded-lg transition-colors hover:text-gold ${iconColor} ${className}`}
      aria-label={ariaLabel}
    >
      <svg
        className={`${iconSize} flex-shrink-0 ${ring ? 'animate-bell-ring' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={BELL_PATH} />
      </svg>
      {unreadCount > 0 ? (
        <span
          className={`absolute -top-0.5 -right-0.5 ${badgeSize} flex items-center justify-center rounded-full font-bold text-charcoal px-0.5`}
          style={{ background: 'linear-gradient(135deg, #c5a059, #f0d78c)' }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
