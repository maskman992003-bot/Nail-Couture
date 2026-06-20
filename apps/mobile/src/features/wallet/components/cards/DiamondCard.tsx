import { Linking } from 'react-native';
import { TIER_CONFIG } from '@nail-couture/shared/constants/loyaltyProgram.js';
import { TierCardBase } from './TierCardBase';

type DiamondCardProps = {
  width: number;
  height: number;
  active?: boolean;
  isFounding?: boolean;
};

export function DiamondCard({ width, height, active, isFounding }: DiamondCardProps) {
  const config = TIER_CONFIG.diamond_couture;

  return (
    <TierCardBase
      width={width}
      height={height}
      title={config.name.toUpperCase()}
      subtitle={config.tagline}
      titleColor="#E8E8EC"
      glowFounding={Boolean(isFounding && active)}
      borderColors={['#A8C8FF', '#7080A0']}
      gradientStops={[
        { offset: '0%', color: '#1A1A22' },
        { offset: '40%', color: '#121218' },
        { offset: '100%', color: '#0A0A0E' },
      ]}
      onConciergePress={() => Linking.openURL('tel:+15044817879').catch(() => undefined)}
    />
  );
}
