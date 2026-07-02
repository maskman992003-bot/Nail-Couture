import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { COUTURE_COLORS } from './constants';

type ConfirmBookingButtonProps = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
};

export function ConfirmBookingButton({ onPress, loading, disabled, label = 'Confirm Booking' }: ConfirmBookingButtonProps) {
  const { width } = useWindowDimensions();
  const buttonWidth = width - 40;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        opacity: disabled ? 0.5 : 1,
        shadowColor: COUTURE_COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View style={{ height: 52, borderRadius: 14, overflow: 'hidden', width: buttonWidth }}>
        <Svg width={buttonWidth} height={52} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="confirmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#D4B06A" />
              <Stop offset="50%" stopColor="#C5A059" />
              <Stop offset="100%" stopColor="#A8843F" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={buttonWidth} height={52} rx={14} fill="url(#confirmGrad)" />
        </Svg>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          {loading ? <ActivityIndicator color="#121212" /> : null}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#121212', letterSpacing: 0.5 }}>
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
