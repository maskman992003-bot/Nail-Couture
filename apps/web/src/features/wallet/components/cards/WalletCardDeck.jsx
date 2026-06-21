import { TIER_ORDER } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import PearlCard from './PearlCard';
import AtelierCard from './AtelierCard';
import DiamondCard from './DiamondCard';

const CARD_COMPONENTS = {
  pearl: PearlCard,
  atelier: AtelierCard,
  diamond_couture: DiamondCard,
};

export default function WalletCardDeck({ activeTier, isFounding }) {
  const cards = TIER_ORDER.filter((tierId) => tierId !== 'regular_customer').map((tierId) => {
    const Card = CARD_COMPONENTS[tierId];
    const active = tierId === activeTier;
    return { tierId, active, Card };
  });

  return (
    <>
      <div className="md:hidden">
        <Swiper spaceBetween={12} slidesPerView={1.05} className="!pb-2">
          {cards.map(({ tierId, active, Card }) => (
            <SwiperSlide key={tierId}>
              <div className={active ? 'opacity-100' : 'opacity-60 scale-[0.98] transition-opacity'}>
                <Card active={active} isFounding={isFounding} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="hidden md:grid md:grid-cols-2 gap-4">
        {cards.map(({ tierId, active, Card }) => (
          <div key={tierId} className={active ? 'opacity-100' : 'opacity-55 transition-opacity'}>
            <Card active={active} isFounding={isFounding} />
          </div>
        ))}
      </div>
    </>
  );
}
