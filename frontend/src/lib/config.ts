import { Capacitor } from '@capacitor/core';

// API Base URL

let apiBase = "";

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    // 로컬 개발 환경
    apiBase = "http://" + hostname + ":8000";
  } else if (/Android/i.test(navigator.userAgent) && (hostname === '' || hostname === 'localhost')) {
    // 안드로이드 에뮬레이터 (특수 케이스)
    apiBase = "http://10.0.2.2:8000";
  } else {
    // 일반 모바일 브라우저 및 운영 환경
    apiBase = ""; 
  }
} else {
  // 서버 사이드 (Build/SSR)
  apiBase = process.env.BACKEND_URL || "https://stock-trend-program.co.kr";
}

export const API_BASE_URL = apiBase;


