import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StaffCustomersScreen } from '../screens/staff/StaffCustomersScreen';
import { StaffCustomerDetailScreen } from '../screens/staff/StaffCustomerDetailScreen';
import type { CustomersStackParamList } from './staffTypes';

const Stack = createNativeStackNavigator<CustomersStackParamList>();

export function CustomersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomersList" component={StaffCustomersScreen} />
      <Stack.Screen name="CustomerDetail" component={StaffCustomerDetailScreen} />
    </Stack.Navigator>
  );
}
