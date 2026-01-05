import { Capacitor } from '@capacitor/core';

// API Base URL
// Web/Server: Use current hostname (supports localhost, 0.0.0.0, and local IP)
// Android Emulator: "http://10.0.2.2:8000" (via Capacitor detection)
const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

let apiBase = "http://localhost:8000"; // Default for Server-Side Rendering

if (typeof window !== 'undefined') {
    if (isNative) {
        apiBase = "http://10.0.2.2:8000";
    } else {
        // Use the same hostname as the browser (e.g. 192.168.0.5 -> 192.168.0.5:8000)
        apiBase = `http://${window.location.hostname}:8000`;
    }
}

export const API_BASE_URL = apiBase;
