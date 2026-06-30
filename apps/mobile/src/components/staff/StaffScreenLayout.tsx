import type { ReactNode, RefObject } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserHeaderActions } from '../UserHeaderActions';
import { useLayout } from '../../theme/useLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';

type StaffScreenLayoutProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  headerRight?: ReactNode;
  showUserActions?: boolean;
  refreshControl?: React.ReactElement<typeof RefreshControl>;
};

export function StaffScreenLayout({
  title,
  subtitle,
  children,
  scrollRef,
  headerRight,
  showUserActions = true,
  refreshControl,
}: StaffScreenLayoutProps) {
  const styles = useThemeStyles();
  const layout = useLayout({ withBottomTabBar: true });
  const resolvedHeaderRight = headerRight ?? (showUserActions ? <UserHeaderActions /> : null);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={layout.pageContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {(title || subtitle || resolvedHeaderRight) && (
          <View style={styles.layout.pageHeader}>
            <View style={{ flex: 1 }}>
              {title ? (
                <Text style={[styles.textGold, { fontSize: 28, fontWeight: '600' }]}>{title}</Text>
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
