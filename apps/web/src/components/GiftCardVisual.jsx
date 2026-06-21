import clsx from 'clsx';
import { formatGiftCardBalance } from '@nail-couture/shared/constants/giftCardLayout.js';
import { GIFT_CARD_WEB_IMAGE } from '../constants/giftCardImages.js';

export function GiftCardVisual({
  isDark,
  balance,
  initialAmount,
  ownerName,
  statusText,
  expiryText,
  expiryExpired = false,
  giftedFromText,
  giftMessage,
  codeDisplay = 'GC-****-****',
  codeInteractive = false,
  onCodeClick,
  footer,
}) {
  const hasBalance = balance != null && Number.isFinite(Number(balance));
  const hasInitial = initialAmount != null && Number.isFinite(Number(initialAmount));
  const muted = isDark ? 'text-offwhite/70' : 'text-charcoal/70';
  const faint = isDark ? 'text-offwhite/50' : 'text-charcoal/50';

  return (
    <div className="relative rounded-xl border overflow-hidden border-gold/25 bg-[#0d0c0a]">
      <img
        src={GIFT_CARD_WEB_IMAGE}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain object-center"
        decoding="async"
        draggable={false}
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/45"
        aria-hidden="true"
      />

      <div className="relative z-[1]">
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-gold/15">
          <span className="font-heading text-gold/90 text-sm truncate">Gift Card</span>
          {codeInteractive ? (
            <button
              type="button"
              onClick={onCodeClick}
              className="font-mono text-xs shrink-0 text-gold hover:underline"
            >
              {codeDisplay}
            </button>
          ) : (
            <span className="font-mono text-xs shrink-0 text-gold/70">{codeDisplay}</span>
          )}
        </div>

        <div className="px-4 py-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {hasBalance ? (
              <div className="font-heading text-3xl text-gold leading-none">
                {formatGiftCardBalance(balance)}
              </div>
            ) : (
              <div className={clsx('font-heading text-2xl leading-none', faint)}>$—</div>
            )}
            {ownerName && (
              <div className={clsx('text-xs mt-1.5 truncate', muted)}>{ownerName}</div>
            )}
            {statusText && (
              <div className={clsx('text-xs mt-1', muted)}>{statusText}</div>
            )}
            {expiryText && (
              <div className={clsx('text-xs mt-0.5', expiryExpired ? 'text-red-400/90' : faint)}>
                {expiryText}
              </div>
            )}
            {giftedFromText && (
              <div className={clsx('text-xs mt-1', muted)}>{giftedFromText}</div>
            )}
          </div>
          <div className="text-right shrink-0">
            {hasInitial ? (
              <div className="font-heading text-5xl text-gold leading-none">
                ${Number(initialAmount).toFixed(2)}
              </div>
            ) : (
              <div className={clsx('font-heading text-4xl leading-none', faint)}>$—</div>
            )}
          </div>
        </div>

        {giftMessage && (
          <p className={clsx('px-4 pb-3 text-xs italic', muted)}>
            &ldquo;{giftMessage}&rdquo;
          </p>
        )}

        {footer && (
          <div
            className={clsx(
              'px-4 pb-3 flex items-center justify-end gap-3',
              giftMessage ? 'pt-0' : 'border-t border-gold/15 pt-3',
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
