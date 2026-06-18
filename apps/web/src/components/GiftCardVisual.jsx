import clsx from 'clsx';
import { useAppTheme } from '../hooks/useAppTheme.js';

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
  const { logoUrl } = useAppTheme();
  const hasBalance = balance != null && Number.isFinite(Number(balance));
  const hasInitial = initialAmount != null && Number.isFinite(Number(initialAmount));
  const muted = isDark ? 'text-offwhite/50' : 'text-charcoal/50';
  const faint = isDark ? 'text-offwhite/35' : 'text-charcoal/35';

  return (
    <div
      className={clsx(
        'rounded-xl border overflow-hidden',
        isDark
          ? 'border-gold/25 bg-gradient-to-br from-[#1c1a16] via-[#141310] to-[#0d0c0a]'
          : 'border-gold/35 bg-gradient-to-br from-white via-gold/5 to-gold/10',
      )}
    >
      <div className={clsx('px-4 py-2.5 flex items-center justify-between border-b', isDark ? 'border-gold/15' : 'border-gold/20')}>
        <div className="flex items-center gap-2 min-w-0">
          <img src={logoUrl} alt="" className="h-7 w-auto shrink-0 opacity-90" />
          <span className="font-heading text-gold text-sm truncate">Nail Couture</span>
        </div>
        {codeInteractive ? (
          <button
            type="button"
            onClick={onCodeClick}
            className="font-mono text-xs shrink-0 text-gold hover:underline"
          >
            {codeDisplay}
          </button>
        ) : (
          <span className={clsx('font-mono text-xs shrink-0', isDark ? 'text-gold/40' : 'text-gold/50')}>
            {codeDisplay}
          </span>
        )}
      </div>

      <div className="px-4 py-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {hasBalance ? (
            <div className="font-heading text-3xl text-gold leading-none">${Number(balance).toFixed(2)}</div>
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
            <div className={clsx('text-xs mt-0.5', expiryExpired ? 'text-red-400/80' : faint)}>
              {expiryText}
            </div>
          )}
          {giftedFromText && (
            <div className={clsx('text-xs mt-1', muted)}>{giftedFromText}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          {hasInitial ? (
            <div className="font-heading text-5xl text-gold leading-none">${Number(initialAmount).toFixed(2)}</div>
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
        <div className={clsx('px-4 pb-3 flex items-center justify-end gap-3', giftMessage ? 'pt-0' : 'border-t pt-3', isDark ? 'border-gold/15' : 'border-gold/20')}>
          {footer}
        </div>
      )}
    </div>
  );
}
