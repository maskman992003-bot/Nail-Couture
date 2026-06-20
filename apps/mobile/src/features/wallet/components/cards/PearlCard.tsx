import { TIER_CONFIG } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { TierCardBase } from './TierCardBase';

type PearlCardProps = {
  width: number;
  height: number;
  active?: boolean;
  isFounding?: boolean;
};

export function PearlCard({ width, height, active, isFounding }: PearlCardProps) {
  const config = TIER_CONFIG.pearl;
  return (
    <TierCardBase
      width={width}
      height={height}
      title={config.name.toUpperCase()}
      subtitle={config.tagline}
      titleColor="#3D3D3D"
      glowFounding={Boolean(isFounding && active)}
      borderColors={['#E8E4DF', '#C9B8B0']}
      gradientStops={[
        { offset: '0%', color: '#FAF8F5' },
        { offset: '45%', color: '#F0EBE6' },
        { offset: '70%', color: '#E8DFE8' },
        { offset: '100%', color: '#DFE8F0' },
      ]}
    />
  );
}
