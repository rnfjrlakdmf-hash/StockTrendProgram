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
  // Web/Server: Always use relative path to leverage Next.js rewrites
  // This completely eliminates CORS issues for both localhost and Vercel
  if (typeof window !== 'undefined') {
    apiBase = "";
  } else {
    // SSR needs absolute URL
    apiBase = "https://stocktrendprogram-production.up.railway.app";
  }
}

export const API_BASE_URL = apiBase;

