import Svg, { Path, Ellipse, Circle } from 'react-native-svg';

type AtelierOrchidAccentProps = {
  width?: number;
  height?: number;
  color?: string;
  variant?: 'full' | 'icon';
};

export function AtelierOrchidAccent({
  width = 40,
  height = 32,
  color = '#8B5E4A',
  variant = 'icon',
}: AtelierOrchidAccentProps) {
  if (variant === 'full') {
    return (
      <Svg width={width} height={height} viewBox="0 0 120 140">
        <Path d="M60 130 L60 70" stroke={color} strokeWidth={1} opacity={0.45} fill="none" />
        <Ellipse cx={38} cy={88} rx={14} ry={22} stroke={color} strokeWidth={1} opacity={0.4} fill="none" />
        <Ellipse cx={82} cy={88} rx={14} ry={22} stroke={color} strokeWidth={1} opacity={0.4} fill="none" />
        <Path d="M60 58 Q52 42 60 28 Q68 42 60 58" stroke={color} strokeWidth={1} opacity={0.5} fill="none" />
        <Circle cx={60} cy={24} r={6} stroke={color} strokeWidth={0.9} opacity={0.45} fill="none" />
      </Svg>
    );
  }

  return (
    <Svg width={width} height={height} viewBox="0 0 40 32">
      <Path d="M20 28 L20 14 M14 20 Q20 12 26 20" stroke={color} strokeWidth={1} opacity={0.7} fill="none" />
      <Ellipse cx={14} cy={18} rx={5} ry={8} stroke={color} strokeWidth={0.8} opacity={0.55} fill="none" />
      <Ellipse cx={26} cy={18} rx={5} ry={8} stroke={color} strokeWidth={0.8} opacity={0.55} fill="none" />
      <Circle cx={20} cy={10} r={3} stroke={color} strokeWidth={0.7} opacity={0.6} fill="none" />
    </Svg>
  );
}
