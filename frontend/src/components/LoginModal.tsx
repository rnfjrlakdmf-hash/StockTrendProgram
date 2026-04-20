"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, User as UserIcon, LogIn } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { login, demoLogin, manualLogin } = useAuth();
    const [errorMsg, setErrorMsg] = useState("");
    const [manualId, setManualId] = useState("");

    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth <= 768;
        }
        return false;
    });
    
    useEffect(() => {
        const checkMobile = () => {
             const userAgentCheck = /Mobi|Android|iPhone/i.test(navigator.userAgent);
             const screenWidthCheck = window.innerWidth <= 768;
             setIsMobile(userAgentCheck || screenWidthCheck);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const googleLoginTrigger = useGoogleLogin({
        flow: 'implicit',
        ux_mode: isMobile ? 'redirect' : 'popup', 
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : undefined,
        onSuccess: async (tokenResponse) => {
            if (tokenResponse.access_token) {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (res.ok) {
                    const userInfo = await res.json();
                    const googleUser = {
                        id: userInfo.sub,
                        email: userInfo.email,
                        name: userInfo.name,
                        picture: userInfo.picture,
                        token: tokenResponse.access_token
                    };
                    const success = await login(googleUser);
                    if (success) {
                        onClose();
                        window.location.reload();
                    }
                }
            }
        },
        onError: () => setErrorMsg("구글 로그인에 실패했습니다.")
    });

    const handleManualLogin = () => {
        if (!manualId.trim()) {
            setErrorMsg("아이디를 입력해주세요.");
            return;
        }
        manualLogin(manualId);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative bg-[#111] border border-white/20 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="absolute top-4 right-4">
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">로그인</h2>
                    <p className="text-sm text-gray-400 mb-8">나만의 투자 포트폴리오를 관리하세요.</p>

                    <div className="w-full max-w-[280px] flex flex-col gap-4 justify-center mx-auto">
                        <button
                            onClick={() => googleLoginTrigger()}
                            className="w-full py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Google로 계속하기
                        </button>

                        <div className="relative flex py-1 items-center">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] font-bold uppercase tracking-widest">or</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        {/* Manual ID Input */}
                        <div className="space-y-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="아이디 입력 (예: myid123)"
                                    value={manualId}
                                    onChange={(e) => setManualId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualLogin()}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                />
                            </div>
                            <button
                                onClick={handleManualLogin}
                                className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group"
                            >
                                <LogIn size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                아이디로 로그인
                            </button>
                        </div>

                        <button
                            onClick={demoLogin}
                            className="w-full py-2 hover:bg-white/5 text-gray-500 hover:text-gray-300 text-[11px] font-bold transition-all rounded-xl"
                        >
                            로그인 없이 데모 계정으로 시작하기
                        </button>
                    </div>
                </div>

                {errorMsg && <p className="text-red-400 text-[11px] font-bold mb-4 px-8 text-center">{errorMsg}</p>}

                <div className="text-[10px] text-gray-600 mt-4 mb-8 italic text-center px-8 leading-relaxed">
                    * 입력하신 아이디는 브라우저에 안전하게 저장됩니다.<br />
                    분실 시 복구가 어려우니 꼭 기억해 주세요.
                </div>
            </div>
        </div>
    );
}
