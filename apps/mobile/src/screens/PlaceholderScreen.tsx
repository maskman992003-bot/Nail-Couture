import { Text, View } from 'react-native';
import { AppLayout } from '../components/AppLayout';
import { useThemeStyles } from '../theme/useThemeStyles';

type PlaceholderScreenProps = {
  route: { name: string };
};

export function PlaceholderScreen({ route }: PlaceholderScreenProps) {
  const styles = useThemeStyles();

  return (
    <AppLayout title={route.name} subtitle="Screen scaffold ready for Phase 1+ port">
      <View style={[styles.card, { padding: 20, marginTop: 12 }]}>
        <Text style={styles.textSecondary}>
          This screen will be fully ported in the next migration phase. Navigation, auth, and tab
          bar wiring are in place.
        </Text>
      </View>
    </AppLayout>
  );
}
