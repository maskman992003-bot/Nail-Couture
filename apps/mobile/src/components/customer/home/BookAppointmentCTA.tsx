import { Linking, Pressable, Text } from 'react-native';
import { CUSTOMER_ONLINE_BOOKING } from '@nail-couture/shared/constants/featureFlags.js';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type BookAppointmentCTAProps = {
  onPress?: () => void;
};

export function BookAppointmentCTA({ onPress }: BookAppointmentCTAProps) {
  const styles = useThemeStyles();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (!CUSTOMER_ONLINE_BOOKING) {
      Linking.openURL('https://wa.me/15044817879').catch(() => undefined);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        backgroundColor: styles.tokens.textPrimary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: styles.tokens.bgPrimary,
          fontWeight: '700',
          letterSpacing: 2,
          fontSize: 13,
          textTransform: 'uppercase',
        }}
      >
        {CUSTOMER_ONLINE_BOOKING ? 'Book Appointment' : 'Contact Support'}
      </Text>
    </Pressable>
  );
}
