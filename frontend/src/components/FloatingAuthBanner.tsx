"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import LoginModal from "./LoginModal";
import { Sparkles, X, ChevronRight, Zap } from "lucide-react";

export default function FloatingAuthBanner() {
    const { user, isMigrating } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // 세션 중 닫기 버튼을 누른 적이 있는지 확인 (선택 사항: 새로고침 시 다시 노출)
        const isDismissed = sessionStorage.getItem("dismissed_auth_banner");
        if (isDismissed) {
            setDismissed(true);
        }
    }, []);

    // 로그인한 유저는 절대 노출하지 않음
    if (!mounted || user || dismissed) {
        return null;
    }

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDismissed(true);
        try {
            sessionStorage.setItem("dismissed_auth_banner", "true");
        } catch (e) {}
    };

    return (
        <>
            {/* 고정 플로팅 바 (모바일에서는 하단 탭바 위 bottom-14, PC에서는 bottom-3에 세련된 알약/바 형태로 고정) */}
            <aside 
                aria-label="회원가입 혜택 안내"
                className="fixed bottom-[58px] md:bottom-4 left-0 right-0 z-[980] px-3 md:px-6 pointer-events-none flex justify-center animate-in fade-in slide-in-from-bottom-3 duration-500"
            >
                <div 
                    onClick={() => setShowLoginModal(true)}
                    className="pointer-events-auto w-full max-w-4xl bg-gradient-to-r from-zinc-950 via-slate-900 to-zinc-950 border border-amber-500/40 hover:border-amber-400/70 rounded-2xl p-2.5 sm:p-3.5 shadow-[0_10px_35px_-5px_rgba(245,158,11,0.25)] backdrop-blur-xl flex items-center justify-between gap-2.5 cursor-pointer transition-all duration-300 group hover:scale-[1.008]"
                >
                    {/* 좌측: 번쩍이는 불꽃 아이콘 + 카피 문구 */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-amber-500/30 transition-colors">
                            <span className="text-base animate-pulse">🔥</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-500/25 text-rose-300 border border-rose-400/40 shrink-0">
                                    무료 혜택
                                </span>
                                <p className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
                                    지금 무료 가입하면 <span className="text-amber-300 font-extrabold underline decoration-amber-400/50 underline-offset-2">오늘 장마감 세력 집중 매수 TOP 5</span> 종목 즉시 열람
                                </p>
                            </div>
                            <p className="text-[11px] text-zinc-400 hidden sm:block mt-0.5 truncate">
                                카카오 3초 간편가입 · 신규 회원 전원 매일 아침 AI 장전 브리핑 무료 제공
                            </p>
                        </div>
                    </div>

                    {/* 우측: 1초 간편가입 버튼 + 닫기(X) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowLoginModal(true);
                            }}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-xs sm:text-sm shadow-md flex items-center gap-1 transition-transform active:scale-95 whitespace-nowrap"
                        >
                            <Zap size={14} className="fill-black stroke-black shrink-0 hidden sm:inline" />
                            <span>1초 간편가입</span>
                            <ChevronRight size={14} className="stroke-[3] shrink-0" />
                        </button>

                        <button
                            type="button"
                            onClick={handleDismiss}
                            aria-label="닫기"
                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* 1초 로그인 모달 */}
            <LoginModal 
                isOpen={showLoginModal} 
                onClose={() => setShowLoginModal(false)} 
            />
        </>
    );
}
