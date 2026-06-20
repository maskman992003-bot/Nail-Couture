import { TIER_CONFIG } from '@nail-couture/shared/constants/loyaltyProgram.js';
import TierCardBase from './TierCardBase';

export default function PearlCard({ active, isFounding }) {
  const config = TIER_CONFIG.pearl;
  return (
    <TierCardBase
      title={config.name.toUpperCase()}
      subtitle={config.tagline}
      titleColor="#3D3D3D"
      glowFounding={Boolean(isFounding && active)}
      gradient="linear-gradient(135deg, #FAF8F5 0%, #F0EBE6 40%, #E8DFE8 70%, #DFE8F0 100%)"
    />
  );
}
