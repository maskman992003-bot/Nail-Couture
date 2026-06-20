import { TIER_CONFIG } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { LANDING_CONTACT } from '../../../../themes/landingContent.js';
import TierCardBase from './TierCardBase';

export default function DiamondCard({ active, isFounding }) {
  const config = TIER_CONFIG.diamond_couture;
  return (
    <TierCardBase
      title={config.name.toUpperCase()}
      subtitle={config.tagline}
      titleColor="#E8E8EC"
      glowFounding={Boolean(isFounding && active)}
      gradient="linear-gradient(160deg, #1A1A22 0%, #121218 50%, #0A0A0E 100%)"
      onConciergePress={() => window.open(`tel:${LANDING_CONTACT.phoneTel}`, '_self')}
    />
  );
}
