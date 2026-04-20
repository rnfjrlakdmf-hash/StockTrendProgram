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
    demoLogin: () => void;
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
        const adminFree = localStorage.getItem('admin_free_mode') === 'true';

        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (adminFree) {
                    parsedUser.is_pro = true;
                    console.log("🎁 Admin Free Mode Active: User set to PRO");
                }
                setUser(parsedUser);
            } catch (e) {
                console.error("User Parse Error", e);
            }
        }
        setIsLoading(false);
    }, []);

    const migrateGuestWatchlist = async (toUserId: string) => {
        try {
            console.log(`[Migration] Moving items from guest to ${toUserId}...`);
            // Fire-and-forget migration to prevent blocking login flow
            fetch(`${API_BASE_URL}/api/watchlist/migrate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    guest_id: "guest",
                    target_id: toUserId
                })
            }).catch(err => console.error("Migration failed quietly", err));
        } catch (e) {
            console.error("Watchlist migration error", e);
        }
    };

    const login = async (googleUser: any) => {
        console.log("AuthContext: Starting backend login for", googleUser.email);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(googleUser)
            });

            if (!res.ok) {
                console.error("Backend login failed with status:", res.status);
                return false;
            }

            const data = await res.json();
            if (data.status === "success") {
                const newUser = data.user;
                
                // [Non-blocking Migration]
                migrateGuestWatchlist(newUser.id);
                
                setUser(newUser);
                localStorage.setItem("stock_user", JSON.stringify(newUser));
                if (data.token) localStorage.setItem("stock_token", data.token);

                return true;
            } else {
                console.error("Backend returned error:", data);
                return false;
            }
        } catch (e: any) {
            console.error("Login Exception:", e);
            return false;
        }
    };

    const demoLogin = () => {
        let demoId = localStorage.getItem("demo_id");
        if (!demoId) {
            demoId = "demo_" + Math.random().toString(36).substring(7);
            localStorage.setItem("demo_id", demoId);
        }

        const demoUser: User = {
            id: demoId,
            email: "demo@stocktrend.ai",
            name: "데모 사용자",
            picture: "",
            is_pro: true
        };

        migrateGuestWatchlist(demoId);
        setUser(demoUser);
        localStorage.setItem("stock_user", JSON.stringify(demoUser));
        // Hard redirect to clear UI state
        window.location.assign("/");
    };

    // Handle Google Redirect Login (Mobile UX)
    useEffect(() => {
        const handleRedirect = async () => {
            const hash = window.location.hash;
            if (hash && hash.includes("access_token")) {
                const hashParams = new URLSearchParams(hash.substring(1));
                const accessToken = hashParams.get("access_token");
                if (accessToken) {
                    window.history.replaceState(null, "", window.location.pathname);
                    try {
                        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });
                        if (res.ok) {
                            const userInfo = await res.json();
                            const success = await login({
                                id: userInfo.sub,
                                email: userInfo.email,
                                name: userInfo.name,
                                picture: userInfo.picture,
                                token: accessToken
                            });
                            if (success) {
                                // Important: Hard redirect to dashboard
                                window.location.assign("/");
                            }
                        }
                    } catch (e) {
                        console.error("Redirect flow failed", e);
                    }
                }
            }
        };
        handleRedirect();
    }, []);

    const logout = () => {
        setUser(null);
        localStorage.removeItem("stock_user");
        localStorage.removeItem("stock_token");
        window.location.href = "/";
    };

    return (
        <GoogleOAuthProvider clientId="385839147502-h2rjnk44258jciamfsjgc9nsmnt052u8.apps.googleusercontent.com">
            <AuthContext.Provider value={{ user, login, demoLogin, logout, isLoading }}>
                {children}
            </AuthContext.Provider>
        </GoogleOAuthProvider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}
