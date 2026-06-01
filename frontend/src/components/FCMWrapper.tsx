"use client";

import { useEffect, useState } from "react";
import FCMTokenManager from "./FCMTokenManager";
import SafeErrorBoundary from "./SafeErrorBoundary";
import IOSInstallBanner from "./IOSInstallBanner";
import AndroidInstallBanner from "./AndroidInstallBanner";

export default function FCMWrapper() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <SafeErrorBoundary fallback={null}>
            <FCMTokenManager />
            {/* iOS 사파리 유저 전용 홈화면 추가 안내 배너 */}
            <IOSInstallBanner />
            {/* 안드로이드 전용 PWA 설치 원클릭 버튼 배너 */}
            <AndroidInstallBanner />
        </SafeErrorBoundary>
    );
}
