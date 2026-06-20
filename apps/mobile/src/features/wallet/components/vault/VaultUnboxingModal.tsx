import { useEffect, useRef } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useThemeStyles } from '../../../../theme/useThemeStyles';

type VaultUnboxingModalProps = {
  open: boolean;
  onClose: () => void;
  redemptionCode: string;
  rewardLabel?: string;
};

export function VaultUnboxingModal({ open, onClose, redemptionCode, rewardLabel }: VaultUnboxingModalProps) {
  const styles = useThemeStyles();
  const lidY = useSharedValue(0);
  const qrOpacity = useSharedValue(0);
  const started = useRef(false);

  useEffect(() => {
    if (!open) {
      started.current = false;
      lidY.value = 0;
      qrOpacity.value = 0;
      return;
    }
    if (started.current) return;
    started.current = true;
    lidY.value = withSequence(withTiming(-80, { duration: 500 }), withTiming(-80, { duration: 100 }));
    qrOpacity.value = withTiming(1, { duration: 400 });
  }, [open, lidY, qrOpacity]);

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lidY.value }],
  }));

  const qrStyle = useAnimatedStyle(() => ({
    opacity: qrOpacity.value,
  }));

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 }} onPress={onClose}>
        <Pressable
          style={[styles.card, { padding: 24, alignItems: 'center' }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.textGold, { fontSize: 18, fontWeight: '600', marginBottom: 8 }]}>Unboxing</Text>
          {rewardLabel ? <Text style={[styles.textSecondary, { marginBottom: 16 }]}>{rewardLabel}</Text> : null}

          <View style={{ width: 200, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Animated.View
              style={[
                {
                  width: 180,
                  height: 40,
                  backgroundColor: `${styles.tokens.goldStrong}88`,
                  borderRadius: 8,
                  position: 'absolute',
                  top: 0,
                },
                lidStyle,
              ]}
            />
            <Animated.View style={qrStyle}>
              <QRCode value={redemptionCode} size={160} backgroundColor="transparent" color={styles.tokens.goldStrong} />
            </Animated.View>
          </View>

          <Text style={[styles.textSecondary, { fontSize: 12, letterSpacing: 2, marginBottom: 16 }]}>
            {redemptionCode}
          </Text>
          <Pressable onPress={onClose} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: `${styles.tokens.goldStrong}66` }}>
            <Text style={styles.textGold}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
