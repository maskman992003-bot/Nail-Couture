import { Text, View } from 'react-native';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '../../constants/customerConstants';

export function AppointmentStatusBadge({ status }: { status: string }) {
  const colors = APPOINTMENT_STATUS_COLORS[status] || APPOINTMENT_STATUS_COLORS.waiting;
  const label = APPOINTMENT_STATUS_LABELS[status] || status;

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: colors.bg,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
