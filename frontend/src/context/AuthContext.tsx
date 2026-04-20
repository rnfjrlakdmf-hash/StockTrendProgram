"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/config";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = "385839147502-h2rjnk44258jciamfsjgc9nsmnt052u8.apps.googleusercontent.com";

interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
    is_pro: boolean;
    free_trial_count?: number;
}

interface AuthContextType {
    user: User | null;
    login: (googleUser: any) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("stock_user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (e) {
            localStorage.removeItem("stock_user");
        }
        setIsLoading(false);
    }, []);

    // 구글 리다이렉트 로그인 처리 (모바일용)
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get("access_token");
            if (token) {
                window.history.replaceState(null, "", window.location.pathname);
                handleGoogleToken(token);
            }
        }
    }, []);

    const handleGoogleToken = async (accessToken: string) => {
        try {
            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const info = await res.json();
                await login({
                    id: info.sub,
                    email: info.email,
                    name: info.name,
                    picture: info.picture,
                    token: accessToken,
                });
            }
        } catch (e) {
            console.error("Redirect token handling failed", e);
        }
    };

    const login = useCallback(async (googleUser: any): Promise<boolean> => {
        // 1단계: 구글 정보로 즉시 로컬 상태 설정 (UI 즉각 반응)
        const immediateUser: User = {
            id: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture || "",
            is_pro: false,
            free_trial_count: 2,
        };
        setUser(immediateUser);
        localStorage.setItem("stock_user", JSON.stringify(immediateUser));

        // 2단계: 백엔드 동기화 (실패해도 로그인은 유지)
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

            const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(googleUser),
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (res.ok) {
                const data = await res.json();
                if (data.status === "success" && data.user) {
                    const serverUser = { ...data.user };
                    setUser(serverUser);
                    localStorage.setItem("stock_user", JSON.stringify(serverUser));
                    if (data.token) localStorage.setItem("stock_token", data.token);
                }
            }
        } catch (e: any) {
            // 백엔드 실패해도 로그인은 유지 (이미 1단계에서 처리됨)
            console.warn("Backend sync failed (login still succeeded):", e.message);
        }

        // 백그라운드: 관심종목 마이그레이션
        fetch(`${API_BASE_URL}/api/watchlist/migrate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guest_id: "guest", target_id: googleUser.id }),
        }).catch(() => {});

        return true; // 항상 성공
    }, []);

    const logout = () => {
        setUser(null);
        localStorage.removeItem("stock_user");
        localStorage.removeItem("stock_token");
        window.location.href = "/";
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthContext.Provider value={{ user, login, logout, isLoading }}>
                {children}
            </AuthContext.Provider>
        </GoogleOAuthProvider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
