import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  formatGiftCardBalance,
  getGiftCardLayout,
  getGiftCardWebTextStyle,
} from '@nail-couture/shared/constants/giftCardLayout.js';
import { GIFT_CARD_WEB_IMAGE } from '../constants/giftCardImages.js';
import {
  maskClaimPreviewText,
  sanitizeClaimPreviewOwnerName,
  sanitizeDisplayGiftMessage,
} from '@nail-couture/shared/utils/giftCards';

function useCardHeight(ref) {
  const [cardHeightPx, setCardHeightPx] = useState(200);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      if (height > 0) {
        setCardHeightPx((prev) => (Math.abs(prev - height) > 0.5 ? height : prev));
      }
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [ref]);

  return cardHeightPx;
}

function OverlayText({ value, position, fieldStyle, textShadow, cardHeightPx, fieldKey }) {
  if (!value) return null;

  return (
    <p
      className="absolute leading-none max-w-[55%] whitespace-nowrap overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        right: position.right,
        textAlign: position.textAlign,
        textShadow: fieldStyle.textShadow ?? textShadow,
        lineHeight: 1.15,
        ...getGiftCardWebTextStyle(fieldStyle, cardHeightPx, fieldKey),
      }}
    >
      {value}
    </p>
  );
}

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
  showInitialOnCard = false,
  claimPreview = false,
  footer,
}) {
  const layout = getGiftCardLayout();
  const frameRef = useRef(null);
  const cardHeightPx = useCardHeight(frameRef);
  const hasBalance = balance != null && Number.isFinite(Number(balance));
  const hasInitial = initialAmount != null && Number.isFinite(Number(initialAmount));
  const muted = isDark ? 'text-offwhite/70' : 'text-charcoal/70';
  const faint = isDark ? 'text-offwhite/50' : 'text-charcoal/50';
  const displayBalance = hasBalance ? formatGiftCardBalance(balance) : null;
  const displayOwner = claimPreview
    ? sanitizeClaimPreviewOwnerName(ownerName)
    : (ownerName?.trim() || null);
  const sanitizedGiftMessage = sanitizeDisplayGiftMessage(giftMessage);
  const displayGiftMessage = sanitizedGiftMessage
    ? (claimPreview ? maskClaimPreviewText(sanitizedGiftMessage) : sanitizedGiftMessage)
    : null;
  const displayCode = claimPreview ? null : codeDisplay;
  const displayInitial = showInitialOnCard && hasInitial
    ? `$${Number(initialAmount).toFixed(2)}`
    : null;

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        className="relative aspect-[758/478] max-w-full rounded-xl border overflow-hidden border-gold/25 bg-[#0d0c0a]"
      >
        <img
          src={GIFT_CARD_WEB_IMAGE}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
          decoding="async"
          draggable={false}
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/25 via-transparent to-black/30 pointer-events-none"
          aria-hidden="true"
        />

        <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden="true">
          <OverlayText
            value={displayBalance}
            position={layout.positions.balance}
            fieldStyle={layout.balance}
            textShadow={layout.textShadow}
            cardHeightPx={cardHeightPx}
            fieldKey="balance"
          />
          {!codeInteractive ? (
            <OverlayText
              value={displayCode}
              position={layout.positions.code}
              fieldStyle={layout.code}
              textShadow={layout.textShadow}
              cardHeightPx={cardHeightPx}
              fieldKey="code"
            />
          ) : null}
          <OverlayText
            value={displayOwner}
            position={layout.positions.owner}
            fieldStyle={layout.owner}
            textShadow={layout.textShadow}
            cardHeightPx={cardHeightPx}
            fieldKey="owner"
          />
          {displayInitial ? (
            <OverlayText
              value={displayInitial}
              position={{ top: '22%', right: '6%', textAlign: 'right' }}
              fieldStyle={layout.balance}
              textShadow={layout.textShadow}
              cardHeightPx={cardHeightPx}
              fieldKey="balance"
            />
          ) : null}
        </div>

        {codeInteractive ? (
          <button
            type="button"
            onClick={onCodeClick}
            className="absolute z-[2] font-mono text-gold hover:underline max-w-[40%] truncate"
            style={{
              top: layout.positions.code.top,
              left: layout.positions.code.left,
              ...getGiftCardWebTextStyle(layout.code, cardHeightPx, 'code'),
            }}
          >
            {codeDisplay}
          </button>
        ) : null}
      </div>

      {(statusText || expiryText || giftedFromText || displayGiftMessage || footer) ? (
        <div className={clsx('space-y-1 text-xs px-1', muted)}>
          {(statusText || footer) ? (
            <div className="flex items-center justify-between gap-3">
              {statusText ? <p className="min-w-0">{statusText}</p> : <span />}
              {footer ? (
                <div className="flex items-center gap-3 shrink-0">
                  {footer}
                </div>
              ) : null}
            </div>
          ) : null}
          {expiryText ? (
            <p className={expiryExpired ? 'text-red-400/90' : faint}>{expiryText}</p>
          ) : null}
          {giftedFromText ? <p>{giftedFromText}</p> : null}
          {displayGiftMessage ? <p className="italic">&ldquo;{displayGiftMessage}&rdquo;</p> : null}
        </div>
      ) : null}
    </div>
  );
}
