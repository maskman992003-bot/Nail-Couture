import { Pressable, View } from 'react-native';
import Svg, { Defs, LinearGradient, Circle, Stop } from 'react-native-svg';
import { Icon } from '../../icons/Icon';
import { COUTURE_COLORS } from './constants';

type BookingFabProps = {
  onPress: () => void;
};

export function BookingFab({ onPress }: BookingFabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COUTURE_COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <Svg width={56} height={56} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="fabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#D4B06A" />
            <Stop offset="100%" stopColor="#A8843F" />
          </LinearGradient>
        </Defs>
        <Circle cx={28} cy={28} r={28} fill="url(#fabGrad)" />
      </Svg>
      <View style={{ zIndex: 1 }}>
        <Icon name="plus" size={24} color="#121212" />
      </View>
    </Pressable>
  );
}
