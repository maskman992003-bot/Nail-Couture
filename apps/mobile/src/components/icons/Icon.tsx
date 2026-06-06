import Svg, { Path } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { iconPaths, settingsPaths } from '@nail-couture/shared/icons/paths.js';

export type IconName = keyof typeof iconPaths | 'settings';

type IconProps = {
  name?: IconName;
  path?: string;
  paths?: string[];
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

function resolvePaths({
  name,
  path,
  paths,
}: Pick<IconProps, 'name' | 'path' | 'paths'>): string[] {
  if (paths?.length) return paths;
  if (path) return [path];
  if (name === 'settings') return settingsPaths;
  if (name && name in iconPaths) return [iconPaths[name as keyof typeof iconPaths]];
  return [];
}

/**
 * Renders web-equivalent stroke icons using react-native-svg.
 * Matches web: fill="none" stroke="currentColor" viewBox="0 0 24 24"
 */
export function Icon({
  name,
  path,
  paths,
  size = 20,
  color = '#888888',
  strokeWidth = 2,
  style,
  accessibilityLabel,
}: IconProps) {
  const segments = resolvePaths({ name, path, paths });

  if (segments.length === 0) {
    return null;
  }

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {segments.map((d, index) => (
          <Path
            key={`${d.slice(0, 12)}-${index}`}
            d={d}
            stroke={color}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

export { iconPaths, settingsPaths, BELL_PATH, LOGOUT_PATH } from '@nail-couture/shared/icons/paths.js';
