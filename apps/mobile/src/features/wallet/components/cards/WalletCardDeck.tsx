import { useMemo } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { TIER_ORDER } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { useLayout } from '../../../../theme/useLayout';
import { PearlCard } from './PearlCard';
import { AtelierCard } from './AtelierCard';
import { DiamondCard } from './DiamondCard';

type WalletCardDeckProps = {
  activeTier: string;
  isFounding?: boolean;
};

const CARD_HEIGHT = 200;

export function WalletCardDeck({ activeTier, isFounding }: WalletCardDeckProps) {
  const { width } = useWindowDimensions();
  const layout = useLayout();
  const cardWidth = layout.isMdUp ? (width - layout.horizontalPadding * 2 - 16) / 2 : width - layout.horizontalPadding * 2 - 8;

  const cards = useMemo(
    () =>
      TIER_ORDER.filter((tierId) => tierId !== 'regular_customer').map((tierId) => {
        const active = tierId === activeTier;
        const props = { width: cardWidth, height: CARD_HEIGHT, active, isFounding };
        if (tierId === 'pearl') return { key: tierId, node: <PearlCard {...props} /> };
        if (tierId === 'atelier') return { key: tierId, node: <AtelierCard {...props} /> };
        return { key: tierId, node: <DiamondCard {...props} /> };
      }),
    [activeTier, cardWidth, isFounding],
  );

  if (layout.isMdUp) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {cards.map((c) => (
          <View key={c.key} style={{ width: cardWidth, opacity: c.key === activeTier ? 1 : 0.55 }}>
            {c.node}
          </View>
        ))}
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={cards}
      keyExtractor={(item) => item.key}
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + 12}
      decelerationRate="fast"
      contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
      renderItem={({ item }) => (
        <View style={{ width: cardWidth, opacity: item.key === activeTier ? 1 : 0.65 }}>{item.node}</View>
      )}
    />
  );
}
