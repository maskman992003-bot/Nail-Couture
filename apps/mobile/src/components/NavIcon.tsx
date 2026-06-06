import { Icon } from './icons/Icon';
import { useThemeStyles } from '../theme/useThemeStyles';

type NavIconProps = {
  path: string;
  size?: number;
  active?: boolean;
};

export function NavIcon({ path, size = 20, active = false }: NavIconProps) {
  const { tokens } = useThemeStyles();

  return (
    <Icon
      path={path}
      size={size}
      color={active ? tokens.goldStrong : tokens.textSecondary}
    />
  );
}
