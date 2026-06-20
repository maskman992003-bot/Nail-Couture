import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

type PearlFloralAccentProps = {
  width?: number;
  height?: number;
  color?: string;
};

export function PearlFloralAccent({ width = 280, height = 48, color = '#8B5E4A' }: PearlFloralAccentProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 48">
      <Path d="M8 28 Q20 22 32 28" stroke={color} strokeWidth={0.8} opacity={0.5} fill="none" />
      <Path
        d="M32 28 Q38 18 44 24 Q50 30 56 28 Q62 26 68 20 Q72 16 76 22 Q80 28 86 26"
        stroke={color}
        strokeWidth={0.9}
        opacity={0.55}
        fill="none"
      />
      <Ellipse cx={44} cy={22} rx={4} ry={6} stroke={color} strokeWidth={0.7} opacity={0.45} fill="none" />
      <Ellipse cx={72} cy={20} rx={4} ry={6} stroke={color} strokeWidth={0.7} opacity={0.45} fill="none" />
      <Path d="M86 26 L120 26" stroke={color} strokeWidth={0.6} opacity={0.4} fill="none" />
      <Circle cx={140} cy={26} r={5} stroke={color} strokeWidth={0.9} opacity={0.65} fill="none" />
      <Path d="M140 21 L140 16 M135 26 L130 26 M145 26 L150 26 M140 31 L140 36" stroke={color} strokeWidth={0.7} opacity={0.55} fill="none" />
      <Path d="M160 26 L194 26" stroke={color} strokeWidth={0.6} opacity={0.4} fill="none" />
      <Path
        d="M194 26 Q200 20 206 24 Q212 28 218 26 Q224 24 230 18 Q234 14 238 20 Q242 26 248 28"
        stroke={color}
        strokeWidth={0.9}
        opacity={0.55}
        fill="none"
      />
      <Path d="M248 28 Q260 22 272 28" stroke={color} strokeWidth={0.8} opacity={0.5} fill="none" />
    </Svg>
  );
}
