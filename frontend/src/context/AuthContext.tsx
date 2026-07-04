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
    isMigrating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAdminEmail = (email: string | undefined | null): boolean => {
    if (!email) return false;
    const lower = email.toLowerCase();
    return lower === "rnfjr@gmail.com" || lower === "rnfjrlakdmf@gmail.com";
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false);

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("stock_user");
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                if (isAdminEmail(parsedUser.email)) {
                    parsedUser.is_pro = true;
                }
                // [v4] isPro localStorage 신호 삭제 - reward.ts에서 더 이상 사용 안 함
                localStorage.removeItem("isPro");
                setUser(parsedUser);
                
                // [Self-Healing] Silent background sync to ensure the backend DB 'users' table is populated
                fetch(`${API_BASE_URL}/api/auth/google`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: parsedUser.id,
                        email: parsedUser.email,
                        name: parsedUser.name,
                        picture: parsedUser.picture || ""
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.status === "success" && data.user) {
                        const serverUser = { ...data.user };
                        if (isAdminEmail(serverUser.email)) {
                            serverUser.is_pro = true;
                        }
                        // [v4] isPro 신호 사용 안 함
                        localStorage.removeItem("isPro");
                        localStorage.setItem("stock_user", JSON.stringify(serverUser));
                        localStorage.setItem("user_id", serverUser.id);
                        setUser(prev => {
                            if (prev && prev.id === serverUser.id) {
                                return serverUser;
                            }
                            return prev;
                        });
                    }
                })
                .catch(err => console.warn("Silent background user sync failed:", err));
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

    const login = useCallback(async (userData: any, provider: "google" | "kakao" = "google"): Promise<boolean> => {
        setIsMigrating(true);
        // 1단계: 즉시 로컬 상태 설정 (UI 즉각 반응)
        const immediateUser: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture || "",
            is_pro: isAdminEmail(userData.email) || userData.is_pro || false,
            free_trial_count: userData.free_trial_count ?? 2,
        };
        setUser(immediateUser);
        localStorage.setItem("stock_user", JSON.stringify(immediateUser));
        // [v4] isPro localStorage 신호 사용 안 함
        localStorage.removeItem("isPro");

        // 2단계: 카카오 로그인은 이미 백엔드 콜백에서 DB 처리가 끝났으므로 토큰 저장만 수행
        if (provider === "kakao") {
            localStorage.setItem("user_id", immediateUser.id);
            if (userData.token) localStorage.setItem("stock_token", userData.token);
        } else {
            // 구글 로그인의 경우 프론트에서 받은 토큰 정보로 백엔드 동기화 수행
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

                const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userData),
                    signal: controller.signal,
                });
                clearTimeout(timeout);

                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.user) {
                        const serverUser = { ...data.user };
                        if (isAdminEmail(serverUser.email)) {
                            serverUser.is_pro = true;
                        }
                        // [v4] isPro localStorage 신호 사용 안 함
                        localStorage.removeItem("isPro");
                        setUser(serverUser);
                        localStorage.setItem("stock_user", JSON.stringify(serverUser));
                        localStorage.setItem("user_id", serverUser.id);
                        if (data.token) localStorage.setItem("stock_token", data.token);
                    }
                }
            } catch (e: any) {
                console.warn("Backend sync failed (login still succeeded):", e.message);
            }
        }

        try {
            // 관심종목 마이그레이션이 완전히 종료될 때까지 대기
            await fetch(`${API_BASE_URL}/api/watchlist/migrate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guest_id: "guest", target_id: userData.id }),
            });
        } catch (e) {
            console.error("Migration request failed:", e);
        } finally {
            setIsMigrating(false);
        }

        return true; // 항상 성공
    }, []);

    const logout = () => {
        setUser(null);
        localStorage.removeItem("stock_user");
        localStorage.removeItem("user_id");
        localStorage.removeItem("stock_token");
        localStorage.removeItem("isPro");
        window.location.href = "/";
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthContext.Provider value={{ user, login, logout, isLoading, isMigrating }}>
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
