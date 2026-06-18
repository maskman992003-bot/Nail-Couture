import { useEffect } from 'react';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';

export default function PromoSlideIn({
  promo,
  visible = false,
  detailOpen = false,
  preview = false,
  onOpenDetail,
  onAutoHide,
}) {
  const { theme } = useTheme();

  const autoHideSeconds = Number(promo?.slide_in_auto_hide_seconds) || 0;

  useEffect(() => {
    if (!promo || !visible || detailOpen || autoHideSeconds <= 0) return undefined;

    const timer = setTimeout(() => {
      onAutoHide?.();
    }, autoHideSeconds * 1000);

    return () => clearTimeout(timer);
  }, [promo?.id, visible, detailOpen, autoHideSeconds, onAutoHide]);

  if (!promo || !visible) return null;

  const shellClass = preview
    ? 'relative w-full max-w-[240px]'
    : 'fixed bottom-6 right-4 sm:right-6 z-[100] w-[calc(100%-2rem)] max-w-[240px]';

  return (
    <div
      className={clsx(
        shellClass,
        !preview && 'animate-nc-slide-in-up',
      )}
    >
      <button
        type="button"
        onClick={() => onOpenDetail?.(promo)}
        aria-label={`View offer: ${promo.title}`}
        className={clsx(
          'w-full rounded-2xl border p-3 shadow-lg text-center cursor-pointer',
          'transition hover:border-gold/50 motion-reduce:transition-none',
          theme === 'dark'
            ? 'border-gold/25 bg-charcoal/95 text-offwhite backdrop-blur-sm'
            : 'border-gold/35 bg-white/95 text-charcoal backdrop-blur-sm',
          promo.show_shimmer_cta && 'nc-shimmer-surface',
        )}
      >
        <p className="text-[10px] uppercase tracking-[0.28em] text-gold mb-1">Special offer</p>
        <p className="font-heading text-sm text-gold-strong leading-snug">{promo.title}</p>
        {promo.discount_label ? (
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-offwhite/65' : 'text-charcoal/65'}`}>
            {promo.discount_label}
          </p>
        ) : null}
        <p className={`text-[11px] mt-1.5 ${theme === 'dark' ? 'text-offwhite/55' : 'text-charcoal/55'}`}>
          Tap to view offer
        </p>
      </button>
    </div>
  );
}
