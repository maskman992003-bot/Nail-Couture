import { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getNavItemsForRole } from '@nail-couture/shared/navigation/navItems.js';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { ScrollableBottomTabBar } from './ScrollableBottomTabBar';
import { ALL_SCREEN_NAMES, resolveScreenName } from './screenRegistry';

type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTabs = createBottomTabNavigator();

function MainTabNavigator() {
  const { user } = useAuth();
  const navItems = useMemo(() => getNavItemsForRole(user?.role), [user?.role]);
  const visibleScreens = useMemo(() => {
    const fromNav = navItems.map((item: { id: string }) => resolveScreenName(item.id));
    return Array.from(new Set([...fromNav, 'Settings']));
  }, [navItems]);

  return (
    <MainTabs.Navigator
      tabBar={(props) => <ScrollableBottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {ALL_SCREEN_NAMES.filter((screen) => visibleScreens.includes(screen)).map((screen) => (
        <MainTabs.Screen key={screen} name={screen} component={PlaceholderScreen} />
      ))}
    </MainTabs.Navigator>
  );
}

function AppStack() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <RootStack.Screen name="Login" component={LoginScreen} />
      )}
    </RootStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}
