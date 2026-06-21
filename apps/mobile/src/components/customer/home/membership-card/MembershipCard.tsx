/**
 * POSITION TUNING (GIMP-exported assets)
 * --------------------------------------
 * Per-tier text alignment lives in MEMBERSHIP_CARD_TIER_LAYOUT inside
 * @nail-couture/shared/constants/membershipCardLayout.js — edit `positions`
 * top/left percentages for each tier's name and id fields.
 *
 * Font sizes scale from measured card height so text stays visible at any size.
 */
import { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';
import {
  MEMBERSHIP_CARD_ASPECT_RATIO,
  MEMBERSHIP_CARD_FOUNDING_RESERVE,
  MEMBERSHIP_CARD_HERO,
  formatMembershipCardId,
  getMembershipCardAlt,
  getMembershipCardFontSizes,
  getMembershipCardLayout,
  getMembershipCardMobileTextStyle,
  getMembershipCardHeroWidth,
} from '@nail-couture/shared/constants/membershipCardLayout.js';
import { normalizeMembershipTierId } from '@nail-couture/shared/constants/membershipCardImages.js';
import { FoundingWaxSeal } from './FoundingWaxSeal';

type SealPalette = {
  outer: string;
  mid: string;
  inner: string;
  text: string;
  highlight: string;
};

type MembershipCardProps = {
  name: string;
  id: string;
  tier: string;
  tierId: string;
  backgroundImage: ImageSourcePropType;
  fillSlot?: boolean;
  isFounding?: boolean;
  foundingYear?: number;
  sealPalette?: SealPalette;
};

const CARD_BORDER_RADIUS = MEMBERSHIP_CARD_HERO.borderRadiusPx;
const CARD_HEIGHT = MEMBERSHIP_CARD_HERO.heightPx;
const CARD_WIDTH = getMembershipCardHeroWidth();

function OverlayText({
  value,
  position,
  fieldStyle,
  textShadowColor,
  cardHeightPx,
}: {
  value: string;
  position: { top: string; left: string };
  fieldStyle: Record<string, unknown>;
  textShadowColor: string;
  cardHeightPx: number;
}) {
  const mobileStyle = getMembershipCardMobileTextStyle(fieldStyle, cardHeightPx);
  const hasTextOutline = Boolean(fieldStyle.textStroke);

  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.65}
      numberOfLines={1}
      style={[
        styles.overlayText,
        {
          top: position.top,
          left: position.left,
          textShadowColor: hasTextOutline ? '#000' : textShadowColor,
          textShadowOffset: hasTextOutline ? { width: 0, height: 0 } : { width: 0, height: 1 },
          textShadowRadius: hasTextOutline ? 2 : 3,
          ...mobileStyle,
        },
      ]}
    >
      {value}
    </Text>
  );
}

export function MembershipCard({
  name,
  id,
  tier,
  tierId,
  backgroundImage,
  fillSlot = false,
  isFounding = false,
  foundingYear,
  sealPalette,
}: MembershipCardProps) {
  const [cardHeightPx, setCardHeightPx] = useState(CARD_HEIGHT);
  const layout = getMembershipCardLayout(tierId);
  const alt = getMembershipCardAlt({ name, tier });
  const displayName = name?.trim() || 'Member';
  const normalizedTier = normalizeMembershipTierId(tierId);
  const shadowColor = normalizedTier === 'diamond_couture'
    ? 'rgba(0,0,0,0.85)'
    : 'rgba(0,0,0,0.55)';
  const scaledFonts = getMembershipCardFontSizes(cardHeightPx);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0 && Math.abs(nextHeight - cardHeightPx) > 0.5) {
      setCardHeightPx(nextHeight);
    }
  };

  return (
    <View
      style={fillSlot ? styles.containerFill : styles.container}
      onLayout={handleLayout}
    >
      <Image
        key={
          typeof backgroundImage === 'number'
            ? String(backgroundImage)
            : ('uri' in backgroundImage ? backgroundImage.uri : 'membership-card')
        }
        source={backgroundImage}
        accessibilityLabel={alt}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.overlay,
          isFounding ? { paddingBottom: MEMBERSHIP_CARD_FOUNDING_RESERVE } : null,
        ]}
        pointerEvents="none"
      >
        <OverlayText
          value={displayName}
          position={layout.positions.name}
          fieldStyle={layout.name}
          textShadowColor={shadowColor}
          cardHeightPx={cardHeightPx}
        />
        <OverlayText
          value={formatMembershipCardId(id)}
          position={layout.positions.id}
          fieldStyle={layout.id}
          textShadowColor={shadowColor}
          cardHeightPx={cardHeightPx}
        />
      </View>

      {isFounding && sealPalette ? (
        <>
          <View style={styles.seal}>
            <FoundingWaxSeal palette={sealPalette} size={scaledFonts.seal} />
          </View>
          <View style={styles.foundingBadge}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={[styles.foundingBadgeText, { fontSize: scaledFonts.founding }]}
            >
              Founding Member • Est. {foundingYear}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    aspectRatio: MEMBERSHIP_CARD_ASPECT_RATIO,
    borderRadius: CARD_BORDER_RADIUS,
    borderWidth: 1,
    borderColor: '#C5A05933',
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  containerFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  overlayText: {
    position: 'absolute',
    maxWidth: '90%',
  },
  seal: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },
  foundingBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(183,110,121,0.45)',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderBottomLeftRadius: CARD_BORDER_RADIUS,
    borderBottomRightRadius: CARD_BORDER_RADIUS,
    zIndex: 10,
  },
  foundingBadgeText: {
    color: '#8B5E4A',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
