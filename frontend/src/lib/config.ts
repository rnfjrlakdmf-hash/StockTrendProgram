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
} else if (typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    apiBase = "http://localhost:8000";
  } else {
    apiBase = "";
  }
}

export const API_BASE_URL = apiBase;

