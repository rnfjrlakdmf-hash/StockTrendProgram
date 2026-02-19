"use client";

import dynamic from "next/dynamic";

const FCMTokenManager = dynamic(() => import("./FCMTokenManager"), {
    ssr: false,
});

import SafeErrorBoundary from "./SafeErrorBoundary";

export default function FCMWrapper() {
    return (
        <SafeErrorBoundary fallback={null}>
            <FCMTokenManager />
        </SafeErrorBoundary>
    );
}
