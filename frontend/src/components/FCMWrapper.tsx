"use client";

import dynamic from "next/dynamic";

const FCMTokenManager = dynamic(() => import("./FCMTokenManager"), {
    ssr: false,
});

export default function FCMWrapper() {
    return <FCMTokenManager />;
}
