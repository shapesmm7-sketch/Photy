import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shotclean.app',
  appName: 'Shot Clean',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
