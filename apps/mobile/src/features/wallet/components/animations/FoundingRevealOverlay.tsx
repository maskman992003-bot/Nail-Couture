import { Modal, Pressable, Text, View } from 'react-native';
import { formatFoundingBadge } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { useThemeStyles } from '../../../../theme/useThemeStyles';
import { WaxSealBadge } from '../WaxSealBadge';

type FoundingRevealOverlayProps = {
  open: boolean;
  foundingType: string;
  foundingSpot: number;
  onDismiss: () => void;
};

export function FoundingRevealOverlay({
  open,
  foundingType,
  foundingSpot,
  onDismiss,
}: FoundingRevealOverlayProps) {
  const styles = useThemeStyles();
  const badge = formatFoundingBadge(foundingType, foundingSpot);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={[styles.textSecondary, { fontSize: 12, letterSpacing: 3, marginBottom: 24 }]}>FOUNDING MEMBER</Text>
        <WaxSealBadge foundingType={foundingType} foundingSpot={foundingSpot} size={120} />
        <Text style={[styles.textGold, { fontSize: 28, fontWeight: '700', marginTop: 24 }]}>{badge}</Text>
        <Text style={[styles.textSecondary, { textAlign: 'center', marginTop: 12, lineHeight: 22 }]}>
          Your numbered wax seal is now permanently stamped on your profile.
        </Text>
        <Pressable
          onPress={onDismiss}
          style={{
            marginTop: 32,
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: 10,
            backgroundColor: `${styles.tokens.goldStrong}33`,
            borderWidth: 1,
            borderColor: styles.tokens.goldStrong,
          }}
        >
          <Text style={styles.textGold}>Enter The Wallet</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
