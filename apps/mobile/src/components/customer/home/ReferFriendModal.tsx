import { Linking, Pressable, Text, View } from 'react-native';
import { AppModal, ModalButton } from '../../AppModal';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type ReferFriendModalProps = {
  open: boolean;
  onClose: () => void;
  referralCode?: string;
  copiedCode?: boolean;
  onCopy: () => void;
};

export function ReferFriendModal({ open, onClose, referralCode, copiedCode, onCopy }: ReferFriendModalProps) {
  const styles = useThemeStyles();

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Refer a Friend"
      scrollBody
      footer={<ModalButton label="Done" variant="primary" onPress={onClose} />}
    >
      <View style={{ gap: 16, alignItems: 'center' }}>
        <Text style={[styles.textSecondary, { textAlign: 'center' }]}>
          Share the luxury. Friends get a discount on their first visit, and you earn bonus loyalty points!
        </Text>
        {referralCode ? (
          <>
            <Text style={[styles.textGold, { fontSize: 24, letterSpacing: 3, fontWeight: '700' }]}>{referralCode}</Text>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Pressable
                onPress={onCopy}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: `${styles.tokens.goldStrong}4D`,
                  backgroundColor: `${styles.tokens.goldStrong}26`,
                }}
              >
                <Text style={styles.textGold}>{copiedCode ? 'Copied' : 'Copy Code'}</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/?text=Use%20code%20${referralCode}%20at%20Nail%20Couture%20for%20an%20exclusive%20discount!`,
                  ).catch(() => undefined)
                }
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(37, 211, 102, 0.3)',
                  backgroundColor: 'rgba(37, 211, 102, 0.15)',
                }}
              >
                <Text style={{ color: '#25D366', fontWeight: '600' }}>WhatsApp</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.textSecondary}>Your referral code is being generated…</Text>
        )}
      </View>
    </AppModal>
  );
}
