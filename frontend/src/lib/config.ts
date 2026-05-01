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
  // Use relative path for web to leverage Next.js rewrites proxy (prevents CORS issues)
  apiBase = "";
}

export const API_BASE_URL = apiBase;

