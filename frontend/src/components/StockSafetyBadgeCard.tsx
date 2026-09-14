"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import StockHealthChecker from "@/components/StockHealthChecker";
import {
    ShieldCheck,
    ChevronRight,
    X,
    ExternalLink
} from "lucide-react";

interface StockSafetyBadgeCardProps {
    symbol: string;
    stockName: string;
    currency?: string;
    className?: string;
}

interface ChecklistItem {
    id: string;
    category: string;
    question: string;
    score: number;
    maxScore: number;
    status: "pass" | "warn" | "fail";
    headline: string;
    description: string;
    badge: string;
    icon: string;
}

interface StockHealthData {
    status: string;
    stockName: string;
    ticker: string;
    currentPrice: number;
    previousClose: number;
    totalScore: number;
    grade: {
        level: "S" | "A" | "B" | "C";
        label: string;
        color: string;
        summary: string;
    };
    checklist: ChecklistItem[];
    disclaimer: string;
}

export default function StockSafetyBadgeCard({
    symbol,
    stockName,
    currency = "KRW",
    className = ""
}: StockSafetyBadgeCardProps) {
    const [data, setData] = useState<StockHealthData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 6자리 종목코드 추출
    const cleanTicker = symbol
        ? symbol.includes(".")
            ? symbol.split(".")[0]
            : symbol
        : "";

    // 국내 주식(코스피/코스닥) 여부 검사
    const isKorean =
        currency === "KRW" ||
        symbol.includes(".KS") ||
        symbol.includes(".KQ") ||
        /^\d{6}$/.test(cleanTicker);

    useEffect(() => {
        if (!cleanTicker || !isKorean) {
            setData(null);
            return;
        }

        let isCancelled = false;
        const fetchHealth = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/stock-health/${encodeURIComponent(cleanTicker)}`);
                if (!res.ok) throw new Error("건전성 진단 실패");
                const json: StockHealthData = await res.json();
                if (!isCancelled && json.status === "success") {
                    setData(json);
                }
            } catch (err) {
                if (!isCancelled) setData(null);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        fetchHealth();
        return () => {
            isCancelled = true;
        };
    }, [cleanTicker, isKorean]);

    // 모달 활성화 시 배경 스크롤 방지
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isModalOpen]);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsModalOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // 국내 주식이 아니면 렌더링하지 않음
    if (!isKorean || !cleanTicker) {
        return null;
    }

    const getGradeBadge = (level?: string) => {
        switch (level) {
            case "S":
                return "bg-emerald-500 text-slate-950 font-black shadow-emerald-500/20";
            case "A":
                return "bg-blue-500 text-white font-black shadow-blue-500/20";
            case "B":
                return "bg-amber-500 text-slate-950 font-black shadow-amber-500/20";
            default:
                return "bg-rose-500 text-white font-black shadow-rose-500/20";
        }
    };

    return (
        <>
            {/* 5대 안전벨트 진단 미니 카드 (벤토 그리드 정렬 호환) */}
            <div
                onClick={() => setIsModalOpen(true)}
                className={`p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 hover:border-emerald-400/70 shadow-lg hover:shadow-emerald-500/15 flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer group w-full h-full relative overflow-hidden ${className}`}
                title="클릭하여 5대 안전벨트 상세 진단표 열기"
            >
                {/* 은은한 배경 에메랄드 글로우 효과 */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

                {/* 상단: 타이틀 및 등급 뱃지 */}
                <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                    5대 안전벨트 진단
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    초보자 필수
                                </span>
                            </div>
                            <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                                {stockName} 건전성 팩트
                            </div>
                        </div>
                    </div>

                    {data && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full shadow-sm ${getGradeBadge(data.grade.level)}`}>
                            {data.grade.level}등급
                        </span>
                    )}
                </div>

                {/* 중간: 스코어 및 5대 지표 미니 칩 */}
                <div className="relative z-10">
                    {loading ? (
                        <div className="py-2 space-y-2 animate-pulse">
                            <div className="h-6 bg-zinc-800 rounded w-1/2" />
                            <div className="h-4 bg-zinc-800/60 rounded w-3/4" />
                        </div>
                    ) : data ? (
                        <div className="space-y-1.5">
                            <div className="flex items-baseline justify-between gap-2">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                                        {data.totalScore}
                                    </span>
                                    <span className="text-xs text-zinc-400 font-bold">/ 100점</span>
                                </div>
                                <span className="text-xs font-extrabold text-emerald-400 truncate">
                                    {data.grade.label}
                                </span>
                            </div>

                            {/* 5대 항목 간이 뱃지 (실적/가치/수급/과열/부채) */}
                            <div className="grid grid-cols-5 gap-1 pt-1 text-[10px] font-medium text-center">
                                {data.checklist.map((c) => {
                                    const isPass = c.status === "pass";
                                    const isWarn = c.status === "warn";
                                    return (
                                        <div
                                            key={c.id}
                                            className={`px-1 py-0.5 rounded border truncate ${
                                                isPass
                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                                    : isWarn
                                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                            }`}
                                            title={`${c.category}: ${c.headline}`}
                                        >
                                            {c.category.slice(0, 2)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-zinc-400 py-1">
                            클릭하여 5대 팩트 건전성 검진 확인
                        </div>
                    )}
                </div>

                {/* 하단: 클릭 액션 버튼 */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors relative z-10">
                    <span className="flex items-center gap-1">
                        <span>🔍 5대 팩트 상세 진단표 확인</span>
                    </span>
                    <div className="flex items-center gap-0.5 text-xs">
                        <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200">클릭</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </div>
            </div>

            {/* 상세 진단표 팝업 모달 */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl my-auto max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 모달 상단 헤더 */}
                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                        <span>{stockName} ({cleanTicker})</span>
                                        <span className="text-xs font-normal text-emerald-400">5대 안전벨트 진단</span>
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        DART 전자공시 및 한국거래소 시세 팩트 기반 자가점검표
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={`/safety?ticker=${cleanTicker}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-colors"
                                >
                                    <span>새 창으로 열기</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                    aria-label="닫기"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* 모달 본문: StockHealthChecker */}
                        <div>
                            <StockHealthChecker initialTicker={cleanTicker} hideSearchBar={true} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
