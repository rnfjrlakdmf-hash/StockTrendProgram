"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, HelpCircle, ArrowRight, Zap, TrendingUp, ShieldCheck } from "lucide-react";

interface QuantTooltipProps {
    children: React.ReactNode;
    title: string;
    headline: string; // 한 줄 핵심 요약
    description: string; // 쉬운 설명
    tip?: string; // 실전 투자 꿀팁
    statusText?: string;
    statusColor?: "emerald" | "rose" | "blue" | "indigo" | "slate";
    forcePosition?: "top" | "bottom";
}

export default function QuantTooltip({
    children,
    title,
    headline,
    description,
    tip,
    statusText,
    statusColor = "emerald",
    forcePosition
}: QuantTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    // 기본값을 bottom(아래쪽)으로 두어 테이블 상단 잘림 원천 방지
    const [position, setPosition] = useState<"top" | "bottom">(forcePosition || "bottom");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (forcePosition) {
            setPosition(forcePosition);
            return;
        }
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            // 화면 아래 공간이 260px 미만이고 위쪽 공간이 충분할 때만 위쪽으로
            if (viewportHeight - rect.bottom < 260 && rect.top > 260) {
                setPosition("top");
            } else {
                setPosition("bottom");
            }
        }
    }, [isOpen, forcePosition]);

    // 바깥 터치 시 닫기 (모바일 대응)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(prev => !prev);
    };

    // 프리미엄 테마 설정 (테두리 글로우 & 헤더 액센트 바)
    const themeStyles = {
        emerald: {
            border: "border-emerald-500/40 shadow-[0_12px_40px_rgba(16,185,129,0.28)]",
            accentBar: "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500",
            badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
            dot: "bg-emerald-400",
            headlineText: "text-emerald-300",
            tipBorder: "border-emerald-500/20 bg-emerald-500/5",
            tipIcon: "text-emerald-400",
            arrowBorderTop: "border-r border-b border-emerald-500/40",
            arrowBorderBottom: "border-l border-t border-emerald-500/40",
        },
        indigo: {
            border: "border-indigo-500/40 shadow-[0_12px_40px_rgba(99,102,241,0.28)]",
            accentBar: "bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500",
            badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
            dot: "bg-indigo-400",
            headlineText: "text-indigo-300",
            tipBorder: "border-indigo-500/20 bg-indigo-500/5",
            tipIcon: "text-indigo-400",
            arrowBorderTop: "border-r border-b border-indigo-500/40",
            arrowBorderBottom: "border-l border-t border-indigo-500/40",
        },
        blue: {
            border: "border-blue-500/40 shadow-[0_12px_40px_rgba(59,130,246,0.28)]",
            accentBar: "bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-500",
            badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
            dot: "bg-blue-400",
            headlineText: "text-blue-300",
            tipBorder: "border-blue-500/20 bg-blue-500/5",
            tipIcon: "text-blue-400",
            arrowBorderTop: "border-r border-b border-blue-500/40",
            arrowBorderBottom: "border-l border-t border-blue-500/40",
        },
        rose: {
            border: "border-rose-500/40 shadow-[0_12px_40px_rgba(244,63,94,0.25)]",
            accentBar: "bg-gradient-to-r from-rose-400 via-amber-400 to-rose-500",
            badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
            dot: "bg-rose-400",
            headlineText: "text-rose-300",
            tipBorder: "border-rose-500/20 bg-rose-500/5",
            tipIcon: "text-rose-400",
            arrowBorderTop: "border-r border-b border-rose-500/40",
            arrowBorderBottom: "border-l border-t border-rose-500/40",
        },
        slate: {
            border: "border-slate-700 shadow-[0_12px_40px_rgba(0,0,0,0.6)]",
            accentBar: "bg-gradient-to-r from-slate-500 via-slate-400 to-slate-600",
            badge: "bg-slate-800 text-slate-300 border-white/10",
            dot: "bg-slate-400",
            headlineText: "text-slate-300",
            tipBorder: "border-white/5 bg-white/[0.03]",
            tipIcon: "text-slate-400",
            arrowBorderTop: "border-r border-b border-slate-700",
            arrowBorderBottom: "border-l border-t border-slate-700",
        }
    }[statusColor];

    return (
        <div 
            ref={containerRef} 
            className="relative inline-block"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {/* 트리거 버튼 (뱃지) */}
            <div 
                onClick={handleToggle} 
                className="cursor-pointer transition-transform active:scale-95"
            >
                {children}
            </div>

            {/* 프리미엄 럭셔리 툴팁 말풍선 */}
            {isOpen && (
                <div 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className={`absolute z-50 left-1/2 -translate-x-1/2 w-[290px] sm:w-[320px] rounded-2xl bg-[#0a0f1d]/98 backdrop-blur-2xl border ${themeStyles.border} p-4 text-left pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150 ${
                        position === "top" 
                            ? "bottom-full mb-3" 
                            : "top-full mt-3"
                    }`}
                >
                    {/* 상단 럭셔리 그라데이션 라인 */}
                    <div className={`absolute top-0 left-4 right-4 h-[2px] rounded-full ${themeStyles.accentBar}`}></div>

                    {/* 헤더: 지표 이름 & 상태 뱃지 */}
                    <div className="flex items-center justify-between gap-2 mb-2.5 pt-1 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                            <span className="font-bold text-white text-xs tracking-tight">{title}</span>
                        </div>
                        {statusText && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${themeStyles.badge}`}>
                                <span className={`w-1 h-1 rounded-full ${themeStyles.dot}`}></span>
                                {statusText}
                            </span>
                        )}
                    </div>

                    {/* 한 줄 핵심 요약 (눈에 확 들어오는 큰 글씨) */}
                    <div className="mb-2">
                        <p className={`text-[12.5px] font-bold leading-snug tracking-tight ${themeStyles.headlineText}`}>
                            {headline}
                        </p>
                    </div>

                    {/* 초보자도 1초 만에 이해되는 쉬운 설명 */}
                    <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans mb-3">
                        {description}
                    </p>

                    {/* 실전 투자 꿀팁 카드 */}
                    {tip && (
                        <div className={`rounded-xl p-2.5 text-[11px] font-sans border ${themeStyles.tipBorder} flex items-start gap-2 leading-relaxed`}>
                            <Zap className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${themeStyles.tipIcon}`} />
                            <div>
                                <span className="font-bold text-slate-200 mr-1">실전 체크:</span>
                                <span className="text-slate-300">{tip}</span>
                            </div>
                        </div>
                    )}

                    {/* 말풍선 다이아몬드 꼬리표 */}
                    {position === "top" ? (
                        <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-[5px] w-2.5 h-2.5 bg-[#0a0f1d] ${themeStyles.arrowBorderTop} rotate-45`}></div>
                    ) : (
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 -mb-[5px] w-2.5 h-2.5 bg-[#0a0f1d] ${themeStyles.arrowBorderBottom} rotate-45`}></div>
                    )}
                </div>
            )}
        </div>
    );
}
