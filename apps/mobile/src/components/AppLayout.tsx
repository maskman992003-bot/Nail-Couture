import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStyles } from '../theme/useThemeStyles';

type AppLayoutProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AppLayout({ title, subtitle, children, footer }: AppLayoutProps) {
  const styles = useThemeStyles();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {(title || subtitle) && (
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          {title ? (
            <Text style={[styles.textGold, { fontSize: 28, fontWeight: '600' }]}>{title}</Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.textSecondary, { marginTop: 4 }]}>{subtitle}</Text>
          ) : null}
        </View>
      )}
      <View style={{ flex: 1, paddingHorizontal: 20 }}>{children}</View>
      {footer}
    </SafeAreaView>
  );
}
