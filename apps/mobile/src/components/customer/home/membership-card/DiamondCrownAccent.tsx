import Svg, { Path, Circle } from 'react-native-svg';

type DiamondCrownAccentProps = {
  width?: number;
  height?: number;
  color?: string;
};

export function DiamondCrownAccent({ width = 280, height = 40, color = '#A8C8FF' }: DiamondCrownAccentProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 40">
      <Path d="M20 22 L140 22" stroke={color} strokeWidth={0.5} opacity={0.35} fill="none" />
      <Path d="M140 22 L260 22" stroke={color} strokeWidth={0.5} opacity={0.35} fill="none" />
      <Path
        d="M128 24 L134 14 L140 20 L146 14 L152 24 L140 28 Z"
        stroke={color}
        strokeWidth={1}
        fill="none"
        opacity={0.75}
      />
      <Circle cx={134} cy={16} r={1.5} fill={color} opacity={0.6} />
      <Circle cx={146} cy={16} r={1.5} fill={color} opacity={0.6} />
      <Circle cx={140} cy={20} r={1.5} fill={color} opacity={0.6} />
    </Svg>
  );
}
