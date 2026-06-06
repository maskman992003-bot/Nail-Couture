import type { ReactNode, RefObject } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLayout } from '../../theme/useLayout';
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
  const layout = useLayout();
  const watermarkSize = Math.min(360, layout.width * 0.6);

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={layout.pageContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '42%',
          left: '50%',
          width: watermarkSize,
          height: watermarkSize,
          transform: [{ translateX: -watermarkSize / 2 }, { translateY: -watermarkSize / 2 }],
          zIndex: 0,
        }}
      >
        <Image
          source={require('../../../assets/NC-watermark.png')}
          style={{ width: '100%', height: '100%', opacity: 0.1 }}
          resizeMode="contain"
        />
      </View>
      <View style={{ flex: 1, zIndex: 1 }}>
        <PublicNavbar onNavigateTab={onNavigateTab} />
        {content}
      </View>
    </SafeAreaView>
  );
}
