import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MYSTERY_GIFT_SLIDE_IN_AUTO_HIDE_SECONDS,
  MYSTERY_GIFT_TEASER_COPY,
} from '@nail-couture/shared/utils/mysteryGift';
import { ShimmerSurface } from './ShimmerSurface';
import { useThemeStyles } from '../../theme/useThemeStyles';

type MysteryGiftSlideInProps = {
  visible?: boolean;
  detailOpen?: boolean;
  preview?: boolean;
  onOpenDetail: () => void;
  onAutoHide?: () => void;
};

export function MysteryGiftSlideIn({
  visible = false,
  detailOpen = false,
  preview = false,
  onOpenDetail,
  onAutoHide,
}: MysteryGiftSlideInProps) {
  const styles = useThemeStyles();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible || detailOpen) return undefined;

    const timer = setTimeout(() => {
      onAutoHide?.();
    }, MYSTERY_GIFT_SLIDE_IN_AUTO_HIDE_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [visible, detailOpen, onAutoHide]);

  if (!visible) return null;

  const cardStyle = {
    position: preview ? ('relative' as const) : ('absolute' as const),
    left: preview ? undefined : 16,
    bottom: preview ? undefined : Math.max(insets.bottom, 12) + 56,
    alignSelf: preview ? ('flex-start' as const) : undefined,
    width: preview ? ('100%' as const) : 240,
    maxWidth: 280,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${styles.tokens.goldStrong}40`,
    backgroundColor: styles.tokens.cardBg,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 7,
    zIndex: 99,
  };

  return (
    <ShimmerSurface active style={cardStyle} borderRadius={16}>
      <Pressable onPress={onOpenDetail}>
        <Text style={[styles.textGold, { fontSize: 10, letterSpacing: 2, marginBottom: 4 }]}>
          {MYSTERY_GIFT_TEASER_COPY.slideInTitle.toUpperCase()}
        </Text>
        <Text style={[styles.textPrimary, { fontSize: 14, fontWeight: '600' }]}>
          {MYSTERY_GIFT_TEASER_COPY.slideInHook}
        </Text>
        <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 6 }]}>
          {MYSTERY_GIFT_TEASER_COPY.slideInTap}
        </Text>
      </Pressable>
    </ShimmerSurface>
  );
}
