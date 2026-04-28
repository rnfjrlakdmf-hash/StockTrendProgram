"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { X } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { login } = useAuth();
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(/Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth <= 768);
    }, []);

    const handleGoogleSuccess = async (tokenResponse: any) => {
        setStatus("loading");
        try {
            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });

            if (!res.ok) throw new Error("구글 정보 조회 실패");

            const info = await res.json();
            await login({
                id: info.sub,
                email: info.email,
                name: info.name,
                picture: info.picture,
                token: tokenResponse.access_token,
            });

            // 로그인 항상 성공 → 즉시 닫고 새로고침
            onClose();
            window.location.reload();
        } catch (e: any) {
            setStatus("error");
            setErrorMsg("오류: " + (e.message || "다시 시도해 주세요."));
        }
    };

    const googleLogin = useGoogleLogin({
        flow: "implicit",
        ux_mode: isMobile ? "redirect" : "popup",
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
        onSuccess: handleGoogleSuccess,
        onError: (err: any) => {
            console.error("Google login error:", err);
            setStatus("error");
            setErrorMsg("구글 로그인 창이 차단되었습니다. 팝업 차단을 해제해 주세요.");
        },
    } as any);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative bg-[#111] border border-white/20 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="p-8">
                    {/* 헤더 */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
                            📈
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">AI Stock Analyst</h2>
                        <p className="text-sm text-gray-400">구글 계정으로 로그인하여<br />관심종목과 브리핑을 동기화하세요.</p>
                    </div>

                    {/* 구글 로그인 버튼 */}
                    <button
                        id="google-login-btn"
                        onClick={() => {
                            setStatus("loading");
                            setErrorMsg("");
                            googleLogin();
                        }}
                        disabled={status === "loading"}
                        className="w-full py-4 rounded-2xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {status === "loading" ? (
                            <>
                                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                <span>처리 중...</span>
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Google 계정으로 로그인
                            </>
                        )}
                    </button>

                    {/* 에러 메시지 */}
                    {status === "error" && errorMsg && (
                        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                            {errorMsg}
                        </div>
                    )}

                    {/* 안내 문구 */}
                    <p className="text-center text-[10px] text-gray-600 mt-6 leading-relaxed">
                        * 구글 계정 외 개인 정보는 저장되지 않습니다.<br />
                        * 팝업이 뜨지 않으면 브라우저의 팝업 차단을 해제해 주세요.
                    </p>
                </div>
            </div>
        </div>
    );
}
