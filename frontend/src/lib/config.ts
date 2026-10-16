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
  // SSR 및 Next.js 빌드 시점: Windows 로컬 빌드나 Vercel 환경에서는 EC2 공인 IP로 연결하고, EC2(Linux) 런타임 SSR에서는 127.0.0.1:8000으로 초고속 연결
  const isLocalWinBuild = typeof process !== 'undefined' && process['platform'] === 'win32';
  if (process.env.VERCEL || isLocalWinBuild) {
    apiBase = process.env.INTERNAL_API_URL || "http://13.209.99.170:8000";
  } else {
    apiBase = process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";
  }
}

export const API_BASE_URL = apiBase;

