import type { ReactNode, RefObject } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserHeaderActions } from '../UserHeaderActions';
import { useThemeStyles } from '../../theme/useThemeStyles';

type StaffScreenLayoutProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  headerRight?: ReactNode;
  showUserActions?: boolean;
};

export function StaffScreenLayout({
  title,
  subtitle,
  children,
  scrollRef,
  headerRight,
  showUserActions = true,
}: StaffScreenLayoutProps) {
  const styles = useThemeStyles();
  const resolvedHeaderRight = headerRight ?? (showUserActions ? <UserHeaderActions /> : null);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {(title || subtitle || resolvedHeaderRight) && (
          <View
            style={{
              paddingTop: 12,
              paddingBottom: 16,
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
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
