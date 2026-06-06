import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { WAIVER_SECTIONS } from '../../constants/waiverTerms';
import { useThemeStyles } from '../../theme/useThemeStyles';

type WaiverModalProps = {
  visible: boolean;
  customerName?: string;
  customerPhone?: string;
  onConfirm: (payload: { agreed_to_terms: boolean; signature_image: string }) => void;
  onCancel: () => void;
};

export function WaiverModal({ visible, onConfirm, onCancel }: WaiverModalProps) {
  const styles = useThemeStyles();
  const signatureRef = useRef(null);
  const [agreed, setAgreed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const clearSignature = () => {
    (signatureRef.current as { clearSignature?: () => void } | null)?.clearSignature?.();
    setHasSignature(false);
  };

  const handleConfirm = () => {
    (signatureRef.current as { readSignature?: () => void } | null)?.readSignature?.();
  };

  const handleSignature = (signature: string) => {
    if (!signature) return;
    onConfirm({ agreed_to_terms: true, signature_image: signature });
    setAgreed(false);
    setHasSignature(false);
    (signatureRef.current as { clearSignature?: () => void } | null)?.clearSignature?.();
  };

  const canConfirm = agreed && hasSignature;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.screen, { paddingTop: 8 }]}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: styles.tokens.borderLight,
          }}
        >
          <Text style={[styles.textGold, { fontSize: 24, fontWeight: '600' }]}>NAIL COUTURE</Text>
          <Text style={styles.textSecondary}>Terms & Conditions and Customer Waiver</Text>
          <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
            Effective Date: June 1, 2026
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
          {WAIVER_SECTIONS.map((section) => (
            <View key={section.title}>
              <Text style={[styles.textGold, { fontWeight: '600', marginBottom: 4 }]}>{section.title}</Text>
              <Text style={[styles.textSecondary, { lineHeight: 20 }]}>{section.body}</Text>
            </View>
          ))}

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: styles.tokens.borderLight,
              paddingTop: 16,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Switch value={agreed} onValueChange={setAgreed} trackColor={{ true: styles.tokens.goldStrong }} />
              <Text style={[styles.textSecondary, { flex: 1, lineHeight: 20 }]}>
                I have read, understood, and voluntarily agree to all terms and conditions, health
                disclosures, and liability waiver.
              </Text>
            </View>

            <Text style={styles.textSecondary}>Please sign below:</Text>
            <View
              style={{
                height: 180,
                borderWidth: 2,
                borderColor: styles.tokens.borderLight,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: styles.tokens.bgSecondary,
              }}
            >
              <SignatureCanvas
                ref={signatureRef}
                onOK={handleSignature}
                onBegin={() => setHasSignature(true)}
                onEnd={() => setHasSignature(true)}
                onEmpty={() => setHasSignature(false)}
                descriptionText=""
                clearText=""
                confirmText=""
                webStyle={`
                  .m-signature-pad { box-shadow: none; border: none; margin: 0; }
                  .m-signature-pad--body { border: none; }
                  .m-signature-pad--footer { display: none; }
                  body, html { background: transparent; }
                `}
                penColor="#C5A059"
                backgroundColor="transparent"
              />
            </View>
            <Pressable onPress={clearSignature}>
              <Text style={styles.textGold}>Clear Signature</Text>
            </Pressable>
          </View>
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: styles.tokens.borderLight,
          }}
        >
          <Pressable
            onPress={onCancel}
            style={{
              flex: 1,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: styles.tokens.borderColor,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={styles.textSecondary}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            style={[
              styles.buttonPrimary,
              { flex: 1, opacity: canConfirm ? 1 : 0.5 },
            ]}
          >
            <Text style={styles.buttonPrimaryText}>Confirm Check-In</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
