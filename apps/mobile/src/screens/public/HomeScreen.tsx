import { useRef } from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@nail-couture/shared/theme/layout.js';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags.js';
import { BookingWizard } from '../../components/BookingWizard';
import { PublicScreenLayout } from '../../components/public/PublicScreenLayout';
import { useLayout } from '../../theme/useLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { PublicTabParamList, RootStackParamList } from '../../navigation/publicTypes';

type HomeScreenProps = {
  navigation: BottomTabNavigationProp<PublicTabParamList, 'Home'>;
};

function HeroButton({
  label,
  onPress,
  variant = 'secondary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const styles = useThemeStyles();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 140,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
        borderRadius: 999,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: isPrimary ? 'transparent' : `${styles.tokens.textPrimary}1A`,
        backgroundColor: isPrimary ? styles.tokens.goldStrong : `${styles.tokens.textPrimary}0D`,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[5],
        ...(isPrimary
          ? {
              shadowColor: '#c5a059',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.18,
              shadowRadius: 20,
              elevation: 8,
            }
          : {}),
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: isPrimary ? 'rgba(255,255,255,0.08)' : `${styles.tokens.textPrimary}1A`,
          backgroundColor: isPrimary ? styles.tokens.bgPrimary : `${styles.tokens.textPrimary}0D`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: styles.tokens.goldStrong, fontSize: 14 }}>{isPrimary ? '★' : '◫'}</Text>
      </View>
      <Text
        style={{
          color: isPrimary ? '#121212' : styles.tokens.textPrimary,
          fontSize: 11,
          letterSpacing: 3.4,
          fontWeight: '600',
          fontFamily: styles.fonts.heading,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const styles = useThemeStyles();
  const layout = useLayout();
  const { height: windowHeight } = useWindowDimensions();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const heroMinHeight = Math.round(windowHeight * 0.7);
  const scrollRef = useRef<import('react-native').ScrollView>(null);
  const bookingOffsetRef = useRef(0);

  const navigateTab = (tab: keyof PublicTabParamList) => {
    navigation.navigate(tab);
  };

  const bookingLabel = CUSTOMER_ONLINE_BOOKING ? 'BOOK NOW' : 'SALON INFO';

  const handleBooking = () => {
    if (CUSTOMER_ONLINE_BOOKING) {
      scrollRef.current?.scrollTo({ y: bookingOffsetRef.current, animated: true });
      return;
    }
    navigateTab('About');
  };

  return (
    <PublicScreenLayout
      scrollRef={scrollRef}
      onNavigateTab={(tab) => navigation.navigate(tab)}
    >
      <View
        style={{
          position: 'relative',
          minHeight: heroMinHeight,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: spacing[6],
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={
            styles.theme === 'dark'
              ? ['#121212', 'rgba(18,18,18,0.95)', '#121212']
              : ['#FDF8F0', 'rgba(253,248,240,0.95)', '#FDF8F0']
          }
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <Image
          source={require('../../../assets/NC-watermark.png')}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: Math.min(360, layout.width * 0.6),
            height: Math.min(360, layout.width * 0.6),
            opacity: 0.1,
            transform: [
              { translateX: -Math.min(180, layout.width * 0.3) },
              { translateY: -Math.min(180, layout.width * 0.3) },
            ],
          }}
          resizeMode="contain"
        />

        <View style={{ zIndex: 1, alignItems: 'center', maxWidth: 896, width: '100%' }}>
        <View
          style={{
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: `${styles.tokens.goldStrong}33`,
            backgroundColor: styles.theme === 'dark' ? 'rgba(255,255,255,0.05)' : `${styles.tokens.goldStrong}0D`,
            paddingHorizontal: 14,
            paddingVertical: 8,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: styles.tokens.goldStrong,
              shadowColor: styles.tokens.goldStrong,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
          />
          <Text style={[styles.textGold, { fontSize: 11, letterSpacing: 3.2, fontWeight: '600', textTransform: 'uppercase' }]}>
            FLAWLESS MEDICAL-GRADE STERILIZATION
          </Text>
        </View>

        <Text style={[styles.textPrimary, styles.textHeading, { fontSize: 42, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5 }]}>
          Couture Nails.
        </Text>
        <Text style={[styles.textHeading, { fontSize: 42, fontWeight: '600', textAlign: 'center', marginTop: 12 }]}>
          Expertly Tailored.
        </Text>
        <Text
          style={[
            styles.textSecondary,
            { fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 20, maxWidth: 360, alignSelf: 'center' },
          ]}
        >
          Discover the precision of the Russian Manicure technique. Medical-grade sterilization,
          non-toxic products, and artisans trained in the finest traditions of nail couture.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing[4],
            marginTop: spacing[8],
            justifyContent: 'center',
            width: '100%',
            maxWidth: 896,
          }}
        >
          <HeroButton label="LOOKBOOK" onPress={() => navigateTab('Lookbook')} />
          <HeroButton
            label="CHECK IN"
            variant="primary"
            onPress={() => rootNavigation.navigate('CheckIn')}
          />
          <HeroButton label={bookingLabel} onPress={handleBooking} />
        </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: layout.horizontalPadding, paddingTop: spacing[2], gap: spacing[3] }}>
        <Text style={styles.sectionLabel}>EXPLORE</Text>
        {[
          { title: 'Services & Pricing', subtitle: 'Browse our full menu', tab: 'Services' as const },
          { title: 'Couture Lookbook', subtitle: 'Find your next inspiration', tab: 'Lookbook' as const },
          { title: 'Our Story', subtitle: 'Visit the studio in New Orleans', tab: 'About' as const },
        ].map((card) => (
          <Pressable
            key={card.tab}
            onPress={() => navigateTab(card.tab)}
            style={[styles.card, { padding: 18 }]}
          >
            <Text style={[styles.pageTitle, { fontSize: 18 }]}>{card.title}</Text>
            <Text style={[styles.textSecondary, { marginTop: 4 }]}>{card.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      {CUSTOMER_ONLINE_BOOKING ? (
        <View
          style={{
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: spacing[6],
            paddingBottom: layout.contentBottomPadding,
          }}
          onLayout={(event) => {
            bookingOffsetRef.current = event.nativeEvent.layout.y;
          }}
        >
          <BookingWizard />
        </View>
      ) : null}
    </PublicScreenLayout>
  );
}
