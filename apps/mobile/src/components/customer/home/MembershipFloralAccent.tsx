import Svg, { Ellipse, Path } from 'react-native-svg';

type MembershipFloralAccentProps = {
  width?: number;
  height?: number;
  color?: string;
};

export function MembershipFloralAccent({ width = 96, height = 128, color = '#C5A059' }: MembershipFloralAccentProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 160" fill="none">
      <Path
        d="M60 20 C45 35 35 55 38 75 C40 90 52 98 60 105 C68 98 80 90 82 75 C85 55 75 35 60 20Z"
        stroke={color}
        strokeWidth={1.2}
        opacity={0.55}
      />
      <Path
        d="M60 105 L60 145 M45 120 Q60 110 75 120 M50 135 Q60 128 70 135"
        stroke={color}
        strokeWidth={1}
        opacity={0.45}
      />
      <Ellipse cx={48} cy={58} rx={8} ry={12} stroke={color} strokeWidth={0.8} opacity={0.35} />
      <Ellipse cx={72} cy={58} rx={8} ry={12} stroke={color} strokeWidth={0.8} opacity={0.35} />
    </Svg>
  );
}
