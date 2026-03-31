import { Capacitor } from '@capacitor/core';

// API Base URL
// Web/Server: Use current hostname (supports localhost, 0.0.0.0, and local IP)
// Android Emulator: "http://10.0.2.2:8000" (via Capacitor detection)
// More robust check for Android environment (including WebView)
const isAndroid = typeof window !== 'undefined' && (
    Capacitor.getPlatform() === 'android' ||
    /Android/i.test(navigator.userAgent)
);

let apiBase = "https://stock-server-rnfjr.up.railway.app";

if (process.env.NEXT_PUBLIC_API_URL) {
    apiBase = process.env.NEXT_PUBLIC_API_URL;
} else if (typeof window !== 'undefined') {
    if (isAndroid) {
        // Android Emulator or Device in Dev Mode
        apiBase = "https://stock-server-rnfjr.up.railway.app";
    } else {
        // Web Browser / Desktop
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Even on localhost, we point to real server during this final fix to ensure it works
            apiBase = "https://stock-server-rnfjr.up.railway.app";
        } else {
            // [Fix] Production Backend URL (Railway - Specific App)
            apiBase = "https://stock-server-rnfjr.up.railway.app";
        }
    }
    console.log(`[Config] Running on ${isAndroid ? 'Android' : 'Web'}, API URL: ${apiBase}`);
}

export const API_BASE_URL = apiBase;
