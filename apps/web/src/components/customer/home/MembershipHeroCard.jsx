import { Link } from 'react-router-dom';
import { getTierInfo } from '@nail-couture/shared/utils/loyaltyTier.js';
import { getProfileInitials } from '@nail-couture/shared/utils/avatarUpload.js';
import { getMembershipCardImage } from '@nail-couture/shared/constants/membershipCardImages.js';
import { getWebMembershipCardSrc } from '../../../constants/membershipCardAssets.js';
import FoundingWaxSeal from './membership-card/FoundingWaxSeal.jsx';
import { FOUNDING_SEAL_PALETTES } from '@nail-couture/shared/constants/membershipCardThemes.js';

const AVATAR_SIZE_PX = 132;
/** Match WalletStatsRow StatCard: flex-1 half-width minus gap-3 (12px), ~116px tall */
const CARD_FRAME_CLASS =
  'relative flex-none w-[calc(50%-0.375rem)] max-w-full h-[116px] rounded-2xl border border-card overflow-hidden';

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

function CardArtwork({ isFounding, foundingYear, sealPalette, cardImage, cardSrc }) {
  return (
    <div className={CARD_FRAME_CLASS}>
      <img
        src={cardSrc}
        alt={cardImage.alt}
        className="absolute inset-0 w-full h-full object-cover object-center"
        draggable={false}
      />

      {isFounding ? (
        <>
          <div className="absolute top-1.5 right-1.5 z-10">
            <FoundingWaxSeal palette={sealPalette} size={32} />
          </div>
          <div
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.82)',
              border: '1px solid rgba(183,110,121,0.45)',
            }}
          >
            <p
              className="uppercase font-medium whitespace-nowrap"
              style={{
                color: '#8B5E4A',
                fontSize: '0.45rem',
                letterSpacing: '0.14em',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Founding Member • Est. {foundingYear}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function MembershipHeroCard({ profile, onPress }) {
  const tier = getTierInfo(profile);
  const isFounding = Boolean(profile?.founding_spot);
  const foundingYear = new Date().getFullYear();
  const cardImage = getMembershipCardImage(tier.id);
  const cardSrc = getWebMembershipCardSrc(tier.id);
  const sealKey = profile?.founding_type === 'vanguard' || profile?.founding_type === 'legacy'
    ? profile.founding_type
    : 'default';
  const sealPalette = FOUNDING_SEAL_PALETTES[sealKey];

  const card = (
    <CardArtwork
      isFounding={isFounding}
      foundingYear={foundingYear}
      sealPalette={sealPalette}
      cardImage={cardImage}
      cardSrc={cardSrc}
    />
  );

  return (
    <div className="w-full flex items-center justify-center gap-4 flex-wrap sm:flex-nowrap">
      <ProfileAvatar profile={profile} />

      <div className="flex-none w-[calc(50%-0.375rem)] max-w-full">
        {onPress ? (
          <button type="button" onClick={onPress} className="text-left w-full">
            {card}
          </button>
        ) : (
          <Link to="/customer/loyalty" className="block w-full">
            {card}
          </Link>
        )}
      </div>
    </div>
  );
}
