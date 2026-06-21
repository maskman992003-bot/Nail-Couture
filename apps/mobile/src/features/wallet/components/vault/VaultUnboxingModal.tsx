import { useEffect, useRef } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useThemeStyles } from '../../../../theme/useThemeStyles';

type VaultUnboxingModalProps = {
  open: boolean;
  onClose: () => void;
  redemptionCode: string;
  rewardLabel?: string;
  reviewMode?: boolean;
};

export function VaultUnboxingModal({
  open,
  onClose,
  redemptionCode,
  rewardLabel,
  reviewMode = false,
}: VaultUnboxingModalProps) {
  const styles = useThemeStyles();
  const lidY = useSharedValue(reviewMode ? 0 : 72);
  const qrOpacity = useSharedValue(reviewMode ? 1 : 0);
  const started = useRef(false);
  const title = reviewMode ? 'Your reward code' : 'Unboxing';

  useEffect(() => {
    if (!open) {
      started.current = false;
      lidY.value = reviewMode ? 0 : 72;
      qrOpacity.value = reviewMode ? 1 : 0;
      return;
    }
    if (reviewMode) {
      lidY.value = 0;
      qrOpacity.value = 1;
      return;
    }
    if (started.current) return;
    started.current = true;
    lidY.value = withTiming(0, { duration: 500 });
    qrOpacity.value = withTiming(1, { duration: 400 });
  }, [open, lidY, qrOpacity, reviewMode]);

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lidY.value }],
  }));

  const qrStyle = useAnimatedStyle(() => ({
    opacity: qrOpacity.value,
  }));

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 }}
        onPress={onClose}
      >
        <Pressable
          style={[styles.card, { padding: 24, alignItems: 'center' }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ width: '100%', maxWidth: 280, minHeight: 220, marginBottom: 16, alignItems: 'center' }}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  zIndex: 2,
                  alignSelf: 'center',
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: `${styles.tokens.goldStrong}88`,
                  backgroundColor: `${styles.tokens.goldStrong}22`,
                  alignItems: 'center',
                },
                lidStyle,
              ]}
            >
              <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600', marginBottom: 4 }]}>
                {title}
              </Text>
              {rewardLabel ? (
                <Text style={[styles.textSecondary, { fontSize: 14 }]}>{rewardLabel}</Text>
              ) : null}
            </Animated.View>

            <View style={{ paddingTop: 112, paddingBottom: 8, alignItems: 'center' }}>
              <Animated.View style={qrStyle}>
                <QRCode
                  value={redemptionCode}
                  size={160}
                  backgroundColor="transparent"
                  color={styles.tokens.goldStrong}
                />
              </Animated.View>
            </View>
          </View>

          <Text style={[styles.textSecondary, { fontSize: 12, letterSpacing: 2, marginBottom: reviewMode ? 8 : 16 }]}>
            {redemptionCode}
          </Text>
          {reviewMode ? (
            <Text style={[styles.textSecondary, { fontSize: 12, marginBottom: 16, textAlign: 'center' }]}>
              Show this code or QR at checkout.
            </Text>
          ) : null}
          <Pressable
            onPress={onClose}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: `${styles.tokens.goldStrong}66`,
            }}
          >
            <Text style={styles.textGold}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
