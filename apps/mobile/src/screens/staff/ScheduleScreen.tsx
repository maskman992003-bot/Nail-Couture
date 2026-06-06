import { Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { StaffScreenLayout } from '../../components/staff/StaffScreenLayout';
import { useThemeStyles } from '../../theme/useThemeStyles';
import { EmployeeScheduleView } from './EmployeeScheduleScreen';
import { ManagerScheduleView } from './ManagerScheduleScreen';

const MANAGER_ROLES = new Set(['admin', 'super_admin', 'owner', 'partner']);
const EMPLOYEE_ROLES = new Set(['technician', 'cashier']);

export function ScheduleScreen() {
  const { user } = useAuth();
  const styles = useThemeStyles();

  if (!user) {
    return (
      <StaffScreenLayout title="Schedule">
        <Text style={styles.textSecondary}>Please sign in to view your schedule.</Text>
      </StaffScreenLayout>
    );
  }

  if (MANAGER_ROLES.has(user.role)) {
    return <ManagerScheduleView />;
  }

  if (EMPLOYEE_ROLES.has(user.role)) {
    return <EmployeeScheduleView />;
  }

  return (
    <StaffScreenLayout title="Schedule">
      <View style={[styles.card, { padding: 24 }]}>
        <Text style={styles.textSecondary}>Schedule is not available for your role.</Text>
      </View>
    </StaffScreenLayout>
  );
}
