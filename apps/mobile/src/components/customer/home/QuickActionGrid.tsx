import { Pressable, Text, View } from 'react-native';
import { useThemeStyles } from '../../../theme/useThemeStyles';

type QuickAction = {
  id: string;
  label: string;
  onPress: () => void;
  icon: string;
};

type QuickActionGridProps = {
  onAppointmentsPress: () => void;
  onRewardsPress: () => void;
  onReferPress: () => void;
  onMembershipPress: () => void;
};

export function QuickActionGrid({
  onAppointmentsPress,
  onRewardsPress,
  onReferPress,
  onMembershipPress,
}: QuickActionGridProps) {
  const styles = useThemeStyles();

  const actions: QuickAction[] = [
    { id: 'appointments', label: 'My Appointments', onPress: onAppointmentsPress, icon: '📅' },
    { id: 'rewards', label: 'Rewards', onPress: onRewardsPress, icon: '◆' },
    { id: 'refer', label: 'Refer a Friend', onPress: onReferPress, icon: '👥' },
    { id: 'membership', label: 'Membership', onPress: onMembershipPress, icon: 'NC' },
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          onPress={action.onPress}
          style={[
            styles.card,
            {
              width: '47%',
              flexGrow: 1,
              minHeight: 96,
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            },
          ]}
        >
          <Text style={{ fontSize: action.id === 'membership' ? 16 : 22, color: styles.tokens.goldStrong }}>
            {action.icon}
          </Text>
          <Text style={[styles.textSecondary, { fontSize: 10, textAlign: 'center', letterSpacing: 0.5 }]}>
            {action.label.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
