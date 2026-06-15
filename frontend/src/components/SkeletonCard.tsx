'use client';

import React from 'react';

// ─── 공통 shimmer 애니메이션 wrapper ───────────────────────────
function Shimmer({ className = '' }: { className?: string }) {
    return (
        <div
            className={`relative overflow-hidden bg-white/5 rounded-lg ${className}`}
        >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>
    );
}

// ─── 랭킹 박스 스켈레톤 ────────────────────────────────────────
export function RankingBoxSkeleton() {
    return (
        <div className="w-full bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-indigo-900/30 border-b border-indigo-500/20 px-4 py-3 flex justify-between items-center">
                <Shimmer className="h-5 w-32" />
                <Shimmer className="h-5 w-20" />
            </div>
            <div className="divide-y divide-white/5">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <Shimmer className="w-7 h-7 rounded-full flex-shrink-0" />
                        <Shimmer className="h-4 w-24 flex-1" />
                        <Shimmer className="h-4 w-16" />
                        <Shimmer className="h-4 w-14" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── 마켓 스캐너 스켈레톤 ─────────────────────────────────────
export function MarketScannerSkeleton() {
    return (
        <div className="bg-black/60 border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
                <Shimmer className="w-4 h-4 rounded-full" />
                <Shimmer className="h-5 w-40" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                {[0, 1].map(i => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 space-y-2">
                        <Shimmer className="h-4 w-20" />
                        <Shimmer className="h-7 w-24" />
                        <Shimmer className="h-2 w-full rounded-full" />
                    </div>
                ))}
            </div>
            <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-2">
                        <Shimmer className="h-4 w-16" />
                        <Shimmer className="h-4 flex-1" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── 뉴스/브리핑 스켈레톤 ────────────────────────────────────
export function BriefingSkeleton() {
    return (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
                <Shimmer className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Shimmer className="h-5 w-48" />
                    <Shimmer className="h-3 w-32" />
                </div>
            </div>
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                        <Shimmer className="h-4 w-full" />
                        <Shimmer className="h-4 w-4/5" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── 인기 테마 TOP10 스켈레톤 ─────────────────────────────────
export function TrendingThemesSkeleton() {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <Shimmer className="w-4 h-4 rounded-full" />
                <Shimmer className="h-5 w-36" />
            </div>
            <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between">
                            <Shimmer className="w-6 h-5 rounded" />
                            <Shimmer className="w-12 h-4 rounded" />
                        </div>
                        <Shimmer className="h-5 w-full" />
                        <Shimmer className="h-3 w-3/4" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── 주식 결과 카드 스켈레톤 ─────────────────────────────────
export function StockResultSkeleton() {
    return (
        <div className="space-y-4">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <Shimmer className="h-7 w-36" />
                        <Shimmer className="h-4 w-24" />
                    </div>
                    <Shimmer className="h-10 w-28 rounded-xl" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-3 space-y-1">
                            <Shimmer className="h-3 w-16" />
                            <Shimmer className="h-5 w-20" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── 테마 분석 스켈레톤 ──────────────────────────────────────
export function ThemeAnalysisSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                <Shimmer className="h-6 w-48" />
                <Shimmer className="h-4 w-full" />
                <Shimmer className="h-4 w-3/4" />
                <div className="grid grid-cols-3 gap-3 pt-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-3 space-y-2">
                            <Shimmer className="h-4 w-16" />
                            <Shimmer className="h-5 w-20" />
                            <Shimmer className="h-3 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
