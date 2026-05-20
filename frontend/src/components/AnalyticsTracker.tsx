"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const { user } = useAuth();

    // 1. Unique Visitor ID 생성 & 관리
    const getVisitorId = (): string => {
        if (typeof window === "undefined") return "ssr_visitor";
        
        // 로그인한 회원이면 회원 ID를 우선 사용
        if (user?.id) {
            return `user_${user.id}`;
        }
        
        let id = localStorage.getItem("site_visitor_id");
        if (!id) {
            id = `guest_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
            localStorage.setItem("site_visitor_id", id);
        }
        return id;
    };

    // 2. 페이지뷰 전송 핸들러
    const sendPing = async (isPageview: boolean) => {
        try {
            // 관리자 계정(rnfjr@gmail.com, rnfjrlakdmf@gmail.com)은 PV/UV 수집 대상에서 제외
            if (user?.email && (user.email === "rnfjr@gmail.com" || user.email === "rnfjrlakdmf@gmail.com")) {
                console.log("[Analytics] Skipping analytics ping for admin user:", user.email);
                return;
            }

            const visitorId = getVisitorId();

            // 관리자 고유 식별자(Google ID 등)가 visitor_id에 포함된 경우에도 수집 제외
            if (visitorId.includes("110418985320259217419") || visitorId.includes("rnfjr@gmail.com") || visitorId.includes("rnfjrlakdmf@gmail.com")) {
                console.log("[Analytics] Skipping analytics ping for admin visitor ID:", visitorId);
                return;
            }

            await fetch(`${API_BASE_URL}/api/system/analytics/ping`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    visitor_id: visitorId,
                    is_pageview: isPageview,
                }),
            });
        } catch (e) {
            console.error("[Analytics] Ping failed:", e);
        }
    };

    // 3. 페이지가 변경될 때마다 페이지뷰(PV) 보고
    useEffect(() => {
        sendPing(true);
    }, [pathname, user]); // 사용자가 로그인하거나 페이지 경로가 바뀔 때 실행

    // 4. 실시간 동시 접속자(Active User) 보고 (60초 주기 핑)
    useEffect(() => {
        const interval = setInterval(() => {
            sendPing(false); // 페이지 이동은 아니므로 is_pageview: false
        }, 60000);

        return () => clearInterval(interval);
    }, [user]);

    return null; // UI 없이 기능만 수행
}
