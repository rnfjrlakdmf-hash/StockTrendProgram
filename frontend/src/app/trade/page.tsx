"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function TradePage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const symbol = searchParams.get("symbol") || "";
    const price = searchParams.get("price")?.toString() || "0";

    const [copied, setCopied] = useState(false);

    // Auto-copy on load (Optional, might be annoying if permissions block it)
    // useEffect(() => {
    //   if (symbol) handleCopy();
    // }, [symbol]);

    const handleCopy = () => {
        if (!symbol) return;
        navigator.clipboard.writeText(symbol).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const openApp = (app: string) => {
        // 1. Copy symbol first
        handleCopy();

        // 2. Deep Link
        let url = "";
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

        switch (app) {
            case "TOSS":
                // Toss Securities
                url = "supertoss://";
                break;
            case "KIWOOM":
                // Kiwoom Hero S# (Android Intent / iOS Scheme)
                if (isAndroid) {
                    url = "intent://#Intent;package=com.kiwoom.heromts;end";
                } else {
                    url = "heroapp://"; // Guessing scheme, commonly used
                }
                break;
            case "KB":
                // KB M-able
                if (isAndroid) {
                    url = "intent://#Intent;package=com.kbsec.mts.iple;end";
                } else {
                    url = "kbbank://"; // Placeholder, might need specific one
                }
                break;
            case "MIRAE":
                // Mirae Asset m.Stock
                if (isAndroid) {
                    url = "intent://#Intent;package=com.miraeasset.trade;end";
                } else {
                    url = "miraeasset://";
                }
                break;
            case "NAMU":
                // Namu Securities
                url = "txsmart://";
                break;
            default:
                break;
        }

        if (url) {
            window.location.href = url;
        } else {
            alert("지원되지 않는 기기이거나 앱을 찾을 수 없습니다.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="z-10 w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-block bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-semibold mb-4"
                    >
                        🚀 매매 준비 완료
                    </motion.div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        {symbol || "종목명 없음"}
                    </h1>
                    <p className="text-2xl font-mono text-green-400">
                        {parseInt(price).toLocaleString()}원
                    </p>
                </div>

                {/* Copy Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-6 text-center space-y-4"
                >
                    <p className="text-gray-400 text-sm">
                        먼저 종목코드를 복사하세요!
                    </p>
                    <button
                        onClick={handleCopy}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2
                ${copied
                                ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                            }`}
                    >
                        {copied ? (
                            <>✅ 복사 완료!</>
                        ) : (
                            <>📋 {symbol} 복사하기</>
                        )}
                    </button>
                </motion.div>

                {/* App Launcher Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <AppButton name="토스증권" icon="🔵" active onClick={() => openApp("TOSS")} />
                    <AppButton name="나무증권" icon="🌳" active onClick={() => openApp("NAMU")} />
                    <AppButton name="키움증권" icon="🦸" active onClick={() => openApp("KIWOOM")} />
                    <AppButton name="KB증권" icon="🏦" active onClick={() => openApp("KB")} />
                    <AppButton name="미래에셋" icon="🐯" active onClick={() => openApp("MIRAE")} />
                    <button
                        onClick={() => router.push("/")}
                        className="col-span-1 bg-gray-800/50 hover:bg-gray-800 text-gray-400 py-3 rounded-xl text-sm font-medium transition-colors"
                    >
                        🏠 홈으로
                    </button>
                </div>

                <p className="text-xs text-center text-gray-500">
                    * 버튼을 누르면 코드가 자동 복사되고 앱이 실행됩니다.<br />
                    * 앱이 설치되어 있어야 합니다.
                </p>
            </div>
        </div>
    );
}

function AppButton({ name, icon, onClick, active }: {
    name: string,
    icon: string,
    onClick: () => void,
    active?: boolean
}) {
    return (
        <button
            onClick={onClick}
            className={`
                relative group overflow-hidden p-4 rounded-xl border transition-all duration-300
                flex flex-col items-center justify-center gap-2
                ${active
                    ? "bg-gray-900 border-gray-700 hover:border-gray-500 hover:bg-gray-800"
                    : "bg-gray-900/30 border-gray-800 opacity-50 cursor-not-allowed"}
            `}
        >
            <span className="text-2xl">{icon}</span>
            <span className="font-semibold text-gray-200">{name}</span>
            {active && (
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </button>
    )
}
