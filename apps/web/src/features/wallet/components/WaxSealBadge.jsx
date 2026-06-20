import { formatFoundingBadge } from '@nail-couture/shared/constants/loyaltyProgram.js';

export default function WaxSealBadge({ foundingType, foundingSpot, pending = false, size = 28, className = '' }) {
  const badge = foundingType && foundingSpot != null
    ? formatFoundingBadge(foundingType, foundingSpot)
    : null;

  const isVanguard = foundingType === 'vanguard';
  const isLegacy = foundingType === 'legacy';

  const bg = pending
    ? 'rgba(120,120,120,0.25)'
    : isVanguard
      ? '#1A1A1F'
      : isLegacy
        ? '#8B5E4A'
        : 'rgba(197,160,89,0.15)';

  const border = pending
    ? 'rgba(120,120,120,0.5)'
    : isVanguard
      ? '#C5A059'
      : isLegacy
        ? '#E8B4A0'
        : 'rgba(197,160,89,0.55)';

  const labelColor = pending ? '#888' : isVanguard ? '#F5E6C8' : '#FFF5EE';

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 shadow-md ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        border: `2px solid ${border}`,
        boxShadow: pending ? '0 2px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.35)',
      }}
      title={badge || 'Founding member pending'}
    >
      {badge ? (
        <span style={{ color: labelColor, fontSize: size * 0.22, fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>
          {badge}
        </span>
      ) : (
        <span style={{ color: labelColor, fontSize: size * 0.38, fontWeight: 700 }}>NC</span>
      )}
    </div>
  );
}
