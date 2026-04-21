import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snapclean.app',
  appName: 'SnapClean',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    AdMob: {
      // replace with your actual AdMob App ID from Google Console
      // ca-app-pub-3940256099942544~3347511713 is the official Test App ID
      androidAppId: 'ca-app-pub-3940256099942544~3347511713', 
    }
  }
};

export default config;
