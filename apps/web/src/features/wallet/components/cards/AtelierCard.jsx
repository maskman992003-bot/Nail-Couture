import { TIER_CONFIG } from '@nail-couture/shared/constants/loyaltyProgram.js';
import TierCardBase from './TierCardBase';

export default function AtelierCard({ active, isFounding }) {
  const config = TIER_CONFIG.atelier;
  return (
    <TierCardBase
      title={config.name.toUpperCase()}
      subtitle={config.tagline}
      titleColor="#4A2C24"
      glowFounding={Boolean(isFounding && active)}
      gradient="linear-gradient(145deg, #D4A574 0%, #C9897A 45%, #B8735A 100%)"
    />
  );
}
