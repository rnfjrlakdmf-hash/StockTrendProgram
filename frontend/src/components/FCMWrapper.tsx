"use client";

import FCMTokenManager from "./FCMTokenManager";
import SafeErrorBoundary from "./SafeErrorBoundary";

export default function FCMWrapper() {
    return (
        <SafeErrorBoundary fallback={null}>
            <FCMTokenManager />
        </SafeErrorBoundary>
    );
}
