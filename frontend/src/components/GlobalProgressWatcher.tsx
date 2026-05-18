"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface IndexingStatus {
    status: "idle" | "running" | "done" | "error" | "initializing";
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

                // [Fix] Check if response is OK before parsing
                if (!res.ok) {
                    // Silently ignore server errors (e.g. 500, 404)
                    return;
                }

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
                // [Fix] Silently ignore fetch errors (backend might not be ready)
                // This is a non-critical feature, so no need to spam console
            }
        };

        // Poll every 2 seconds
        const interval = setInterval(checkStatus, 2000);
        checkStatus(); // Initial check

        return () => clearInterval(interval);
    }, [visible]);

    // [Updated] Always show a small indicator or the full panel
    if (!status) {
        return (
            <div className="w-full opacity-60">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-gray-400 font-bold">실시간 뉴스 엔진 대기 중 (Active)</span>
                </div>
            </div>
        );
    }

    // Calculate Percentage
    let percent = 0;
    if ((status?.total_pages || 0) > 0) {
        percent = Math.round(((status?.page || 0) / (status?.total_pages || 1)) * 100);
    }
    // If we are in "done" state, show 100%
    if (status?.status === "done") percent = 100;

    return (
        <div className="w-full animate-in fade-in duration-700 slide-in-from-bottom-2">
            <div className="relative overflow-hidden bg-[#0f111a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] group hover:border-white/10 transition-colors">
                
                {/* Background Ambient Glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none"></div>

                {/* Header */}
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${
                            status?.status === "running" ? "bg-blue-500/20 text-blue-400" :
                            status?.status === "done" ? "bg-emerald-500/20 text-emerald-400" :
                            status?.status === "error" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"
                        }`}>
                            {status?.status === "running" && <Loader2 className="w-4 h-4 animate-spin" />}
                            {status?.status === "done" && <CheckCircle2 className="w-4 h-4" />}
                            {status?.status === "error" && <AlertCircle className="w-4 h-4" />}
                            {status?.status === "initializing" && <Loader2 className="w-4 h-4 animate-spin" />}
                        </div>

                        <span className="font-bold text-[13px] text-white tracking-wide">
                            {status?.status === "running" ? "글로벌 마켓 데이터 동기화" :
                                status?.status === "initializing" ? "AI 분석 엔진 초기화" :
                                status?.status === "done" ? "데이터 동기화 완료" : "동기화 오류 발생"}
                        </span>
                    </div>
                    
                    {/* Status Badge / Percentage */}
                    {status?.status === "running" && (
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <span className="text-xs font-black text-blue-400">{percent}%</span>
                        </div>
                    )}
                    {status?.status === "done" && (
                        <span className="text-xs font-black text-emerald-400">100%</span>
                    )}
                </div>

                {/* Progress Bar Container */}
                <div className="relative w-full h-1.5 bg-gray-800/80 rounded-full mb-3 overflow-hidden shadow-inner z-10">
                    <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out ${
                            status?.status === "done" ? "bg-gradient-to-r from-emerald-400 to-green-500" :
                            status?.status === "error" ? "bg-gradient-to-r from-red-500 to-rose-600" : 
                            "bg-gradient-to-r from-blue-500 to-indigo-500"
                        }`}
                        style={{ width: `${percent}%` }}
                    >
                        {/* Shimmer Effect inside progress bar */}
                        {status?.status === "running" && (
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12 translate-x-[-100%]"></div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="relative z-10">
                    {status?.status === "running" && (
                        <div className="flex justify-between items-center text-[11px] font-medium text-gray-400">
                            <span className="truncate pr-4 text-blue-200/70">
                                {status?.market ? `수집 중: ${status.market}` : "데이터 수집 준비 중..."}
                            </span>
                            <span className="shrink-0 bg-white/5 px-2 py-0.5 rounded-md">
                                {status?.page} / {status?.total_pages || "?"} Page
                            </span>
                        </div>
                    )}

                    {status?.status === "done" && (
                        <p className="text-[11px] text-emerald-400/80 font-medium">
                            ✓ 총 {status?.total_stocks?.toLocaleString() || 0}개 종목 업데이트가 성공적으로 완료되었습니다.
                        </p>
                    )}

                    {status?.status === "error" && (
                        <p className="text-[11px] text-red-400/80 font-medium truncate">
                            {status?.error || "네트워크 불안정으로 동기화에 실패했습니다."}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
