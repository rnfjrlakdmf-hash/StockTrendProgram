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
  if (typeof window !== 'undefined') {
    // Client-side: use localhost for local dev, otherwise relative to current host
    apiBase = window.location.hostname === 'localhost' ? "http://localhost:8000" : "";
  } else {
    // Server-side (SSR/SSG): use environment variable or fallback to Railway
    apiBase = process.env.BACKEND_URL || "https://stocktrendprogram-production.up.railway.app";
  }
}


