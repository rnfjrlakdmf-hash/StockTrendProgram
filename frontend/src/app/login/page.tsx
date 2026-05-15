"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MobileLoginPage() {
    const { login, user } = useAuth();
    const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState("");

    // If already logged in, go back
    useEffect(() => {
        if (user) {
            window.location.href = "/";
        }
    }, [user]);

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

            window.location.href = "/";
        } catch (e: any) {
            setStatus("error");
            setErrorMsg(e.message || "로그인 중 오류가 발생했습니다.");
        }
    };

    const googleLogin = useGoogleLogin({
        ux_mode: "redirect",
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
        onSuccess: handleGoogleSuccess,
        onError: (err) => {
            console.error(err);
            setStatus("error");
            setErrorMsg("구글 로그인에 실패했습니다. 브라우저 설정을 확인해주세요.");
        }
    });

    useEffect(() => {
        // Automatically trigger on mount if not already logged in
        if (!user) {
            const timer = setTimeout(() => {
                googleLogin();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-12 transition-colors">
                    <ArrowLeft size={16} />
                    <span>홈으로 돌아가기</span>
                </Link>

                <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-3xl mx-auto mb-8 shadow-2xl shadow-blue-500/20 flex items-center justify-center text-3xl">
                    📈
                </div>

                <h1 className="text-2xl font-bold mb-2">구글 로그인 중</h1>
                <p className="text-gray-400 text-sm mb-8">안전한 로그인을 위해 구글 페이지로 이동합니다.</p>

                {status === "loading" && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                        <p className="text-blue-400 font-bold animate-pulse">잠시만 기다려주세요...</p>
                    </div>
                )}

                {status === "error" && (
                    <div className="space-y-6">
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {errorMsg}
                        </div>
                        <button
                            onClick={() => googleLogin()}
                            className="w-full py-4 rounded-2xl bg-white text-black font-bold hover:bg-gray-100 transition-all shadow-xl active:scale-95"
                        >
                            다시 시도하기
                        </button>
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
