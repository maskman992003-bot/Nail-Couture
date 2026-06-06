import Svg, { Path } from 'react-native-svg';
import { useThemeStyles } from '../theme/useThemeStyles';

type NavIconProps = {
  path: string;
  size?: number;
  active?: boolean;
};

export function NavIcon({ path, size = 20, active = false }: NavIconProps) {
  const { tokens } = useThemeStyles();
  const color = active ? tokens.goldStrong : tokens.textSecondary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={path}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
