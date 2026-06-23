import { ActivityIndicator, View } from 'react-native';
import { useFloorSnapshot } from '@nail-couture/shared/hooks/useFloorSnapshot.js';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { TechnicianFloorSnapshot } from '../../components/staff/technician/TechnicianFloorSnapshot';
import { useThemeStyles } from '../../theme/useThemeStyles';

export function CashierLobbyScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();
  const { floorAppointments, floorTechnicians, loading } = useFloorSnapshot(user?.phone);

  if (loading) {
    return (
      <StaffScreenLayout title="Lobby">
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color={styles.tokens.goldStrong} />
        </View>
      </StaffScreenLayout>
    );
  }

  return (
    <StaffScreenLayout title="Lobby" subtitle="Live floor snapshot">
      <TechnicianFloorSnapshot
        floorAppointments={floorAppointments}
        floorTechnicians={floorTechnicians}
      />
    </StaffScreenLayout>
  );
}
