import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rnfjr.stockai',
  appName: 'AI Stock Analyst',
  webDir: '.next_custom',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    AdMob: {
      initializeOnId: 'ca-app-pub-3940256099942544~3347511713', // Android 테스트 앱 ID
      requestTrackingAuthorization: true,
      testingDevices: ['2077ef9a63d2b398840261cdd221a475'],
    }
  }
};

export default config;

