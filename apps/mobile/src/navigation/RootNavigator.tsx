import { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getNavItemsForRole } from '@nail-couture/shared/navigation/navItems.js';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { CheckInScreen } from '../screens/CheckInScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { PublicNavigator } from './PublicNavigator';
import { ScrollableBottomTabBar } from './ScrollableBottomTabBar';
import { ALL_SCREEN_NAMES, resolveScreenName } from './screenRegistry';
import { getScreenComponent } from './customerScreens';
import type { RootStackParamList } from './publicTypes';

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
        <MainTabs.Screen
          key={screen}
          name={screen}
          component={getScreenComponent(screen, user?.role)}
        />
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
        <>
          <RootStack.Screen name="Public" component={PublicNavigator} />
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{ presentation: 'modal' }}
          />
          <RootStack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ presentation: 'modal' }}
          />
          <RootStack.Screen
            name="CheckIn"
            component={CheckInScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
        </>
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
