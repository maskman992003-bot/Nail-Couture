import { useAppTheme } from '../hooks/useAppTheme.js';

export default function ThemeToggleButton({ className = '', size = 'md', onToggled }) {
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === 'dark';

  const sizeClasses = size === 'sm'
    ? 'w-8 h-8'
    : 'w-10 h-10';

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const handleClick = () => {
    toggleTheme();
    onToggled?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-center rounded-full border border-gold/30 bg-gold/10 hover:bg-gold/20 hover:border-gold/50 transition-all duration-300 hover:scale-110 active:scale-95 ${sizeClasses} ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <svg className={`${iconSize} text-gold`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className={`${iconSize} text-gold`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
