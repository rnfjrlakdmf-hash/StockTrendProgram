"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MobileLoginPage() {
    const { login, user } = useAuth();
    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [agreed, setAgreed] = useState(false);

    // If already logged in (and not a guest), go back
    useEffect(() => {
        if (user && !(user as any).is_guest) {
            window.location.href = "/";
        }
    }, [user]);

    // 수동 OAuth 2.0 리다이렉트 (WebView 400 Malformed Error 방지 및 계정 선택/직접 입력 지원)
    const googleLogin = () => {
        const clientId = "385839147502-h2rjnk44258jciamfsjgc9nsmnt052u8.apps.googleusercontent.com";
        const redirectUri = window.location.origin; // https://stock-trend-program.vercel.app
        const scope = "email profile openid";
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=select_account`;
        window.location.href = authUrl;
    };

    // 카카오 소셜 로그인 리다이렉트
    const kakaoLogin = () => {
        const clientId = "d8796066436c590e1c9aded21b13c929"; // User provided REST API Key
        const redirectUri = window.location.origin + "/auth/kakao/callback";
        const authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
        window.location.href = authUrl;
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-12 transition-colors">
                    <ArrowLeft size={16} />
                    <span>홈으로 돌아가기</span>
                </Link>

                <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-3xl mx-auto mb-6 shadow-2xl shadow-blue-500/20 flex items-center justify-center text-3xl">
                    📈
                </div>

                <h1 className="text-2xl font-bold mb-2">AI Stock Analyst</h1>
                <p className="text-gray-400 text-sm mb-8">카카오/구글 계정으로 로그인하여<br />관심종목과 브리핑을 동기화하세요.</p>

                {/* 약관 동의 체크박스 */}
                <div className="flex items-center gap-2 mb-6 justify-center">
                    <input
                        type="checkbox"
                        id="terms-agree-chk"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-black text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="terms-agree-chk" className="text-xs text-gray-400 select-none cursor-pointer">
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">이용약관</a>
                        {" 및 "}
                        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">개인정보 처리방침</a>
                        {"에 동의합니다 (필수)"}
                    </label>
                </div>

                <div className="flex flex-col gap-3">
                    {/* 카카오 로그인 버튼 */}
                    <button
                        onClick={() => {
                            if (!agreed) {
                                alert("서비스 이용약관 및 개인정보 처리방침에 동의해 주세요.");
                                return;
                            }
                            setStatus("loading");
                            setErrorMsg("");
                            kakaoLogin();
                        }}
                        disabled={status === "loading"}
                        className="w-full py-4 rounded-2xl bg-[#FEE500] text-black font-bold text-sm hover:bg-[#FEE500]/90 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {status === "loading" ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                <span>처리 중...</span>
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.827 1.83 5.313 4.606 6.815-.224.847-.812 3.08-.85 3.25-.054.24.084.24.215.155.103-.067 3.395-2.27 4.743-3.167.416.035.845.053 1.286.053 5.523 0 10-3.582 10-8s-4.477-8-10-8z"/>
                                </svg>
                                카카오로 1초 만에 시작하기
                            </>
                        )}
                    </button>

                    {/* 구글 로그인 버튼 */}
                    <button
                        onClick={() => {
                            if (!agreed) {
                                alert("서비스 이용약관 및 개인정보 처리방침에 동의해 주세요.");
                                return;
                            }
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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                구글 계정으로 로그인
                            </>
                        )}
                    </button>
                </div>

                {status === "error" && (
                    <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {errorMsg}
                    </div>
                )}

                <div className="mt-12 pt-8 border-t border-white/10">
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                        모바일 환경(카카오톡, 인앱 브라우저 등)에서는 팝업 대신 리다이렉트 방식이 권장됩니다. 로그인이 완료되면 자동으로 홈 화면으로 이동합니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
