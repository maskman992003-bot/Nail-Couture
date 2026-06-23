import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getProfileInitials } from '@nail-couture/shared/utils/avatarUpload.js';
import { getMembershipCardWebSrc } from '../../../constants/membershipCardImages.js';
import { getMembershipCardMemberId, MEMBERSHIP_CARD_HERO } from '@nail-couture/shared/constants/membershipCardLayout.js';
import { FOUNDING_SEAL_PALETTES } from '@nail-couture/shared/constants/membershipCardThemes.js';
import MembershipCard, { FoundingMemberBar } from './membership-card/MembershipCard.jsx';

const AVATAR_SIZE_PX = 132;

function ProfileAvatar({ profile }) {
  const displayName = profile?.full_name?.trim() || 'Member';

  return (
    <div
      className="flex-none flex items-center justify-center"
      style={{ width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX }}
    >
      <Link
        to="/customer/profile"
        className="block"
        aria-label="Profile"
        onClick={(event) => event.stopPropagation()}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="rounded-full object-cover border-2 border-card"
            style={{ width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center bg-gold/20 border-2 border-card"
            style={{ width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX }}
          >
            <span className="font-heading text-3xl text-gold-strong font-bold">
              {getProfileInitials(displayName)}
            </span>
          </div>
        )}
      </Link>
    </div>
  );
}

export function ProfileMembershipCard({ profile, onPress, fillSlot = false, asStatic = false, cardFrameRadius }) {
  const tier = getTierInfo(profile);
  const isFounding = Boolean(profile?.founding_spot);
  const cardSrc = getMembershipCardWebSrc(tier.id);
  const sealKey = profile?.founding_type === 'vanguard' || profile?.founding_type === 'legacy'
    ? profile.founding_type
    : 'default';
  const sealPalette = FOUNDING_SEAL_PALETTES[sealKey];
  const resolvedRadius = cardFrameRadius ?? MEMBERSHIP_CARD_HERO.borderRadiusPx;

  const card = (
    <MembershipCard
      name={profile?.full_name?.trim() || 'Member'}
      id={getMembershipCardMemberId(profile)}
      tier={tier.name}
      tierId={tier.id}
      backgroundImage={cardSrc}
      fillSlot={fillSlot}
      isFounding={isFounding}
      sealPalette={sealPalette}
    />
  );

  const containerClass = fillSlot ? 'absolute inset-0 overflow-hidden' : 'relative';
  const containerStyle = fillSlot
    ? { borderRadius: resolvedRadius }
    : undefined;

  if (onPress) {
    return (
      <div className={containerClass} style={containerStyle}>
        {card}
        <button
          type="button"
          onClick={onPress}
          className="absolute inset-0 z-[5] cursor-pointer border-0 bg-transparent p-0"
          aria-label="View how to earn points"
        />
      </div>
    );
  }

  if (asStatic) {
    return (
      <div className={fillSlot ? containerClass : 'block'} style={containerStyle}>
        {card}
      </div>
    );
  }

  return (
    <div className={containerClass} style={containerStyle}>
      {card}
      <Link
        to="/customer/loyalty"
        className="absolute inset-0 z-[5] block"
        aria-label="View loyalty program"
      />
    </div>
  );
}

export function MembershipCardSection({ profile, onCardPress, asStatic = false }) {
  const tier = getTierInfo(profile);
  const cardFrameRef = useRef(null);
  const [cardHeightPx, setCardHeightPx] = useState(MEMBERSHIP_CARD_HERO.heightPx);

  useEffect(() => {
    const el = cardFrameRef.current;
    if (!el) return undefined;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      if (height > 0) {
        setCardHeightPx((prev) => (Math.abs(prev - height) > 0.5 ? height : prev));
      }
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  if (tier.id === 'regular_customer') {
    return null;
  }

  const isFounding = Boolean(profile?.founding_spot);
  const foundingYear = new Date().getFullYear();
  const cardRadius = MEMBERSHIP_CARD_HERO.borderRadiusPx;
  const cardFrameRadius = isFounding
    ? `${cardRadius}px ${cardRadius}px 0 0`
    : cardRadius;

  return (
    <div className="w-full rounded-2xl border border-card bg-card p-3 overflow-hidden">
      <div
        ref={cardFrameRef}
        className="relative w-full aspect-[758/478] overflow-hidden"
        style={{ borderRadius: cardFrameRadius }}
      >
        <ProfileMembershipCard
          profile={profile}
          onPress={onCardPress}
          fillSlot
          asStatic={asStatic}
          cardFrameRadius={cardFrameRadius}
        />
      </div>
      {isFounding ? (
        <FoundingMemberBar
          text={`Founding Member • Est. ${foundingYear}`}
          tierId={tier.id}
          cardHeightPx={cardHeightPx}
        />
      ) : null}
    </div>
  );
}

export default function MembershipHeroCard({ profile }) {
  const firstName = profile?.full_name?.split(' ')[0] || 'back';

  return (
    <div className="w-full flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-secondary text-sm">Welcome back,</p>
        <h1 className="font-heading text-3xl md:text-4xl text-primary truncate">{firstName}</h1>
      </div>
      <ProfileAvatar profile={profile} />
    </div>
  );
}
