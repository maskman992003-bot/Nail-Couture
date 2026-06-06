import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@nail-couture/shared/theme/layout.js';
import { useLayout } from '../theme/useLayout';
import { useThemeStyles } from '../theme/useThemeStyles';

type AppLayoutProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AppLayout({ title, subtitle, children, footer }: AppLayoutProps) {
  const styles = useThemeStyles();
  const layout = useLayout({ withBottomTabBar: true });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {(title || subtitle) && (
        <View
          style={{
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: spacing[3],
            paddingBottom: spacing[2],
          }}
        >
          {title ? (
            <Text style={[styles.textGold, { fontSize: 28, fontWeight: '600' }]}>{title}</Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.textSecondary, { marginTop: spacing[1] }]}>{subtitle}</Text>
          ) : null}
        </View>
      )}
      <View style={{ flex: 1, paddingHorizontal: layout.horizontalPadding, paddingBottom: layout.contentBottomPadding }}>
        {children}
      </View>
      {footer}
    </SafeAreaView>
  );
}
