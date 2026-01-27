"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface IndexingStatus {
    status: "idle" | "running" | "done" | "error";
    market: string | null;
    page: number;
    total_pages: number;
    total_stocks: number;
    error?: string;
}

export default function GlobalProgressWatcher() {
    const [status, setStatus] = useState<IndexingStatus | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/system/status`);
                const json = await res.json();

                if (json.status === "success" && json.data?.indexing) {
                    const idx = json.data.indexing;
                    setStatus(idx);

                    // Show if running, or if done/error for a brief moment
                    if (idx.status === "running") {
                        setVisible(true);
                    } else if (idx.status === "done" && visible) {
                        // Keep visible for 3 seconds then hide
                        setTimeout(() => setVisible(false), 3000);
                    } else if (idx.status === "error" && visible) {
                        setTimeout(() => setVisible(false), 5000);
                    } else if (idx.status === "idle") {
                        setVisible(false);
                    }
                }
            } catch (e) {
                console.error("Failed to check system status", e);
            }
        };

        // Poll every 2 seconds
        const interval = setInterval(checkStatus, 2000);
        checkStatus(); // Initial check

        return () => clearInterval(interval);
    }, [visible]);

    if (!visible || !status) return null;

    // Calculate Percentage
    let percent = 0;
    if (status.total_pages > 0) {
        percent = Math.round((status.page / status.total_pages) * 100);
    }
    // If we are in "done" state, show 100%
    if (status.status === "done") percent = 100;

    return (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right-10 duration-500">
            <div className="bg-[#111] border border-white/20 rounded-xl shadow-2xl p-4 w-72 backdrop-blur-md bg-opacity-90">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {status.status === "running" && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                        {status.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        {status.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}

                        <span className="font-bold text-sm text-white">
                            {status.status === "running" ? "주식 데이터 동기화 중..." :
                                status.status === "done" ? "동기화 완료!" : "오류 발생"}
                        </span>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{percent}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${status.status === "done" ? "bg-green-500" :
                            status.status === "error" ? "bg-red-500" : "bg-blue-500"
                            }`}
                        style={{ width: `${percent}%` }}
                    />
                </div>

                {/* Detail Info */}
                {status.status === "running" && (
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>{status.market || "데이터 수집 준비 중..."}</span>
                        <span>{status.page} / {status.total_pages || "?"} 페이지</span>
                    </div>
                )}

                {status.status === "done" && (
                    <p className="text-xs text-gray-400">
                        총 {status.total_stocks}개 종목 업데이트됨
                    </p>
                )}

                {status.status === "error" && (
                    <p className="text-xs text-red-400 truncate">
                        {status.error || "알 수 없는 오류"}
                    </p>
                )}
            </div>
        </div>
    );
}
