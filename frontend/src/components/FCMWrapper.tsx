"use client";

import { useEffect, useState } from "react";
import FCMTokenManager from "./FCMTokenManager";
import SafeErrorBoundary from "./SafeErrorBoundary";
import IOSInstallBanner from "./IOSInstallBanner";

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
        </SafeErrorBoundary>
    );
}
