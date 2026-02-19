"use client";

import { useEffect, useState } from "react";
import FCMTokenManager from "./FCMTokenManager";
import SafeErrorBoundary from "./SafeErrorBoundary";

export default function FCMWrapper() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <SafeErrorBoundary fallback={null}>
            <FCMTokenManager />
        </SafeErrorBoundary>
    );
}
