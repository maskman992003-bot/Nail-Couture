const SPARKLE_POINTS = [
  { top: '14%', left: '6%', delay: '0s' },
  { top: '10%', left: '68%', delay: '0.5s' },
  { top: '48%', left: '90%', delay: '1s' },
  { top: '72%', left: '10%', delay: '0.25s' },
  { top: '58%', left: '52%', delay: '1.4s' },
  { top: '22%', left: '42%', delay: '0.9s' },
];

const CONFETTI_PIECES = [
  { top: '6%', left: '18%', delay: '0s' },
  { top: '4%', left: '44%', delay: '0.8s' },
  { top: '8%', left: '76%', delay: '1.4s' },
  { top: '12%', left: '32%', delay: '2s' },
  { top: '6%', left: '58%', delay: '1.1s' },
];

const MODAL_SPARKLE_POINTS = [
  { top: '8%', left: '5%', delay: '0s' },
  { top: '6%', left: '55%', delay: '0.4s' },
  { top: '18%', left: '88%', delay: '0.9s' },
  { top: '35%', left: '12%', delay: '1.2s' },
  { top: '28%', left: '72%', delay: '0.6s' },
];

export function MysteryGiftGiftIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8M4 12h16M12 22V12M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 4 12 4s1-2 2.5-2a2.5 2.5 0 1 1 0 5H12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MysteryGiftCelebrationSparkles({ variant = 'hero' }) {
  const sparkles = variant === 'modal' ? MODAL_SPARKLE_POINTS : SPARKLE_POINTS;

  return (
    <>
      {sparkles.map((point) => (
        <span
          key={`${point.top}-${point.left}`}
          className="nc-mystery-sparkle"
          style={{ top: point.top, left: point.left, animationDelay: point.delay }}
        />
      ))}
      {variant === 'hero'
        ? CONFETTI_PIECES.map((piece) => (
          <span
            key={`${piece.top}-${piece.left}`}
            className="nc-mystery-confetti"
            style={{ top: piece.top, left: piece.left, animationDelay: piece.delay }}
          />
        ))
        : null}
    </>
  );
}

export function MysteryGiftCountdownBadge({ countdown, className = '' }) {
  return (
    <span className={`nc-mystery-gift-countdown inline-flex items-center rounded-full border border-gold/30 bg-gold/15 px-2.5 py-1 text-[11px] font-medium font-heading text-gold-strong ${className}`}>
      {countdown}
    </span>
  );
}
