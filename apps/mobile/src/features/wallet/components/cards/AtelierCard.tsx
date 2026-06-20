import { TIER_CONFIG } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { TierCardBase } from './TierCardBase';

type AtelierCardProps = {
  width: number;
  height: number;
  active?: boolean;
  isFounding?: boolean;
};

export function AtelierCard({ width, height, active, isFounding }: AtelierCardProps) {
  const config = TIER_CONFIG.atelier;
  return (
    <TierCardBase
      width={width}
      height={height}
      title={config.name.toUpperCase()}
      subtitle={config.tagline}
      titleColor="#4A2C24"
      glowFounding={Boolean(isFounding && active)}
      borderColors={['#D4A574', '#A66B52']}
      gradientStops={[
        { offset: '0%', color: '#C9897A' },
        { offset: '50%', color: '#B8735A' },
        { offset: '100%', color: '#A86550' },
      ]}
    />
  );
}
