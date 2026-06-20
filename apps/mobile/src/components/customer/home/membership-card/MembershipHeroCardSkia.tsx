import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  Group,
  LinearGradient,
  RadialGradient,
  RoundedRect,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  getSkiaFillStops,
  MEMBERSHIP_CARD_PARALLAX,
} from '@nail-couture/shared/constants/membershipCardThemes.js';
import { useTiltSensor } from '../../../features/wallet/hooks/useTiltSensor';
import { NcMonogram } from './NcMonogram';
import { PearlFloralAccent } from './PearlFloralAccent';
import { AtelierOrchidAccent } from './AtelierOrchidAccent';
import { DiamondCrownAccent } from './DiamondCrownAccent';
import { FoundingWaxSeal } from './FoundingWaxSeal';

type MembershipCardTheme = ReturnType<
  typeof import('@nail-couture/shared/constants/membershipCardThemes.js').getMembershipCardTheme
>;

type MembershipHeroCardSkiaProps = {
  theme: MembershipCardTheme;
  subtitle: string | null;
};

function TierDecor({
  tierId,
  color,
  width,
}: {
  tierId: string;
  color: string;
  width: number;
}) {
  const decorWidth = Math.min(width * 0.88, 320);

  if (tierId === 'pearl') {
    return <PearlFloralAccent width={decorWidth} color={color} />;
  }
  if (tierId === 'atelier') {
    return <AtelierOrchidAccent variant="icon" color={color} />;
  }
  return <DiamondCrownAccent width={decorWidth} color={color} />;
}

export function MembershipHeroCardSkia({ theme, subtitle }: MembershipHeroCardSkiaProps) {
  const [layout, setLayout] = useState({ width: 0, height: 200 });
  const { tiltX, tiltY } = useTiltSensor(true);
  const fillShiftX = tiltX * MEMBERSHIP_CARD_PARALLAX.fill;
  const fillShiftY = tiltY * MEMBERSHIP_CARD_PARALLAX.fill;
  const decorShiftX = tiltX * MEMBERSHIP_CARD_PARALLAX.decor;
  const decorShiftY = tiltY * MEMBERSHIP_CARD_PARALLAX.decor;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0) {
      setLayout({ width, height: Math.max(height, theme.minHeight) });
    }
  };

  const fillStops = useMemo(() => getSkiaFillStops(theme), [theme]);
  const isDiamond = theme.id === 'diamond_couture';
  const isPearl = theme.id === 'pearl';
  const inset = theme.insetPadding;
  const monogramWidth = Math.min(layout.width * 0.42, 160);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.card,
        {
          aspectRatio: theme.aspectRatio,
          minHeight: theme.minHeight,
          borderColor: theme.outerBorder,
          borderWidth: theme.outerBorderWidth,
          shadowColor: isDiamond ? '#7080A0' : theme.accentColor,
        },
      ]}
    >
      {layout.width > 0 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group>
            <RoundedRect x={0} y={0} width={layout.width} height={layout.height} r={20}>
              <LinearGradient
                start={vec(fillShiftX, fillShiftY)}
                end={vec(layout.width + fillShiftX, layout.height + fillShiftY)}
                colors={fillStops.map((s) => s.color)}
                positions={fillStops.map((s) => s.offset)}
              />
            </RoundedRect>

            {isPearl ? (
              <>
                <RoundedRect x={0} y={0} width={layout.width} height={layout.height} r={20} opacity={0.55}>
                  <RadialGradient
                    c={vec(layout.width * 0.28 + fillShiftX, layout.height * 0.18 + fillShiftY)}
                    r={layout.width * 0.55}
                    colors={['rgba(255,240,245,0.95)', 'transparent']}
                  />
                </RoundedRect>
                <RoundedRect x={0} y={0} width={layout.width} height={layout.height} r={20} opacity={0.45}>
                  <RadialGradient
                    c={vec(layout.width * 0.72 + fillShiftX, layout.height * 0.78 + fillShiftY)}
                    r={layout.width * 0.5}
                    colors={['rgba(210,225,255,0.75)', 'transparent']}
                  />
                </RoundedRect>
              </>
            ) : null}

            {isDiamond ? (
              <RoundedRect
                x={1}
                y={1}
                width={layout.width - 2}
                height={layout.height - 2}
                r={18}
                style="stroke"
                strokeWidth={2}
              >
                <SweepGradient
                  c={vec(layout.width / 2, layout.height / 2)}
                  colors={theme.prismaticBorder || ['#E8E8EC', '#A8C8FF', '#7080A0', '#C0C0C0', '#E8E8EC']}
                />
              </RoundedRect>
            ) : (
              <RoundedRect
                x={inset}
                y={inset}
                width={layout.width - inset * 2}
                height={layout.height - inset * 2}
                r={16}
                style="stroke"
                strokeWidth={theme.insetBorderWidth}
                color={theme.insetBorder}
              />
            )}
          </Group>
        </Canvas>
      ) : null}

      {theme.id === 'atelier' ? (
        <View
          style={[
            styles.backdropDecor,
            { transform: [{ translateX: decorShiftX * 1.4 }, { translateY: decorShiftY * 1.2 }] },
          ]}
        >
          <AtelierOrchidAccent variant="full" width={layout.width * 0.38} color={theme.accentColor} />
        </View>
      ) : null}

      {theme.isFounding ? (
        <View style={styles.sealWrap}>
          <FoundingWaxSeal palette={theme.foundingSealPalette} size={44} />
        </View>
      ) : null}

      <View style={styles.content}>
        <View style={{ transform: [{ translateX: decorShiftX * 0.3 }, { translateY: decorShiftY * 0.3 }] }}>
          <NcMonogram width={monogramWidth} height={monogramWidth * 0.66} />
        </View>

        <Text
          style={[
            styles.brand,
            {
              color: theme.brandColor,
              letterSpacing: layout.width < 360 ? 3 : 5,
            },
          ]}
        >
          NAIL COUTURE
        </Text>

        <Text
          style={[
            styles.tierScript,
            {
              color: theme.tierScriptColor,
              fontSize: layout.width < 360 ? 22 : 28,
            },
          ]}
        >
          {theme.tierName} Member
        </Text>

        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.subtitleColor }]}>{subtitle}</Text>
        ) : null}

        <View style={{ transform: [{ translateX: decorShiftX }, { translateY: decorShiftY }], marginTop: 8 }}>
          <TierDecor tierId={theme.id} color={theme.accentColor} width={layout.width || 320} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brand: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tierScript: {
    marginTop: 4,
    fontStyle: 'italic',
    fontWeight: '500',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sealWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
  },
  backdropDecor: {
    position: 'absolute',
    left: -4,
    bottom: 8,
    opacity: 0.35,
  },
});
