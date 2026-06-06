import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserHeaderActions } from '../UserHeaderActions';
import { useLayout } from '../../theme/useLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';

type CustomerScreenLayoutProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  headerRight?: ReactNode;
  showUserActions?: boolean;
};

export function CustomerScreenLayout({
  title,
  subtitle,
  children,
  headerRight,
  showUserActions = true,
}: CustomerScreenLayoutProps) {
  const styles = useThemeStyles();
  const layout = useLayout({ withBottomTabBar: true });
  const resolvedHeaderRight = headerRight ?? (showUserActions ? <UserHeaderActions /> : null);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={layout.pageContent}
        showsVerticalScrollIndicator={false}
      >
        {(title || subtitle || resolvedHeaderRight) && (
          <View style={styles.layout.pageHeader}>
            <View style={{ flex: 1 }}>
              {title ? (
                <Text style={[styles.textGold, { fontSize: 32, fontWeight: '600' }]}>{title}</Text>
              ) : null}
              {subtitle ? (
                <Text style={[styles.textSecondary, { marginTop: 4 }]}>{subtitle}</Text>
              ) : null}
            </View>
            {resolvedHeaderRight}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
