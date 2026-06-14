import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShimmerSurface } from './ShimmerSurface';
import { useThemeStyles } from '../../theme/useThemeStyles';

type PromoRecord = {
  id: string;
  title: string;
  promo_code?: string;
  discount_label?: string;
  show_shimmer_cta?: boolean;
  slide_in_auto_hide_seconds?: number | null;
};

type PromoSlideInProps = {
  promo: PromoRecord | null;
  visible?: boolean;
  detailOpen?: boolean;
  preview?: boolean;
  onOpenDetail: (promo: PromoRecord) => void;
  onAutoHide?: () => void;
};

export function PromoSlideIn({
  promo,
  visible = false,
  detailOpen = false,
  preview = false,
  onOpenDetail,
  onAutoHide,
}: PromoSlideInProps) {
  const styles = useThemeStyles();
  const insets = useSafeAreaInsets();

  const autoHideSeconds = Number(promo?.slide_in_auto_hide_seconds) || 0;

  useEffect(() => {
    if (!promo || !visible || detailOpen || autoHideSeconds <= 0) return undefined;

    const timer = setTimeout(() => {
      onAutoHide?.();
    }, autoHideSeconds * 1000);

    return () => clearTimeout(timer);
  }, [promo?.id, visible, detailOpen, autoHideSeconds, onAutoHide]);

  if (!promo || !visible) return null;

  const cardStyle = {
    position: preview ? ('relative' as const) : ('absolute' as const),
    left: preview ? undefined : 16,
    right: preview ? undefined : 16,
    bottom: preview ? undefined : Math.max(insets.bottom, 12) + 56,
    alignSelf: preview ? ('center' as const) : undefined,
    width: preview ? ('100%' as const) : undefined,
    maxWidth: 280,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${styles.tokens.goldStrong}40`,
    backgroundColor: styles.tokens.cardBg,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  };

  return (
    <ShimmerSurface active={Boolean(promo.show_shimmer_cta)} style={cardStyle} borderRadius={16}>
      <Pressable onPress={() => onOpenDetail(promo)}>
        <Text style={[styles.textGold, { fontSize: 10, letterSpacing: 2, marginBottom: 4 }]}>SPECIAL OFFER</Text>
        <Text style={[styles.textPrimary, { fontSize: 14, fontWeight: '600' }]}>{promo.title}</Text>
        {promo.discount_label ? (
          <Text style={[styles.textSecondary, { fontSize: 12, marginTop: 4 }]}>{promo.discount_label}</Text>
        ) : null}
        <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 6 }]}>Tap to view offer</Text>
      </Pressable>
    </ShimmerSurface>
  );
}
