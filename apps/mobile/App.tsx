import './global.css';
import './src/lib/supabase';
import './src/utils/localNotificationAlert';
import 'react-native-gesture-handler';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { PushNotificationRegistrar } from './src/hooks/usePushNotifications';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  const { theme } = useTheme();
  return (
    <>
      <RootNavigator />
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator color="#C5A059" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <PushNotificationRegistrar />
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
