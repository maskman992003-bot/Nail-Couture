import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nailcouture.app.capacitor',
  appName: 'Nail Couture',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#121212',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#121212',
    },
  },
};

export default config;
