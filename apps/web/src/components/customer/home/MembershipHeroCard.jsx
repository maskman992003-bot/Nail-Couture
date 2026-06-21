import { Link } from 'react-router-dom';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getProfileInitials } from '@nail-couture/shared/utils/avatarUpload.js';
import { getMembershipCardWebSrc } from '../../../constants/membershipCardImages.js';
import { getMembershipCardMemberId, MEMBERSHIP_CARD_HERO } from '@nail-couture/shared/constants/membershipCardLayout.js';
import { FOUNDING_SEAL_PALETTES } from '@nail-couture/shared/constants/membershipCardThemes.js';
import MembershipCard from './membership-card/MembershipCard.jsx';

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

export function ProfileMembershipCard({ profile, onPress, fillSlot = false, asStatic = false }) {
  const tier = getTierInfo(profile);
  const isFounding = Boolean(profile?.founding_spot);
  const foundingYear = new Date().getFullYear();
  const cardSrc = getMembershipCardWebSrc(tier.id);
  const sealKey = profile?.founding_type === 'vanguard' || profile?.founding_type === 'legacy'
    ? profile.founding_type
    : 'default';
  const sealPalette = FOUNDING_SEAL_PALETTES[sealKey];

  const card = (
    <MembershipCard
      name={profile?.full_name?.trim() || 'Member'}
      id={getMembershipCardMemberId(profile)}
      tier={tier.name}
      tierId={tier.id}
      backgroundImage={cardSrc}
      fillSlot={fillSlot}
      isFounding={isFounding}
      foundingYear={foundingYear}
      sealPalette={sealPalette}
    />
  );

  const wrapperClass = fillSlot
    ? 'absolute inset-0 overflow-hidden block'
    : 'text-left';

  const wrapperStyle = fillSlot
    ? { borderRadius: MEMBERSHIP_CARD_HERO.borderRadiusPx }
    : undefined;

  if (onPress) {
    return (
      <button type="button" onClick={onPress} className={wrapperClass} style={wrapperStyle}>
        {card}
      </button>
    );
  }

  if (asStatic) {
    return (
      <div className={fillSlot ? wrapperClass : 'block'} style={wrapperStyle}>
        {card}
      </div>
    );
  }

  return (
    <Link to="/customer/loyalty" className={fillSlot ? wrapperClass : 'block'} style={wrapperStyle}>
      {card}
    </Link>
  );
}

export function MembershipCardSection({ profile, onCardPress, asStatic = false }) {
  const tier = getTierInfo(profile);
  if (tier.id === 'regular_customer') {
    return null;
  }

  return (
    <div className="w-full rounded-2xl border border-card bg-card p-3">
      <div
        className="relative w-full aspect-[758/478] overflow-hidden"
        style={{ borderRadius: MEMBERSHIP_CARD_HERO.borderRadiusPx }}
      >
        <ProfileMembershipCard profile={profile} onPress={onCardPress} fillSlot asStatic={asStatic} />
      </div>
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
