'use client';

import { useEffect, useState, useRef } from "react";
import { onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { X, BellRing, Sparkles, ChevronRight, Newspaper, FileText, TrendingUp, Flame, Zap } from "lucide-react";

export default function GlobalBroadcastListener() {
    const [mounted, setMounted] = useState(false);
    const [popupAlert, setPopupAlert] = useState<any>(null);
    const [isHovered, setIsHovered] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    // 딩동 알림음 효과음 재생
    const playAlertSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime); // High
            osc.frequency.exponentialRampToValueAtTime(587, ctx.currentTime + 0.35); // Low
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        } catch (e) {
            // Audio policy ignore
        }
    };

    useEffect(() => {
        if (!mounted || !db) return;
        const alertsRef = collection(db, "alerts");
        let isInitialLoad = true;
        const q = query(
            alertsRef,
            orderBy("timestamp", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isInitialLoad) {
                isInitialLoad = false;
                return; // 최초 로딩 시 팝업 방지
            }
            
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const isGlobal = data.is_global === true;
                    
                    let userId = typeof window !== 'undefined' ? localStorage.getItem('fcm_guest_id') : null;
                    if (!userId && typeof window !== 'undefined') {
                        try {
                            const storedUser = localStorage.getItem('stock_user');
                            if (storedUser) {
                                const parsed = JSON.parse(storedUser);
                                userId = parsed.id || parsed.uid;
                            }
                        } catch(e){}
                    }

                    const isTargeted = userId && data.target_users && Array.isArray(data.target_users) && data.target_users.includes(userId);

                    if (isGlobal || isTargeted) {
                        setPopupAlert({ id: change.doc.id, ...data });
                        playAlertSound();
                    }
                }
            });
        }, (error) => {
            console.error("[GlobalBroadcast] Firestore listener error:", error);
        });

        return () => unsubscribe();
    }, [mounted]);

    // 6초 자동 닫힘 타이머 (마우스 호버 시 일시 정지)
    useEffect(() => {
        if (!popupAlert) return;
        if (isHovered) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        timerRef.current = setTimeout(() => {
            setPopupAlert(null);
        }, 6500);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [popupAlert, isHovered]);

    if (!mounted || !popupAlert) return null;

    // 타겟 링크 정밀 추출 (통합대시보드 '/'로 빠지는 현상 원천 차단)
    const rawSymbol = popupAlert.symbol || popupAlert.code || '';
    const cleanSymbol = rawSymbol ? (rawSymbol.split('.')[0] || rawSymbol) : '';
    const dartUrl = popupAlert.dart_url || '';
    const newsUrl = popupAlert.news_url || '';
    const customUrl = popupAlert.url || '';
    const notifTitle = (popupAlert.title || '').split('\n')[0] || '';

    let targetUrl = '';
    let categoryBadge = { label: '실시간 핫이슈', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40', icon: BellRing };

    const typeStr = (popupAlert.type || '').toLowerCase();
    const titleStr = (popupAlert.title || '').toLowerCase();

    if (dartUrl || typeStr.includes('disclosure') || titleStr.includes('공시')) {
        categoryBadge = { label: 'DART 공시 속보', color: 'text-blue-300 bg-blue-500/20 border-blue-500/40', icon: FileText };
        if (dartUrl) {
            const params = new URLSearchParams({ url: dartUrl, type: 'disclosure' });
            if (cleanSymbol) params.set('symbol', cleanSymbol);
            if (notifTitle) params.set('title', notifTitle);
            targetUrl = `/news-redirect?${params.toString()}`;
        }
    } else if (titleStr.includes('슈퍼개미') || titleStr.includes('대량보유') || titleStr.includes('5%') || typeStr.includes('whale') || typeStr.includes('holding')) {
        categoryBadge = { label: '세력·슈퍼개미 포착', color: 'text-purple-300 bg-purple-500/20 border-purple-500/40', icon: Zap };
        if (dartUrl) {
            const params = new URLSearchParams({ url: dartUrl, type: 'disclosure' });
            if (cleanSymbol) params.set('symbol', cleanSymbol);
            if (notifTitle) params.set('title', notifTitle);
            targetUrl = `/news-redirect?${params.toString()}`;
        }
    } else if (newsUrl || typeStr.includes('news') || titleStr.includes('뉴스')) {
        categoryBadge = { label: '언론사 뉴스 속보', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40', icon: Newspaper };
        if (newsUrl) {
            const params = new URLSearchParams({ url: newsUrl, type: 'news' });
            if (cleanSymbol) params.set('symbol', cleanSymbol);
            if (notifTitle) params.set('title', notifTitle);
            targetUrl = `/news-redirect?${params.toString()}`;
        }
    } else if (typeStr.includes('price') || titleStr.includes('목표가') || titleStr.includes('급등')) {
        categoryBadge = { label: '목표가·급등 시그널', color: 'text-rose-300 bg-rose-500/20 border-rose-500/40', icon: Flame };
    }

    // fallback targetUrl calculation
    if (!targetUrl) {
        if (customUrl && customUrl !== '/' && !customUrl.endsWith('stock-trend-program.co.kr') && !customUrl.endsWith('stock-trend-program.co.kr/')) {
            targetUrl = customUrl;
        } else if (cleanSymbol) {
            targetUrl = `/discovery?q=${cleanSymbol}`;
        } else {
            targetUrl = '/alerts';
        }
    }

    const handleClick = () => {
        if (targetUrl) {
            if (targetUrl.startsWith('http')) {
                window.open(targetUrl, '_blank');
            } else {
                router.push(targetUrl);
            }
        }
        setPopupAlert(null);
    };

    const BadgeIcon = categoryBadge.icon;

    return (
        <div 
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-lg animate-in fade-in slide-in-from-top-6 duration-300"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div 
                className="bg-zinc-950/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(59,130,246,0.25)] rounded-2xl p-4 sm:p-5 border border-blue-500/40 hover:border-blue-400/70 flex flex-col gap-2.5 cursor-pointer relative overflow-hidden group transition-all duration-300 hover:scale-[1.01]"
                onClick={handleClick}
            >
                {/* 상단 앰비언트 네온 라인 */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                {/* 헤더 행: 카테고리 칩 + LIVE 뱃지 + 닫기 버튼 */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${categoryBadge.color}`}>
                            <BadgeIcon className="w-3.5 h-3.5" />
                            <span>{categoryBadge.label}</span>
                        </span>
                        
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>실시간 포착</span>
                        </div>

                        {cleanSymbol && (
                            <span className="text-zinc-400 font-mono text-[11px] font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                {cleanSymbol}
                            </span>
                        )}
                    </div>

                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setPopupAlert(null);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="알림 닫기"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                {/* 알림 본체 (제목 + 요약 내용) */}
                <div className="space-y-1 pr-1">
                    <h4 className="text-white font-black text-sm sm:text-base leading-snug group-hover:text-blue-300 transition-colors line-clamp-2">
                        {popupAlert.title}
                    </h4>
                    <p className="text-zinc-300 text-xs sm:text-[13px] leading-relaxed line-clamp-2 font-normal">
                        {popupAlert.body}
                    </p>
                </div>

                {/* 하단 인터랙션 액션 바 */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-blue-400 font-bold group-hover:text-blue-300 transition-colors">
                    <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>터치하여 상세 분석 &amp; 원문 확인하기</span>
                    </span>
                    <span className="flex items-center gap-0.5 bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/30 group-hover:bg-blue-500/30 transition-all text-[11px]">
                        <span>상세보기</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                </div>

                {/* 하단 잔여 시간 프로그레스 바 (6.5초 동안 축소) */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 transition-all"
                        style={{
                            width: isHovered ? '100%' : '0%',
                            transitionDuration: isHovered ? '0s' : '6500ms',
                            transitionTimingFunction: 'linear'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
