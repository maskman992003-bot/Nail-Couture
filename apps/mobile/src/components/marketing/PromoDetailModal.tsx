import { Modal, Pressable, Text, View } from 'react-native';
import { ShimmerSurface } from './ShimmerSurface';
import { useThemeStyles } from '../../theme/useThemeStyles';

type PromoRecord = {
  id: string;
  title: string;
  subtitle?: string | null;
  body?: string;
  discount_label?: string;
  promo_code?: string;
  show_shimmer_cta?: boolean;
};

type PromoOfferCardProps = {
  promo: PromoRecord;
  onCopy?: (promo: PromoRecord) => void;
  preview?: boolean;
};

export function PromoOfferCard({ promo, onCopy, preview = false }: PromoOfferCardProps) {
  const styles = useThemeStyles();

  return (
    <View style={{ gap: 12 }}>
      {promo.subtitle ? (
        <Text style={[styles.textSecondary, { fontSize: 10, letterSpacing: 1.5 }]}>
          {promo.subtitle.toUpperCase()}
        </Text>
      ) : null}
      <Text style={[styles.textGold, { fontSize: 20, fontWeight: '600' }]}>{promo.title}</Text>
      {promo.body ? (
        <Text style={[styles.textSecondary, { lineHeight: 22 }]}>{promo.body}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {promo.discount_label ? (
          <View
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: `${styles.tokens.goldStrong}40`,
              backgroundColor: `${styles.tokens.goldStrong}15`,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={[styles.textGold, { fontSize: 12, fontWeight: '600' }]}>{promo.discount_label}</Text>
          </View>
        ) : null}
        {promo.promo_code && !preview && onCopy ? (
          <Pressable
            onPress={() => onCopy(promo)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: `${styles.tokens.goldStrong}40`,
              paddingHorizontal: 14,
              paddingVertical: 8,
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Text style={[styles.textGold, { fontSize: 11, letterSpacing: 1.5 }]}>COPY CODE</Text>
            <Text style={[styles.textGold, { fontFamily: 'monospace', letterSpacing: 1 }]}>{promo.promo_code}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type PromoDetailModalProps = {
  promo: PromoRecord | null;
  visible: boolean;
  onClose: () => void;
  onCopy?: (promo: PromoRecord) => void;
  preview?: boolean;
};

export function PromoDetailModal({ promo, visible, onClose, onCopy, preview = false }: PromoDetailModalProps) {
  const styles = useThemeStyles();

  if (!promo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}
        onPress={preview ? undefined : onClose}
      >
        <Pressable onPress={() => {}}>
        <ShimmerSurface
          active={Boolean(promo.show_shimmer_cta)}
          borderRadius={16}
          style={[styles.card, { padding: 20, maxWidth: 480, alignSelf: 'center', width: '100%' }]}
        >
          {!preview ? (
            <Pressable onPress={onClose} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
              <Text style={[styles.textSecondary, { fontSize: 22, lineHeight: 22 }]}>×</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.textGold, { fontSize: 10, letterSpacing: 2.5, marginBottom: 12 }]}>SALON OFFER</Text>
          <PromoOfferCard promo={promo} onCopy={onCopy} preview={preview} />
        </ShimmerSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
