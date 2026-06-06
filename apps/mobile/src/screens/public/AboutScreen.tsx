import { Linking, Pressable, Text, View } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { PublicScreenLayout } from '../../components/public/PublicScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';
import type { PublicTabParamList } from '../../navigation/publicTypes';

const STUDIO_ADDRESS = '5300 Tchoupitoulas St #32-34\nNew Orleans, LA 70115';
const PHONE = '504-481-7879';
const PHONE_LINK = 'tel:+15044817879';
const WHATSAPP_LINK = 'https://wa.me/15044817879';
const INSTAGRAM_LINK =
  'https://www.instagram.com/nailcouturenola?igsh=MWRsYzR5c3dnaGVpbw%3D%3D&utm_source=qr';
const MAP_LINK =
  'https://www.google.com/maps?q=5300+Tchoupitoulas+St+%2332-34+New+Orleans+LA+70115';

type AboutScreenProps = {
  navigation: BottomTabNavigationProp<PublicTabParamList, 'About'>;
};

function ContactRow({
  label,
  value,
  onPress,
  gold = false,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  gold?: boolean;
}) {
  const styles = useThemeStyles();
  const content = (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.textSecondary, { fontSize: 11, letterSpacing: 1.5, marginBottom: 4 }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={gold ? styles.textGold : styles.textPrimary}>{value}</Text>
    </View>
  );

  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export function AboutScreen({ navigation }: AboutScreenProps) {
  const styles = useThemeStyles();

  return (
    <PublicScreenLayout onNavigateTab={(tab) => navigation.navigate(tab)}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 24 }}>
        <View>
          <Text style={[styles.textPrimary, { fontSize: 32, fontWeight: '600', textAlign: 'center' }]}>
            The Story of Nail Couture
          </Text>
          <Text style={[styles.textSecondary, { marginTop: 16, lineHeight: 24, textAlign: 'center' }]}>
            Born from a passion for precision and an unwavering commitment to excellence, Nail Couture
            was founded on the principle that every client deserves an exceptional experience. Our artisans
            undergo rigorous training in the Russian Manicure technique, mastering the art of cuticle
            work and nail shaping that has been refined over decades in Eastern Europe.
          </Text>
          <Text style={[styles.textSecondary, { marginTop: 16, lineHeight: 24, textAlign: 'center' }]}>
            We believe in more than just beautiful nails. We believe in an elevated standard of hygiene,
            using medical-grade sterilization equipment and exclusively non-toxic, vegan products.
            Each visit to Nail Couture is a sanctuary moment—an escape from the ordinary,
            crafted for the discerning individual.
          </Text>
        </View>

        <View>
          <Text style={[styles.textPrimary, { fontSize: 26, fontWeight: '600', textAlign: 'center' }]}>
            Visit Our Studio
          </Text>
          <View
            style={{
              alignSelf: 'center',
              width: 80,
              height: 2,
              backgroundColor: `${styles.tokens.goldStrong}B3`,
              marginVertical: 12,
              borderRadius: 1,
            }}
          />
          <Text style={[styles.textSecondary, { textAlign: 'center' }]}>
            By appointment only for your comfort and privacy
          </Text>
        </View>

        <View style={[styles.card, { padding: 20 }]}>
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: `${styles.tokens.goldStrong}33`,
              backgroundColor: `${styles.tokens.goldStrong}0D`,
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginBottom: 16,
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
            <Text style={[styles.textGold, { fontSize: 11, letterSpacing: 2, fontWeight: '600' }]}>
              CONTACT INFORMATION
            </Text>
          </View>

          <ContactRow label="Address" value={STUDIO_ADDRESS} />
          <ContactRow label="Phone" value={PHONE} onPress={() => Linking.openURL(PHONE_LINK)} gold />
          <ContactRow
            label="WhatsApp"
            value="Chat with Us"
            onPress={() => Linking.openURL(WHATSAPP_LINK)}
            gold
          />
          <ContactRow
            label="Instagram"
            value="@nailcouture"
            onPress={() => Linking.openURL(INSTAGRAM_LINK)}
            gold
          />
          <ContactRow
            label="Hours"
            value={'Tuesday - Saturday: 9:00 AM - 7:00 PM\nSunday & Monday: Closed'}
          />
        </View>

        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: styles.tokens.borderLight,
              backgroundColor: styles.tokens.cardBg,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text style={styles.textPrimary}>Map</Text>
            <Text style={[styles.textGold, { fontWeight: '600' }]}>New Orleans</Text>
          </View>

          <Pressable
            onPress={() => Linking.openURL(MAP_LINK)}
            style={[
              styles.card,
              {
                minHeight: 180,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              },
            ]}
          >
            <Text style={[styles.textGold, { fontSize: 16, fontWeight: '600', marginBottom: 8 }]}>
              Open in Google Maps
            </Text>
            <Text style={[styles.textSecondary, { textAlign: 'center' }]}>{STUDIO_ADDRESS}</Text>
          </Pressable>
        </View>
      </View>
    </PublicScreenLayout>
  );
}
