import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CUSTOMER_ONLINE_BOOKING, FITNESS_ASSESSMENT } from '@nail-couture/shared/constants/featureFlags.js';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { RootStackParamList } from '../../navigation/publicTypes';
import { NavIcon } from '../NavIcon';

type PublicNavbarProps = {
  onNavigateTab?: (tab: 'Home' | 'Lookbook' | 'Services' | 'About' | 'FitnessAssessment') => void;
};

export function PublicNavbar({ onNavigateTab }: PublicNavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const styles = useThemeStyles();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuOpen, setMenuOpen] = useState(false);

  const goToLogin = () => {
    setMenuOpen(false);
    navigation.navigate('Login');
  };

  const goToTab = (tab: 'Home' | 'Lookbook' | 'Services' | 'About' | 'FitnessAssessment') => {
    setMenuOpen(false);
    onNavigateTab?.(tab);
  };

  const ctaLabel = CUSTOMER_ONLINE_BOOKING ? 'BOOK' : 'CONTACT';
  const menuTabs = ['Services', 'Lookbook', ...(FITNESS_ASSESSMENT ? ['Fitness'] : []), 'About'] as const;

  const handleCta = () => {
    setMenuOpen(false);
    if (CUSTOMER_ONLINE_BOOKING) {
      goToTab('Home');
    } else {
      goToTab('About');
    }
  };

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: styles.tokens.borderColor,
        backgroundColor: styles.tokens.bgPrimary,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Pressable onPress={() => goToTab('Home')} accessibilityRole="button">
          <Image
            source={require('../../../assets/NC.jpg')}
            style={{ height: 56, width: 120 }}
            resizeMode="contain"
          />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={toggleTheme}
            accessibilityLabel={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: styles.tokens.borderColor,
              backgroundColor: `${styles.tokens.goldStrong}18`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NavIcon
              path={
                theme === 'dark'
                  ? 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
                  : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
              }
              size={18}
              active
            />
          </Pressable>

          <Pressable
            onPress={() => setMenuOpen((open) => !open)}
            style={{ padding: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <NavIcon
              path={
                menuOpen
                  ? 'M6 18L18 6M6 6l12 12'
                  : 'M4 6h16M4 12h16M4 18h16'
              }
              size={22}
            />
          </Pressable>
        </View>
      </View>

      {menuOpen ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: styles.tokens.borderLight,
            paddingHorizontal: 16,
            paddingBottom: 16,
            gap: 4,
          }}
        >
          {menuTabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() =>
                goToTab(tab === 'Fitness' ? 'FitnessAssessment' : tab)
              }
              style={{ paddingVertical: 12 }}
            >
              <Text style={[styles.textPrimary, { letterSpacing: 2, fontSize: 13 }]}>{tab.toUpperCase()}</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={handleCta}
            style={{
              marginTop: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: styles.tokens.goldStrong,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={[styles.textGold, { letterSpacing: 2, fontSize: 13, fontWeight: '600' }]}>
              {ctaLabel}
            </Text>
          </Pressable>

          <Pressable
            onPress={goToLogin}
            style={{
              marginTop: 8,
              borderRadius: 999,
              backgroundColor: styles.tokens.goldStrong,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#121212', letterSpacing: 2, fontSize: 13, fontWeight: '600' }}>
              LOGIN
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
