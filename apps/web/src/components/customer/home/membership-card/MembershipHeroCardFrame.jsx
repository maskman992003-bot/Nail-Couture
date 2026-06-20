import { useId } from 'react';
import {
  buildMembershipFillCss,
  MEMBERSHIP_CARD_PARALLAX,
} from '@nail-couture/shared/constants/membershipCardThemes.js';
import { useTiltSensor } from '../../../../features/wallet/hooks/useTiltSensor.js';
import NcMonogram from './NcMonogram.jsx';
import PearlFloralAccent from './PearlFloralAccent.jsx';
import AtelierOrchidAccent from './AtelierOrchidAccent.jsx';
import DiamondCrownAccent from './DiamondCrownAccent.jsx';
import FoundingWaxSeal from './FoundingWaxSeal.jsx';

function TierDecor({ tierId, color, opacity, decorShift }) {
  const decorStyle = {
    transform: `translate(${decorShift.x}px, ${decorShift.y}px)`,
    color,
    opacity,
  };

  if (tierId === 'pearl') {
    return (
      <PearlFloralAccent
        className="w-[min(88%,320px)] h-auto mx-auto mt-3"
        style={decorStyle}
        color={color}
      />
    );
  }
  if (tierId === 'atelier') {
    return (
      <div className="flex flex-col items-center mt-2" style={decorStyle}>
        <AtelierOrchidAccent variant="icon" color={color} className="w-10 h-8" />
      </div>
    );
  }
  return (
    <DiamondCrownAccent
      className="w-[min(88%,320px)] h-auto mx-auto mt-3"
      style={decorStyle}
      color={color}
    />
  );
}

function BackdropDecor({ tierId, color, opacity, decorShift }) {
  if (tierId !== 'atelier') return null;

  return (
    <AtelierOrchidAccent
      variant="full"
      color={color}
      className="absolute -left-2 bottom-2 w-[38%] max-w-[140px] h-auto pointer-events-none"
      style={{
        opacity: opacity * 0.45,
        transform: `translate(${decorShift.x * 1.4}px, ${decorShift.y * 1.2}px)`,
      }}
    />
  );
}

export default function MembershipHeroCardFrame({ theme, subtitle, className = '' }) {
  const gradientId = useId().replace(/:/g, '');
  const { tiltX, tiltY } = useTiltSensor(true);
  const fillShift = {
    x: tiltX * MEMBERSHIP_CARD_PARALLAX.fill,
    y: tiltY * MEMBERSHIP_CARD_PARALLAX.fill,
  };
  const decorShift = {
    x: tiltX * MEMBERSHIP_CARD_PARALLAX.decor,
    y: tiltY * MEMBERSHIP_CARD_PARALLAX.decor,
  };

  const isDiamond = theme.id === 'diamond_couture';
  const fillBackground = buildMembershipFillCss(theme, fillShift.x, fillShift.y);
  const prismaticBorder = isDiamond && theme.prismaticBorder
    ? `conic-gradient(from ${180 + tiltX * MEMBERSHIP_CARD_PARALLAX.border * 8}deg, ${theme.prismaticBorder.join(', ')})`
    : null;

  const insetStyle = {
    inset: theme.insetPadding,
    borderColor: theme.insetBorder,
    borderWidth: theme.insetBorderWidth,
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[1.25rem] transition-shadow hover:shadow-xl ${className}`}
      style={{
        aspectRatio: theme.aspectRatio,
        minHeight: theme.minHeight,
        boxShadow: theme.boxShadow,
        border: `${theme.outerBorderWidth}px solid ${theme.outerBorder}`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: fillBackground,
          backgroundSize: isDiamond ? '200% 200%' : '100% 100%',
        }}
      />

      {prismaticBorder ? (
        <div
          className="absolute inset-0 rounded-[1.15rem] pointer-events-none"
          style={{
            padding: 2,
            background: prismaticBorder,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
      ) : null}

      <div
        className="absolute rounded-[1rem] pointer-events-none"
        style={{
          ...insetStyle,
          borderStyle: 'solid',
        }}
      />

      <BackdropDecor
        tierId={theme.id}
        color={theme.accentColor}
        opacity={theme.decorOpacity}
        decorShift={decorShift}
      />

      {theme.isFounding ? (
        <div className="absolute top-3 right-3 z-20">
          <FoundingWaxSeal palette={theme.foundingSealPalette} size={44} />
        </div>
      ) : null}

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 py-8 text-center">
        <NcMonogram
          gradientId={`nc-${gradientId}`}
          colors={theme.metallicGradient}
          className="w-[min(42%,160px)] h-auto"
          style={{
            transform: `translate(${decorShift.x * 0.3}px, ${decorShift.y * 0.3}px)`,
            color: theme.accentColor,
          }}
        />

        <p
          className="font-heading uppercase mt-2 mb-1"
          style={{
            color: theme.brandColor,
            fontSize: 'clamp(0.55rem, 2.2vw, 0.72rem)',
            letterSpacing: '0.32em',
            background: isDiamond
              ? `linear-gradient(90deg, ${theme.metallicGradient.join(', ')})`
              : undefined,
            WebkitBackgroundClip: isDiamond ? 'text' : undefined,
            WebkitTextFillColor: isDiamond ? 'transparent' : undefined,
          }}
        >
          Nail Couture
        </p>

        <p
          className="leading-none"
          style={{
            color: theme.tierScriptColor,
            fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(1.35rem, 5vw, 2rem)',
            textShadow: isDiamond ? '0 1px 12px rgba(168,200,255,0.25)' : '0 1px 2px rgba(255,255,255,0.35)',
          }}
        >
          {theme.tierName} Member
        </p>

        {subtitle ? (
          <p
            className="uppercase font-medium mt-2"
            style={{
              color: theme.subtitleColor,
              fontSize: 'clamp(0.5rem, 1.8vw, 0.62rem)',
              letterSpacing: '0.22em',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {subtitle}
          </p>
        ) : null}

        <TierDecor
          tierId={theme.id}
          color={theme.accentColor}
          opacity={theme.decorOpacity}
          decorShift={decorShift}
        />
      </div>
    </div>
  );
}
