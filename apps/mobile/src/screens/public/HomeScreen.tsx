import { useRef } from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
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
        borderRadius: 999,
        borderWidth: isPrimary ? 0 : 1,
        borderColor: styles.tokens.borderColor,
        backgroundColor: isPrimary ? styles.tokens.goldStrong : `${styles.tokens.textPrimary}08`,
        paddingVertical: 14,
        paddingHorizontal: 12,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: isPrimary ? '#121212' : styles.tokens.textPrimary,
          fontSize: 11,
          letterSpacing: 2,
          fontWeight: '600',
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
        }}
      >
        <Image
          source={require('../../../assets/NC-watermark.png')}
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            width: 260,
            height: 260,
            opacity: 0.08,
            transform: [{ translateX: -130 }, { translateY: -130 }],
          }}
          resizeMode="contain"
        />

        <View
          style={{
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: `${styles.tokens.goldStrong}33`,
            backgroundColor: `${styles.tokens.goldStrong}0D`,
            paddingHorizontal: 14,
            paddingVertical: 8,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: styles.tokens.goldStrong,
            }}
          />
          <Text style={[styles.textGold, { fontSize: 10, letterSpacing: 2.5, fontWeight: '600' }]}>
            FLAWLESS MEDICAL-GRADE STERILIZATION
          </Text>
        </View>

        <Text style={[styles.textPrimary, { fontSize: 38, fontWeight: '600', textAlign: 'center' }]}>
          Couture Nails.
        </Text>
        <Text style={[styles.textGold, { fontSize: 38, fontWeight: '600', textAlign: 'center', marginTop: 8 }]}>
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

      <View style={{ paddingHorizontal: layout.horizontalPadding, paddingTop: spacing[2], gap: spacing[3] }}>
        <Text style={[styles.textGold, { fontSize: 13, letterSpacing: 2, fontWeight: '600' }]}>
          EXPLORE
        </Text>
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
            <Text style={[styles.textPrimary, { fontSize: 18, fontWeight: '600' }]}>{card.title}</Text>
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
