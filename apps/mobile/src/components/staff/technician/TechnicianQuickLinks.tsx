import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TIME_OFF_REQUESTS } from '@nail-couture/shared/constants/featureFlags.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';
import type { AppScreenName } from '../../../navigation/screenRegistry';

type QuickLink = {
  key: string;
  label: string;
  desc: string;
  screen: AppScreenName;
  icon: string;
  flag?: boolean;
};

const LINKS: QuickLink[] = [
  { key: 'schedule', label: 'My Schedule', desc: 'Week view & shifts', screen: 'Schedule', icon: '📅' },
  { key: 'customers', label: 'Customers', desc: 'Client history & notes', screen: 'Customers', icon: '👥' },
  {
    key: 'timeoff',
    label: 'Time Off',
    desc: 'Request time off',
    screen: 'Schedule',
    icon: '🏖️',
    flag: TIME_OFF_REQUESTS,
  },
  { key: 'settings', label: 'Settings', desc: 'Profile & preferences', screen: 'Settings', icon: '⚙️' },
];

export function TechnicianQuickLinks() {
  const styles = useThemeStyles();
  const navigation = useNavigation<BottomTabNavigationProp<Record<AppScreenName, undefined>>>();
  const items = LINKS.filter((link) => !link.flag || link.flag);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {items.map((link) => (
        <Pressable
          key={link.key}
          onPress={() => navigation.navigate(link.screen)}
          style={[styles.card, { width: '47%', padding: 16, alignItems: 'center' }]}
        >
          <Text style={{ fontSize: 28, marginBottom: 8 }}>{link.icon}</Text>
          <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', textAlign: 'center' }]}>
            {link.label}
          </Text>
          <Text style={[styles.textSecondary, { fontSize: 11, marginTop: 4, textAlign: 'center' }]}>
            {link.desc}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
