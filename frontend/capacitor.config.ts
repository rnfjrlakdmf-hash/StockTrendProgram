import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rnfjr.stockai',
  appName: 'AI Stock Analyst',
  webDir: 'public', // 더미(dummy) 폴더 (server.url을 쓰기 때문에 실제 빌드물이 들어가지 않아도 됨)
  server: {
    // [최적화] 네이티브 앱을 켤 때 Vercel 라이브 주소로 바로 연결! 
    // 이렇게 하면 앱스토어 업데이트 없이 서버 코드만 고쳐도 앱 화면이 바로 바뀝니다.
    url: 'https://stock-trend-program.vercel.app',
    cleartext: true
  },
  plugins: {
    AdMob: {
      initializeOnId: 'ca-app-pub-3940256099942544~3347511713', // Android 테스트 앱 ID (런칭 시 실제 ID로 교체)
      requestTrackingAuthorization: true,
      testingDevices: ['2077ef9a63d2b398840261cdd221a475'],
    }
  }
};

export default config;

