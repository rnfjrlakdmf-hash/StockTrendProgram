import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/config';

// Determine WS URL from API_BASE_URL
const WS_URL = API_BASE_URL.replace("http", "ws") + "/ws";

export function useStockSocket(symbol: string | null) {
    const [realtimeData, setRealtimeData] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    const socketRef = useRef<WebSocket | null>(null);
    const clientId = useRef(`client_${Math.random().toString(36).substring(7)}`);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const shouldReconnect = useRef(true);
    const maxReconnectAttempts = 5;

    // Reconnect with exponential backoff
    const reconnect = useCallback(() => {
        if (reconnectAttempts >= maxReconnectAttempts) {
            setError(`최대 재연결 시도 횟수(${maxReconnectAttempts})를 초과했습니다.`);
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30s
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})...`);

        reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
        }, delay);
    }, [reconnectAttempts]);

    // Heartbeat ping/pong
    const startHeartbeat = useCallback((ws: WebSocket) => {
        // Clear existing interval
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({ type: "ping" }));
                } catch (e) {
                    console.error("[WS] Failed to send ping:", e);
                }
            }
        }, 30000); // Ping every 30 seconds
    }, []);

    const stopHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    }, []);

    // Connect WebSocket
    const connectWebSocket = useCallback(() => {
        // Retrieve User ID from storage
        let userId = "guest";
        try {
            const stored = localStorage.getItem("stock_user");
            if (stored) {
                const u = JSON.parse(stored);
                if (u.id) userId = u.id;
            }
        } catch (e) { }

        const url = `${WS_URL}/${clientId.current}?user_id=${userId}`;
        console.log("[WS] Attempting connection...");
        console.log("[WS] URL:", url);
        console.log("[WS] API_BASE_URL:", API_BASE_URL);

        try {
            const ws = new WebSocket(url);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log("[WS] ✅ Connected successfully");
                setIsConnected(true);
                setError(null);
                setReconnectAttempts(0); // Reset on successful connection

                // Start heartbeat
                startHeartbeat(ws);

                // [Zero-Storage Security] Handshake Auth
                try {
                    const storedKeys = localStorage.getItem("user_kis_keys");
                    if (storedKeys) {
                        const keys = JSON.parse(storedKeys);
                        ws.send(JSON.stringify({
                            type: "auth",
                            keys: keys
                        }));
                        console.log("[WS] Secure keys transmitted to RAM session.");
                    }
                } catch (e) {
                    console.error("[WS] Auth Handshake Failed", e);
                }

                // If symbol exists on connect, subscribe immediately
                if (symbol) {
                    ws.send(JSON.stringify({ type: "subscribe", symbol: symbol }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === "update") {
                        setRealtimeData(message.data);
                    } else if (message.type === "subscribed") {
                        console.log("[WS] Subscribed to:", message.symbol);
                    } else if (message.type === "pong") {
                        // Heartbeat response received
                        console.debug("[WS] Pong received");
                    } else if (message.type === "auth_success") {
                        console.log("[WS] Authentication successful");
                    } else if (message.type === "error") {
                        console.error("[WS] Server error:", message.message);
                        setError(message.message);
                    }
                } catch (e) {
                    console.error("[WS] Message Parse Error", e);
                }
            };

            ws.onerror = (event) => {
                // WebSocket error events don't provide detailed info for security reasons
                console.error("[WS] ❌ Error occurred");
                console.error("[WS] ReadyState:", ws.readyState);
                console.error("[WS] URL:", url);
                console.error("[WS] Event type:", event.type);

                // Detailed troubleshooting guide
                const helpText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  WebSocket 연결 실패
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

백엔드 서버가 실행 중이 아닙니다.

📋 서버 시작 방법:
  1. 새 터미널을 엽니다
  2. cd c:\\Users\\rnfjr\\StockTrendProgram\\backend
  3. python main.py

✅ 서버가 시작되면 이 페이지를 새로고침하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                `;
                console.error(helpText);

                // Check if server is reachable
                if (ws.readyState === WebSocket.CONNECTING) {
                    setError("서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인하세요.");
                } else if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
                    setError("WebSocket 연결이 닫혔습니다. 서버를 확인해주세요.");
                } else {
                    setError("WebSocket 연결 오류가 발생했습니다.");
                }
            };

            ws.onclose = (event) => {
                console.log("[WS] Disconnected");
                console.log("[WS] Code:", event.code);
                console.log("[WS] Reason:", event.reason || "No reason provided");
                console.log("[WS] Clean:", event.wasClean);

                setIsConnected(false);
                stopHeartbeat();

                // Provide user-friendly error messages based on close code
                if (event.code === 1006) {
                    setError("서버 연결이 비정상적으로 종료되었습니다. 백엔드 서버를 확인하세요.");
                } else if (event.code !== 1000 && event.code !== 1001) {
                    setError(`연결이 종료되었습니다 (코드: ${event.code})`);
                }

                // Auto-reconnect if not intentionally closed
                if (shouldReconnect.current && event.code !== 1000) {
                    console.log("[WS] Connection lost, attempting to reconnect...");
                    reconnect();
                }
            };

        } catch (e) {
            console.error("[WS] ❌ Connection error:", e);
            console.error("[WS] Error details:", {
                name: (e as Error).name,
                message: (e as Error).message,
                stack: (e as Error).stack
            });
            setError(`WebSocket 연결 실패: ${(e as Error).message}`);
            setIsConnected(false);

            if (shouldReconnect.current) {
                reconnect();
            }
        }
    }, [reconnect, startHeartbeat, stopHeartbeat, symbol]);

    // Connect on mount
    // Connect Logic (Lazy Connect)
    // Only connect when a symbol is provided or if we want to force connection.
    // This prevents 5 connection errors on pages like "Discovery" where symbol starts as null.
    useEffect(() => {
        if (!symbol) return; // Don't connect if no symbol yet

        shouldReconnect.current = true;
        connectWebSocket();

        return () => {
            shouldReconnect.current = false;
            stopHeartbeat();

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            if (socketRef.current) {
                socketRef.current.close(1000, "Component unmounting or symbol cleared");
            }
        };
        // Re-run only if symbol "existence" changes (null -> string). 
        // If symbol changes string -> string, we handle subscription in the other useEffect, 
        // so we don't need to reconnect.
        // But we can't easily express "symbol existence" in deps array without causing re-runs.
        // Actually, creating a new WS connection when symbol changes isn't terrible if rare, 
        // but ideally we reuse.
        // Let's use a ref to track if we are already connected/connecting.
    }, [!!symbol]); // Dependency on "existence" of symbol (boolean)

    // Handle Subscription Change
    useEffect(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && symbol) {
            console.log("[WS] Sending subscribe for:", symbol);
            socketRef.current.send(JSON.stringify({ type: "subscribe", symbol: symbol }));
            setRealtimeData(null); // Reset prev data on symbol change
        }
    }, [symbol, isConnected]);

    return {
        realtimeData,
        isConnected,
        error,
        reconnectAttempts
    };
}
