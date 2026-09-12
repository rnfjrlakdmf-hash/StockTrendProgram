"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, HelpCircle, X } from "lucide-react";

interface QuantTooltipProps {
    children: React.ReactNode;
    title: string;
    description: string;
    subText?: string;
    statusText?: string;
    statusColor?: "emerald" | "rose" | "blue" | "indigo" | "slate";
}

export default function QuantTooltip({
    children,
    title,
    description,
    subText,
    statusText,
    statusColor = "emerald"
}: QuantTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<"top" | "bottom">("top");
    const containerRef = useRef<HTMLDivElement>(null);

    // 열릴 때 화면 여유 공간 체크하여 위/아래 자동 결정
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // 위쪽 공간이 200px 미만이면 아래로 표시
            if (rect.top < 220) {
                setPosition("bottom");
            } else {
                setPosition("top");
            }
        }
    }, [isOpen]);

    // 바깥 클릭 시 닫기 (모바일 대응)
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

    const colorBadgeClasses = {
        emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
        slate: "bg-slate-800 text-slate-400 border-white/10",
    }[statusColor];

    return (
        <div 
            ref={containerRef} 
            className="relative inline-block"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {/* 트리거 버튼 (뱃지 또는 아이콘) */}
            <div 
                onClick={handleToggle} 
                className="cursor-pointer transition-transform active:scale-95"
            >
                {children}
            </div>

            {/* 툴팁 말풍선 */}
            {isOpen && (
                <div 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className={`absolute z-50 left-1/2 -translate-x-1/2 w-64 sm:w-72 p-3.5 bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl text-left pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150 ${
                        position === "top" 
                            ? "bottom-full mb-2.5" 
                            : "top-full mt-2.5"
                    }`}
                    style={{ filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.8))" }}
                >
                    {/* 상단 헤더 & 닫기 버튼 */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-white/10">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="font-bold text-white text-xs tracking-tight">{title}</span>
                        </div>
                        {statusText && (
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${colorBadgeClasses}`}>
                                {statusText}
                            </span>
                        )}
                    </div>

                    {/* 설명 내용 */}
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans mb-2">
                        {description}
                    </p>

                    {/* 부가 팁 또는 기준 안내 */}
                    {subText && (
                        <div className="bg-white/5 rounded-lg p-2 text-[10px] text-slate-400 font-sans border border-white/5">
                            💡 <span className="text-slate-300">{subText}</span>
                        </div>
                    )}

                    {/* 말풍선 꼬리표 */}
                    {position === "top" ? (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2.5 h-2.5 bg-slate-900 border-r border-b border-slate-700/90 rotate-45"></div>
                    ) : (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-px w-2.5 h-2.5 bg-slate-900 border-l border-t border-slate-700/90 rotate-45"></div>
                    )}
                </div>
            )}
        </div>
    );
}
