import {
  MYSTERY_GIFT_TEASER_COPY,
  formatMysteryGiftCountdown,
} from '@nail-couture/shared/utils/mysteryGift';
import {
  MysteryGiftCelebrationSparkles,
  MysteryGiftCountdownBadge,
  MysteryGiftGiftIcon,
} from './MysteryGiftCelebration';

export default function MysteryGiftHero({ status, onOpenDetail }) {
  const daysRemaining = status?.days_remaining ?? 0;
  const countdown = formatMysteryGiftCountdown(daysRemaining);

  return (
    <div className="nc-mystery-gift-shell">
      <div className="nc-mystery-gift-hero-ring absolute pointer-events-none" aria-hidden />

      <div className="nc-mystery-gift-hero relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 via-card to-card nc-shimmer-surface">
        <div className="nc-mystery-gift-sparkles absolute inset-0 pointer-events-none" aria-hidden>
          <MysteryGiftCelebrationSparkles variant="hero" />
        </div>

        <div
          className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gold/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-gold/5 blur-xl"
          aria-hidden
        />

        <div className="relative z-[3] px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="nc-mystery-gift-icon shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gold/20 border border-gold/35 text-gold-strong">
                <MysteryGiftGiftIcon />
              </div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold truncate">
                {MYSTERY_GIFT_TEASER_COPY.eyebrow}
              </p>
            </div>
            <MysteryGiftCountdownBadge countdown={countdown} className="shrink-0" />
          </div>

          <h2 className="font-heading text-xl sm:text-2xl text-primary leading-snug mb-2">
            {MYSTERY_GIFT_TEASER_COPY.headline}
          </h2>
          <p className="text-secondary text-sm leading-relaxed mb-5">
            {MYSTERY_GIFT_TEASER_COPY.subhead}
          </p>

          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-2.5 text-sm font-heading text-charcoal hover:bg-gold/90 transition-colors"
          >
            {MYSTERY_GIFT_TEASER_COPY.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
