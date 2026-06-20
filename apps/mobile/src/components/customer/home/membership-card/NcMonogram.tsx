import Svg, { Defs, LinearGradient, Stop, Text as SvgText, Path, G } from 'react-native-svg';

type NcMonogramProps = {
  width?: number;
  height?: number;
  gradientId?: string;
};

export function NcMonogram({ width = 120, height = 80, gradientId = 'ncMetallic' }: NcMonogramProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 80">
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFD3D9" />
          <Stop offset="35%" stopColor="#C9897A" />
          <Stop offset="70%" stopColor="#8B5E4A" />
          <Stop offset="100%" stopColor="#B76E79" />
        </LinearGradient>
      </Defs>
      <G>
        <SvgText x={18} y={58} fill={`url(#${gradientId})`} fontSize={52} fontWeight="600">
          N
        </SvgText>
        <Path
          d="M62 18 C78 18, 92 28, 96 44 C100 58, 92 68, 78 68 C68 68, 58 62, 54 52"
          stroke={`url(#${gradientId})`}
          strokeWidth={4.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M54 52 C58 62, 68 72, 82 72 C96 72, 104 60, 100 44"
          stroke={`url(#${gradientId})`}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
        />
      </G>
    </Svg>
  );
}
