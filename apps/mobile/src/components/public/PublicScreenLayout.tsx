import type { ReactNode, RefObject } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { PublicNavbar } from './PublicNavbar';

type PublicScreenLayoutProps = {
  children: ReactNode;
  onNavigateTab?: (tab: 'Home' | 'Lookbook' | 'Services' | 'About') => void;
  scroll?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
};

export function PublicScreenLayout({
  children,
  onNavigateTab,
  scroll = true,
  scrollRef,
}: PublicScreenLayoutProps) {
  const styles = useThemeStyles();

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <PublicNavbar onNavigateTab={onNavigateTab} />
      {content}
    </SafeAreaView>
  );
}
