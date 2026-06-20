import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

type MembershipFoundingSealProps = {
  size?: number;
};

export function MembershipFoundingSeal({ size = 56 }: MembershipFoundingSealProps) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Circle cx={40} cy={40} r={38} stroke="#C5A059" strokeWidth={1.5} opacity={0.9} fill="none" />
      <Circle cx={40} cy={40} r={32} stroke="#C5A059" strokeWidth={0.75} opacity={0.55} fill="none" />
      <Circle cx={40} cy={40} r={26} fill="#1A1A1F" stroke="#C5A059" strokeWidth={1.25} />
      {rays.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <Line
            key={deg}
            x1={40 + Math.cos(rad) * 28}
            y1={40 + Math.sin(rad) * 28}
            x2={40 + Math.cos(rad) * 34}
            y2={40 + Math.sin(rad) * 34}
            stroke="#C5A059"
            strokeWidth={1}
            opacity={0.65}
          />
        );
      })}
      <SvgText
        x={40}
        y={46}
        textAnchor="middle"
        fill="#E8D5A3"
        fontSize={18}
        fontWeight="700"
      >
        FM
      </SvgText>
    </Svg>
  );
}
