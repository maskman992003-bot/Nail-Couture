import { Text, View } from 'react-native';
import { formatFoundingBadge } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type WaxSealBadgeProps = {
  foundingType?: string | null;
  foundingSpot?: number | null;
  pending?: boolean;
  size?: number;
};

export function WaxSealBadge({
  foundingType,
  foundingSpot,
  pending = false,
  size = 28,
}: WaxSealBadgeProps) {
  const styles = useThemeStyles();
  const badge = foundingType && foundingSpot != null
    ? formatFoundingBadge(foundingType, foundingSpot)
    : null;

  const isVanguard = foundingType === 'vanguard';
  const isLegacy = foundingType === 'legacy';

  const bg = pending
    ? `${styles.tokens.textSecondary}33`
    : isVanguard
      ? '#1A1A1F'
      : isLegacy
        ? '#8B5E4A'
        : `${styles.tokens.goldStrong}22`;

  const border = pending
    ? `${styles.tokens.textSecondary}66`
    : isVanguard
      ? '#C5A059'
      : isLegacy
        ? '#E8B4A0'
        : `${styles.tokens.goldStrong}88`;

  const labelColor = pending ? styles.tokens.textSecondary : isVanguard ? '#F5E6C8' : '#FFF5EE';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: pending ? 0.1 : 0.35,
        shadowRadius: 3,
        elevation: 4,
      }}
    >
      {badge ? (
        <Text style={{ color: labelColor, fontSize: size * 0.22, fontWeight: '700', textAlign: 'center' }}>
          {badge}
        </Text>
      ) : (
        <Text style={{ color: labelColor, fontSize: size * 0.38, fontWeight: '700' }}>NC</Text>
      )}
    </View>
  );
}
