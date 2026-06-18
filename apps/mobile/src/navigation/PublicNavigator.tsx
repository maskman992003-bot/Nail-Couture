import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { FITNESS_ASSESSMENT } from '@nail-couture/shared/constants/featureFlags.js';
import { HomeScreen } from '../screens/public/HomeScreen';
import { LookbookScreen } from '../screens/public/LookbookScreen';
import { ServicesScreen } from '../screens/public/ServicesScreen';
import { AboutScreen } from '../screens/public/AboutScreen';
import { FitnessAssessmentScreen } from '../screens/public/FitnessAssessmentScreen';
import { NavIcon } from '../components/NavIcon';
import { useThemeStyles } from '../theme/useThemeStyles';
import type { PublicTabParamList } from './publicTypes';

const PublicTabs = createBottomTabNavigator<PublicTabParamList>();

const tabIcons: Record<keyof PublicTabParamList, string> = {
  Home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  Lookbook: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  Services: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  About: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  FitnessAssessment: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
};

export function PublicNavigator() {
  const styles = useThemeStyles();

  return (
    <PublicTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: styles.tokens.bgPrimary,
          borderTopColor: styles.tokens.borderColor,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: styles.tokens.goldStrong,
        tabBarInactiveTintColor: styles.tokens.textSecondary,
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            style={{
              color,
              fontSize: 10,
              letterSpacing: 1,
              fontWeight: focused ? '600' : '400',
              marginTop: 2,
            }}
          >
            {children}
          </Text>
        ),
        tabBarIcon: ({ focused }) => (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <NavIcon path={tabIcons[route.name]} size={20} active={focused} />
          </View>
        ),
      })}
    >
      <PublicTabs.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <PublicTabs.Screen name="Lookbook" component={LookbookScreen} options={{ title: 'Lookbook' }} />
      <PublicTabs.Screen name="Services" component={ServicesScreen} options={{ title: 'Services' }} />
      <PublicTabs.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      {FITNESS_ASSESSMENT ? (
      <PublicTabs.Screen
        name="FitnessAssessment"
        component={FitnessAssessmentScreen}
        options={{ title: 'Fitness' }}
      />
      ) : null}
    </PublicTabs.Navigator>
  );
}
