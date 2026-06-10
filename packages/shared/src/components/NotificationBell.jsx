import { BELL_PATH } from '../icons/paths.js';

/**
 * @param {{
 *   unreadCount?: number,
 *   ring?: boolean,
 *   onClick?: (e: import('react').MouseEvent<HTMLButtonElement>) => void,
 *   theme?: 'dark' | 'light',
 *   size?: 'sm' | 'md',
 *   overlay?: boolean,
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
  overlay = false,
  className = '',
  ariaLabel = 'Notifications',
}) {
  const iconSize = overlay || size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const badgeSize = overlay || size === 'sm' ? 'min-w-[12px] h-3 text-[6px]' : 'min-w-[16px] h-4 text-[8px]';
  const iconColor = theme === 'dark' ? 'text-offwhite/55' : 'text-charcoal/75';

  if (unreadCount === 0 && !ring) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center transition-colors hover:text-gold ${iconColor} ${
        overlay ? 'p-0' : 'p-1.5 rounded-lg'
      } ${className}`}
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
