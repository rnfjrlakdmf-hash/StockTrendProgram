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

if (process.env.NEXT_PUBLIC_API_URL) {
  apiBase = process.env.NEXT_PUBLIC_API_URL;
} else if (isAndroid) {
  apiBase = "http://10.0.2.2:8000";
} else if (process.env.NODE_ENV === 'production') {
  // Web Production: Use Railway backend directly to bypass Vercel 10s proxy timeout
  apiBase = "https://stocktrendprogram-production.up.railway.app";
} else {
  // Web Local: Use relative paths (Next.js rewrites will proxy to localhost:8000)
  apiBase = "";
}

export const API_BASE_URL = apiBase;

