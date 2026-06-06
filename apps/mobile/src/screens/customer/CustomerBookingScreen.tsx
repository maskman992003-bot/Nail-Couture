import { Linking, Pressable, Text, View } from 'react-native';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags.js';
import { BookingWizard } from '../../components/BookingWizard';
import { CustomerScreenLayout } from '../../components/customer/CustomerScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';

export function CustomerBookingScreen() {
  const styles = useThemeStyles();

  if (!CUSTOMER_ONLINE_BOOKING) {
    return (
      <CustomerScreenLayout title="Book Appointment" subtitle="Online booking">
        <View style={[styles.card, { padding: 24, alignItems: 'center' }]}>
          <Text style={[styles.textGold, { fontSize: 22, fontWeight: '600', textAlign: 'center' }]}>
            Booking Temporarily Unavailable
          </Text>
          <Text style={[styles.textSecondary, { textAlign: 'center', marginTop: 12, marginBottom: 20 }]}>
            Online scheduling is not enabled yet. Please contact us to book your visit.
          </Text>
          <Pressable
            onPress={() => Linking.openURL('https://wa.me/15044817879')}
            style={styles.buttonPrimary}
          >
            <Text style={styles.buttonPrimaryText}>Contact Us</Text>
          </Pressable>
        </View>
      </CustomerScreenLayout>
    );
  }

  return (
    <CustomerScreenLayout title="Book Appointment" subtitle="Reserve your moment of luxury">
      <BookingWizard />
    </CustomerScreenLayout>
  );
}
