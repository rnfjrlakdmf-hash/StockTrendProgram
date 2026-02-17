"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import { GoogleOAuthProvider } from "@react-oauth/google";

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
        // Init: Check localStorage
        const storedUser = localStorage.getItem("stock_user");
        const adminFree = localStorage.getItem('admin_free_mode') === 'true'; // Direct check to avoid import cycle if lib uses context

        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // [Admin Mode] Override Pro Status
                if (adminFree) {
                    parsedUser.is_pro = true;
                    console.log("🎁 Admin Free Mode Active: User set to PRO");
                }
                setUser(parsedUser);
            } catch (e) {
                console.error("User Parse Error", e);
            }
        } else if (adminFree) {
            // [Admin Mode] Create dummy user for guests to access Pro features that require login
            const adminGuest = {
                id: "admin_guest",
                email: "guest@admin.mode",
                name: "Admin Guest",
                picture: "",
                is_pro: true
            };
            setUser(adminGuest);
            console.log("🎁 Admin Free Mode: Guest upgraded to Admin User");
        }
        setIsLoading(false);
    }, []);

    const login = async (googleUser: any) => {
        // Backend Login
        console.log("AuthContext: login called with", googleUser);
        alert(`2단계: 서버(${API_BASE_URL})로 로그인 정보 전송 중...`);
        try {
            console.log(`Sending POST request to ${API_BASE_URL}/api/auth/google`);
            const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(googleUser)
            });
            console.log("Response status:", res.status);

            if (!res.ok) {
                console.error("Login API response not OK:", res.statusText);
                alert("서버 오류: " + res.status);
                return false;
            }

            const data = await res.json();
            console.log("Login API data:", data);

            if (data.status === "success") {
                const newUser = data.user;
                console.log("Setting user state:", newUser);
                setUser(newUser);
                localStorage.setItem("stock_user", JSON.stringify(newUser));
                // Set Token if needed (data.token)
                if (data.token) {
                    localStorage.setItem("stock_token", data.token);
                }

                alert("3단계: 서버 로그인 성공! 사용자 정보를 저장했습니다.");
                return true;
            } else {
                console.error("Login API returned error status:", data);
                alert("서버 응답 실패: " + JSON.stringify(data));
                return false;
            }
        } catch (e: any) {
            console.error("Login API Exception", e);
            alert("통신 오류: " + e.message);
            return false;
        }
    };

    // Handle Google Redirect Login (Implicit Flow)
    useEffect(() => {
        const handleRedirect = async () => {
            const hash = window.location.hash;
            if (hash && hash.includes("access_token")) {
                console.log("Found access_token in hash, processing login...");
                try {
                    const params = new URLSearchParams(hash.substring(1));
                    const accessToken = params.get("access_token");

                    if (accessToken) {
                        // Clean URL hash immediately
                        window.history.replaceState(null, "", window.location.pathname);

                        alert("구글 인증 확인됨. 사용자 정보를 가져옵니다...");
                        // Fetch User Info
                        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });

                        if (!res.ok) throw new Error("Failed to fetch Google User Info");

                        const userInfo = await res.json();
                        console.log("Fetched Google User Info:", userInfo);

                        const googleUser = {
                            id: userInfo.sub,
                            email: userInfo.email,
                            name: userInfo.name,
                            picture: userInfo.picture,
                            token: accessToken
                        };

                        const success = await login(googleUser);
                        if (success) {
                            window.location.reload();
                        }
                    }
                } catch (e: any) {
                    console.error("Redirect Login Error:", e);
                    alert("로그인 처리 실패: " + e.message);
                }
            }
        };

        handleRedirect();
    }, []);

    const logout = () => {
        setUser(null);
        localStorage.removeItem("stock_user");
        localStorage.removeItem("stock_token");
        window.location.href = "/"; // Refresh logic
    };

    return (
        <GoogleOAuthProvider clientId="385839147502-p66mmuojl8g3vmclmvdqj54a3hk677nr.apps.googleusercontent.com">
            <AuthContext.Provider value={{ user, login, logout, isLoading }}>
                {children}
            </AuthContext.Provider>
        </GoogleOAuthProvider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
