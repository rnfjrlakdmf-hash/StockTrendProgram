"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, User as UserIcon } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { login } = useAuth();
    const [errorMsg, setErrorMsg] = useState("");

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
            console.log("Google Login Success Triggered");
            if (tokenResponse.access_token) {
                try {
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
                            // [Nuclear Fix 7.0] Hard Redirect for reliability
                            window.location.assign("/");
                        }
                    } else {
                        setErrorMsg("구글 정보를 가져오는데 실패했습니다.");
                    }
                } catch (e) {
                    setErrorMsg("연동 중 통신 오류가 발생했습니다.");
                }
            }
        },
        onError: () => setErrorMsg("구글 로그인에 실패했습니다.")
    });

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
                    <h2 className="text-xl font-bold text-white mb-2">로그인 및 연동</h2>
                    <p className="text-sm text-gray-400 mb-8">구글 계정으로 간편하게 동기화하세요.</p>

                    <div className="w-full max-w-[280px] flex flex-col gap-4 justify-center mx-auto">
                        <button
                            onClick={() => {
                                setErrorMsg("");
                                googleLoginTrigger();
                            }}
                            className="w-full py-4 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-white/5 active:scale-95"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Google 계정으로 연동하기
                        </button>
                    </div>

                    {errorMsg && <p className="text-red-400 text-[11px] font-bold mt-6 bg-red-500/10 py-2 rounded-lg border border-red-500/20">{errorMsg}</p>}

                    <div className="text-[10px] text-gray-600 mt-10 mb-2 italic leading-relaxed">
                        * 구글 계정으로 안전하게 로그인 및 데이터 동기화가 진행됩니다.<br />
                        아이디 입력 필드는 사용자 요청으로 비활성화되었습니다.
                    </div>
                </div>
            </div>
        </div>
    );
}
