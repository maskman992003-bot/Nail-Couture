import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StaffManagementScreen } from '../screens/admin/StaffManagementScreen';
import { StaffProfileScreen } from '../screens/staff/StaffProfileScreen';
import type { StaffStackParamList } from './staffTypes';

const Stack = createNativeStackNavigator<StaffStackParamList>();

export function StaffStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StaffList" component={StaffManagementScreen} />
      <Stack.Screen name="StaffProfile" component={StaffProfileScreen} />
    </Stack.Navigator>
  );
}
