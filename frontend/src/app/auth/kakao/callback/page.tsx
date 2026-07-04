"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";

export default function KakaoCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const [status, setStatus] = useState("로그인 처리 중...");
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        
        const code = searchParams.get("code");
        if (!code) {
            setStatus("카카오 인증 코드를 찾을 수 없습니다.");
            setTimeout(() => router.push("/"), 2000);
            return;
        }

        hasProcessed.current = true;

        const processKakaoLogin = async () => {
            try {
                const redirectUri = window.location.origin + "/auth/kakao/callback";
                const res = await fetch(`${API_BASE_URL}/api/auth/kakao`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code, redirect_uri: redirectUri })
                });

                if (!res.ok) throw new Error("서버 통신 오류");
                
                const data = await res.json();
                if (data.status === "success" && data.user) {
                    await login(data.user, "kakao");
                    window.location.href = "/";
                } else {
                    throw new Error(data.message || "로그인 실패");
                }
            } catch (err: any) {
                console.error("Kakao login err:", err);
                setStatus("로그인에 실패했습니다. " + err.message);
                setTimeout(() => window.location.href = "/", 3000);
            }
        };

        processKakaoLogin();
    }, [searchParams, login]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-[#FEE500] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-semibold">{status}</p>
            </div>
        </div>
    );
}
