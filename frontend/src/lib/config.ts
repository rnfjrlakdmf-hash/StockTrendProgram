import { Capacitor } from '@capacitor/core';

// API Base URL
// Web/Server: Use current hostname (supports localhost, 0.0.0.0, and local IP)
// Android Emulator: "http://10.0.2.2:8000" (via Capacitor detection)
// More robust check for Android environment (including WebView)
const isAndroid = typeof window !== 'undefined' && (
    Capacitor.getPlatform() === 'android' ||
    /Android/i.test(navigator.userAgent)
);

let apiBase = "";

if (isAndroid) {
  apiBase = "http://10.0.2.2:8000";
} else {
  // Auto-detect environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Use production backend for local development since CORS is now fixed
      apiBase = "https://stocktrendprogram-production.up.railway.app";
    } else {
      // Use relative path for Vercel proxy
      apiBase = "";
    }
  } else {
    // SSR
    apiBase = "https://stocktrendprogram-production.up.railway.app";
  }
}

export const API_BASE_URL = apiBase;

