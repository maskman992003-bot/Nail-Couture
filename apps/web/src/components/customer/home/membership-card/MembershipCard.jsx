/**
 * POSITION TUNING (GIMP-exported assets)
 * --------------------------------------
 * Per-tier text alignment lives in MEMBERSHIP_CARD_TIER_LAYOUT inside
 * @nail-couture/shared/constants/membershipCardLayout.js — edit `positions`
 * top/left percentages for each tier's name and id fields.
 *
 * Font sizes scale with card height via CSS container queries (cqh units).
 */
import {
  MEMBERSHIP_CARD_FONT,
  MEMBERSHIP_CARD_FOUNDING_RESERVE,
  MEMBERSHIP_CARD_HERO,
  formatMembershipCardId,
  getMembershipCardAlt,
  getMembershipCardLayout,
  getMembershipCardWebTextStyle,
} from '@nail-couture/shared/constants/membershipCardLayout.js';
import FoundingWaxSeal from './FoundingWaxSeal.jsx';

function OverlayText({ value, position, fieldStyle, textShadow }) {
  return (
    <p
      className="absolute max-w-[90%] leading-none"
      style={{
        top: position.top,
        left: position.left,
        textShadow,
        lineHeight: 1.15,
        ...getMembershipCardWebTextStyle(fieldStyle),
      }}
    >
      {value}
    </p>
  );
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
  foundingYear,
  sealPalette,
}) {
  const layout = getMembershipCardLayout(tierId);
  const alt = getMembershipCardAlt({ name, tier });
  const displayName = name?.trim() || 'Member';

  const frameClass = fillSlot
    ? 'relative w-full h-full overflow-hidden [container-type:size]'
    : 'relative aspect-[758/478] max-w-full border border-card overflow-hidden [container-type:size]';

  const frameStyle = fillSlot
    ? { borderRadius: MEMBERSHIP_CARD_HERO.borderRadiusPx }
    : {
        height: MEMBERSHIP_CARD_HERO.heightPx,
        borderRadius: MEMBERSHIP_CARD_HERO.borderRadiusPx,
      };

  return (
    <div className={`${frameClass} ${className}`} style={frameStyle}>
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
        style={{ paddingBottom: isFounding ? MEMBERSHIP_CARD_FOUNDING_RESERVE : 0 }}
      >
        <OverlayText
          value={displayName}
          position={layout.positions.name}
          fieldStyle={layout.name}
          textShadow={layout.textShadow}
        />
        <OverlayText
          value={formatMembershipCardId(id)}
          position={layout.positions.id}
          fieldStyle={layout.id}
          textShadow={layout.textShadow}
        />
      </div>

      {isFounding ? (
        <>
          <div
            className="absolute z-10"
            style={{
              top: 'clamp(2px, 0.8cqh, 6px)',
              right: 'clamp(2px, 0.8cqh, 6px)',
              width: 'clamp(56px, 20cqh, 88px)',
              height: 'clamp(56px, 20cqh, 88px)',
            }}
          >
            <FoundingWaxSeal />
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center rounded-b-[inherit]"
            style={{
              background: 'rgba(255,255,255,0.82)',
              borderTop: '1px solid rgba(183,110,121,0.45)',
              paddingTop: 'clamp(4px, 1.6cqh, 8px)',
              paddingBottom: 'clamp(4px, 1.6cqh, 8px)',
            }}
          >
            <p
              className="uppercase font-medium whitespace-nowrap leading-none"
              style={{
                color: '#8B5E4A',
                fontSize: MEMBERSHIP_CARD_FONT.founding,
                letterSpacing: '0.12em',
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
