import { Capacitor } from '@capacitor/core';

// API Base URL

let apiBase = "";

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    // 로컬 개발 환경에서는 로컬 백엔드를 바라보도록 수정 (라이브 서버 이슈 방지)
    apiBase = "http://localhost:8000";
  } else if (/Android/i.test(navigator.userAgent) && (hostname === '' || hostname === 'localhost')) {
    // 안드로이드 에뮬레이터 (특수 케이스)
    apiBase = "http://10.0.2.2:8000";
  } else {
    // 일반 모바일 브라우저 및 운영 환경
    apiBase = ""; 
  }
} else {
  // SSR 및 Next.js 빌드 시점 (내부 127.0.0.1로 초고속 연결하여 자체 공인 IP 루프백 타임아웃 방지)
  apiBase = process.env.INTERNAL_API_URL || (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('13.209.99.170') ? process.env.NEXT_PUBLIC_API_URL : "http://127.0.0.1:8000");
}

export const API_BASE_URL = apiBase;

