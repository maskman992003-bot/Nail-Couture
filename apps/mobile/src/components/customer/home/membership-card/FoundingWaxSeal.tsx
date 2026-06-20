import Svg, {
  Circle,
  Defs,
  Line,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

type SealPalette = {
  outer: string;
  mid: string;
  inner: string;
  text: string;
  highlight: string;
};

type FoundingWaxSealProps = {
  palette: SealPalette;
  size?: number;
};

export function FoundingWaxSeal({ palette, size = 44 }: FoundingWaxSealProps) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <RadialGradient id="sealWax" cx="35%" cy="30%" r="70%">
          <Stop offset="0%" stopColor={palette.highlight} />
          <Stop offset="55%" stopColor={palette.outer} />
          <Stop offset="100%" stopColor={palette.mid} />
        </RadialGradient>
      </Defs>
      <Circle cx={40} cy={40} r={36} fill="url(#sealWax)" stroke={palette.mid} strokeWidth={1.5} />
      <Circle cx={40} cy={40} r={30} fill="none" stroke={palette.mid} strokeWidth={0.75} opacity={0.55} />
      <Circle cx={40} cy={40} r={24} fill={palette.inner} stroke={palette.outer} strokeWidth={1.25} />
      {rays.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <Line
            key={deg}
            x1={40 + Math.cos(rad) * 26}
            y1={40 + Math.sin(rad) * 26}
            x2={40 + Math.cos(rad) * 32}
            y2={40 + Math.sin(rad) * 32}
            stroke={palette.outer}
            strokeWidth={0.9}
            opacity={0.6}
          />
        );
      })}
      <SvgText x={40} y={46} textAnchor="middle" fill={palette.text} fontSize={16} fontWeight="700">
        FM
      </SvgText>
    </Svg>
  );
}
