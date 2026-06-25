import { useEffect } from 'react';
import clsx from 'clsx';
import { useTheme } from '../../contexts/ThemeContext';
import {
  MYSTERY_GIFT_SLIDE_IN_AUTO_HIDE_SECONDS,
  MYSTERY_GIFT_TEASER_COPY,
} from '@nail-couture/shared/utils/mysteryGift';

export default function MysteryGiftSlideIn({
  visible = false,
  detailOpen = false,
  preview = false,
  onOpenDetail,
  onAutoHide,
}) {
  const { theme } = useTheme();

  useEffect(() => {
    if (!visible || detailOpen) return undefined;

    const timer = setTimeout(() => {
      onAutoHide?.();
    }, MYSTERY_GIFT_SLIDE_IN_AUTO_HIDE_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [visible, detailOpen, onAutoHide]);

  if (!visible) return null;

  const shellClass = preview
    ? 'relative w-full max-w-[240px]'
    : 'fixed bottom-6 left-4 sm:left-6 z-[99] w-[calc(100%-2rem)] max-w-[240px]';

  return (
    <div className={clsx(shellClass, !preview && 'animate-nc-slide-in-up')}>
      <button
        type="button"
        onClick={() => onOpenDetail?.()}
        aria-label={`${MYSTERY_GIFT_TEASER_COPY.slideInTitle}: ${MYSTERY_GIFT_TEASER_COPY.slideInHook}`}
        className={clsx(
          'w-full rounded-2xl border p-3 shadow-lg text-center cursor-pointer nc-shimmer-surface',
          'transition hover:border-gold/50 motion-reduce:transition-none',
          theme === 'dark'
            ? 'border-gold/25 bg-charcoal/95 text-offwhite backdrop-blur-sm'
            : 'border-gold/35 bg-white/95 text-charcoal backdrop-blur-sm',
        )}
      >
        <p className="text-[10px] uppercase tracking-[0.28em] text-gold mb-1">
          {MYSTERY_GIFT_TEASER_COPY.slideInTitle}
        </p>
        <p className="font-heading text-sm text-gold-strong leading-snug">
          {MYSTERY_GIFT_TEASER_COPY.slideInHook}
        </p>
        <p className={`text-[11px] mt-1.5 ${theme === 'dark' ? 'text-offwhite/55' : 'text-charcoal/55'}`}>
          {MYSTERY_GIFT_TEASER_COPY.slideInTap}
        </p>
      </button>
    </div>
  );
}
