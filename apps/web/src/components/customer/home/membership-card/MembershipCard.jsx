/**
 * POSITION TUNING (GIMP-exported assets)
 * --------------------------------------
 * Per-tier text alignment lives in MEMBERSHIP_CARD_TIER_LAYOUT inside
 * @nail-couture/shared/constants/membershipCardLayout.js — edit `positions`
 * top/left percentages for each tier's name and id fields.
 *
 * Font sizes scale from measured card height so text stays aligned at any size.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  MEMBERSHIP_CARD_HERO,
  MEMBERSHIP_CARD_NAME_MAX_WIDTH,
  MEMBERSHIP_CARD_NAME_MIN_SCALE,
  formatMembershipCardId,
  getMembershipCardAlt,
  getMembershipCardFieldFontSize,
  getMembershipCardFontSizes,
  getMembershipCardFoundingSealInset,
  getMembershipCardLayout,
  getMembershipCardWebTextStyle,
} from '@nail-couture/shared/constants/membershipCardLayout.js';
import FoundingWaxSeal from './FoundingWaxSeal.jsx';

function useFitTextToWidth(textRef, { enabled, baseFontSize, minScale = 0.65, deps = [] }) {
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || !enabled || !baseFontSize) return;

    const minSize = baseFontSize * minScale;
    let size = baseFontSize;
    el.style.fontSize = `${size}px`;

    while (el.scrollWidth > el.clientWidth && size > minSize) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
  }, [enabled, baseFontSize, minScale, ...deps]);
}

function OverlayText({
  value,
  position,
  fieldStyle,
  textShadow,
  cardHeightPx,
  fieldKey,
  tierId,
  fitToWidth = false,
}) {
  const textRef = useRef(null);
  const resolvedShadow = fieldStyle.textShadow ?? textShadow;
  const baseFontSize = cardHeightPx && fieldKey
    ? getMembershipCardFieldFontSize(cardHeightPx, fieldKey, tierId)
    : null;

  useFitTextToWidth(textRef, {
    enabled: fitToWidth,
    baseFontSize,
    minScale: MEMBERSHIP_CARD_NAME_MIN_SCALE,
    deps: [value, cardHeightPx, fieldKey, tierId],
  });

  return (
    <p
      ref={textRef}
      className={`absolute leading-none ${fitToWidth ? 'whitespace-nowrap overflow-hidden' : 'max-w-[90%]'}`}
      style={{
        top: position.top,
        left: position.left,
        right: position.right,
        textAlign: position.textAlign,
        transformOrigin: position.right ? 'top right' : 'top left',
        textShadow: resolvedShadow,
        lineHeight: 1.15,
        ...(fitToWidth ? { maxWidth: `${MEMBERSHIP_CARD_NAME_MAX_WIDTH * 100}%` } : null),
        ...getMembershipCardWebTextStyle(fieldStyle, cardHeightPx, fieldKey, tierId),
      }}
    >
      {value}
    </p>
  );
}

function FoundingBadgeText({ text, cardHeightPx, tierId }) {
  const textRef = useRef(null);
  const baseFontSize = cardHeightPx
    ? getMembershipCardFieldFontSize(cardHeightPx, 'founding', tierId)
    : 12;

  useFitTextToWidth(textRef, {
    enabled: Boolean(cardHeightPx),
    baseFontSize,
    minScale: 0.7,
    deps: [text, cardHeightPx, tierId],
  });

  return (
    <p
      ref={textRef}
      className="uppercase font-medium whitespace-nowrap leading-none w-full text-center overflow-hidden px-2"
      style={{
        color: '#8B5E4A',
        fontSize: baseFontSize,
        letterSpacing: '0.12em',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {text}
    </p>
  );
}

export function FoundingMemberBar({ text, tierId, cardHeightPx }) {
  return (
    <div
      className="pointer-events-none flex items-center justify-center overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.82)',
        borderTop: '1px solid rgba(183,110,121,0.45)',
        paddingTop: Math.max(6, (cardHeightPx || MEMBERSHIP_CARD_HERO.heightPx) * 0.012),
        paddingBottom: Math.max(6, (cardHeightPx || MEMBERSHIP_CARD_HERO.heightPx) * 0.012),
      }}
    >
      <FoundingBadgeText text={text} cardHeightPx={cardHeightPx} tierId={tierId} />
    </div>
  );
}

function useCardHeight(ref) {
  const [cardHeightPx, setCardHeightPx] = useState(MEMBERSHIP_CARD_HERO.heightPx);

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

export default function MembershipCard({
  name,
  id,
  tier,
  tierId,
  backgroundImage,
  className = '',
  fillSlot = false,
  isFounding = false,
  sealPalette,
}) {
  const frameRef = useRef(null);
  const cardHeightPx = useCardHeight(frameRef);
  const scaledFonts = getMembershipCardFontSizes(cardHeightPx, tierId);
  const sealInset = getMembershipCardFoundingSealInset(cardHeightPx);
  const layout = getMembershipCardLayout(tierId);
  const alt = getMembershipCardAlt({ name, tier });
  const displayName = name?.trim() || 'Member';

  const frameClass = fillSlot
    ? 'relative w-full h-full overflow-hidden'
    : 'relative aspect-[758/478] max-w-full border border-card overflow-hidden';

  const frameStyle = fillSlot
    ? { borderRadius: MEMBERSHIP_CARD_HERO.borderRadiusPx }
    : {
        height: MEMBERSHIP_CARD_HERO.heightPx,
        borderRadius: MEMBERSHIP_CARD_HERO.borderRadiusPx,
      };

  return (
    <div ref={frameRef} className={`${frameClass} ${className}`} style={frameStyle}>
      <img
        key={backgroundImage}
        src={backgroundImage}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover object-center rounded-[inherit]"
        decoding="async"
        draggable={false}
      />

      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        aria-hidden="true"
      >
        <OverlayText
          value={displayName}
          position={layout.positions.name}
          fieldStyle={layout.name}
          textShadow={layout.textShadow}
          cardHeightPx={cardHeightPx}
          fieldKey="name"
          tierId={tierId}
          fitToWidth
        />
        <OverlayText
          value={formatMembershipCardId(id)}
          position={layout.positions.id}
          fieldStyle={layout.id}
          textShadow={layout.textShadow}
          cardHeightPx={cardHeightPx}
          fieldKey="id"
          tierId={tierId}
        />
      </div>

      {isFounding ? (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            top: sealInset.top,
            right: sealInset.right,
            width: scaledFonts.seal,
            height: scaledFonts.seal,
          }}
        >
          <FoundingWaxSeal />
        </div>
      ) : null}
    </div>
  );
}
