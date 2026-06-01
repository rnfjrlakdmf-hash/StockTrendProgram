'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ExternalLink, ArrowRight, Newspaper, TrendingUp, X, Loader2, Home } from 'lucide-react';
import Link from 'next/link';

function NewsRedirectContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [countdown, setCountdown] = useState(4);
    const [progress, setProgress] = useState(0);
    const [cancelled, setCancelled] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const url = searchParams.get('url') || '';
    const symbol = searchParams.get('symbol') || '';
    const title = searchParams.get('title') || '';
    const publisher = searchParams.get('publisher') || '';

    const decodedUrl = url ? decodeURIComponent(url) : '';
    const decodedTitle = title ? decodeURIComponent(title) : '';
    const decodedPublisher = publisher ? decodeURIComponent(publisher) : '';

    // 사이트 표시용 도메인 추출
    const urlDomain = decodedUrl ? (() => {
        try {
            return new URL(decodedUrl).hostname.replace('www.', '');
        } catch {
            return decodedPublisher || '뉴스 원문';
        }
    })() : (decodedPublisher || '뉴스 원문');

    useEffect(() => {
        if (!decodedUrl) {
            router.replace('/discovery');
            return;
        }

        if (cancelled) return;

        // 4초 카운트다운 + 프로그레스바
        const TOTAL_MS = 4000;
        const TICK_MS = 50;
        let elapsed = 0;

        const interval = setInterval(() => {
            elapsed += TICK_MS;
            const pct = Math.min((elapsed / TOTAL_MS) * 100, 100);
            setProgress(pct);
            setCountdown(Math.max(Math.ceil((TOTAL_MS - elapsed) / 1000), 0));

            if (elapsed >= TOTAL_MS) {
                clearInterval(interval);
                setIsLeaving(true);
                setTimeout(() => {
                    window.location.href = decodedUrl;
                }, 300);
            }
        }, TICK_MS);

        return () => clearInterval(interval);
    }, [decodedUrl, cancelled, router]);

    const handleCancel = () => {
        setCancelled(true);
        setProgress(0);
        setCountdown(4);
    };

    const handleGoNow = () => {
        setIsLeaving(true);
        setTimeout(() => {
            window.location.href = decodedUrl;
        }, 200);
    };

    const handleGoStock = () => {
        setCancelled(true);
        if (symbol) {
            router.push(`/discovery?q=${symbol}`);
        } else {
            router.push('/discovery');
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #050505 0%, #0a0a12 50%, #050505 100%)' }}
        >
            {/* 배경 글로우 */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* 홈 버튼 */}
            <Link
                href="/"
                className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm z-10"
            >
                <Home className="w-4 h-4" />
                <span>홈으로</span>
            </Link>

            <div
                className={`relative w-full max-w-md transition-all duration-300 ${isLeaving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                style={{ animation: 'fadeSlideUp 0.4s ease-out' }}
            >
                {/* 메인 카드 */}
                <div
                    className="rounded-3xl p-1 relative"
                    style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3), rgba(59,130,246,0.1))',
                    }}
                >
                    <div
                        className="rounded-[22px] p-6"
                        style={{ background: 'rgba(10, 10, 18, 0.97)', backdropFilter: 'blur(20px)' }}
                    >
                        {/* 상단: 사이트 브랜딩 */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                                >
                                    <TrendingUp className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-white font-bold text-sm">AI Stock Analyst</span>
                            </div>
                            {!cancelled && (
                                <button
                                    onClick={handleCancel}
                                    className="text-gray-600 hover:text-gray-400 transition-colors p-1 rounded-lg hover:bg-white/5"
                                    title="자동 이동 취소"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* 뉴스 아이콘 + 배지 */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative mb-4">
                                <div
                                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
                                        border: '1px solid rgba(59,130,246,0.3)',
                                    }}
                                >
                                    <Newspaper className="w-9 h-9 text-blue-400" />
                                </div>
                                {/* 속보 배지 */}
                                <div
                                    className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold"
                                    style={{ background: 'linear-gradient(90deg, #ef4444, #f97316)' }}
                                >
                                    속보
                                </div>
                            </div>

                            {/* 종목 심볼 배지 */}
                            {symbol && (
                                <div
                                    className="px-3 py-1 rounded-full text-xs font-bold mb-3"
                                    style={{
                                        background: 'rgba(59,130,246,0.15)',
                                        border: '1px solid rgba(59,130,246,0.3)',
                                        color: '#60a5fa',
                                    }}
                                >
                                    #{symbol}
                                </div>
                            )}
                        </div>

                        {/* 뉴스 제목 */}
                        {decodedTitle && (
                            <div
                                className="rounded-2xl p-4 mb-4"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <p className="text-white text-sm font-medium leading-relaxed line-clamp-3 text-center">
                                    {decodedTitle}
                                </p>
                            </div>
                        )}

                        {/* 출처 도메인 */}
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <span className="text-gray-400 text-xs">
                                출처: <span className="text-blue-400">{urlDomain}</span>
                            </span>
                        </div>

                        {/* 자동 이동 카운트다운 */}
                        {!cancelled ? (
                            <div className="mb-5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-500 text-xs">뉴스 원문으로 자동 이동</span>
                                    <span
                                        className="text-sm font-bold tabular-nums"
                                        style={{ color: countdown <= 1 ? '#ef4444' : '#60a5fa' }}
                                    >
                                        {countdown}초
                                    </span>
                                </div>
                                <div className="w-full rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(255,255,255,0.08)' }}>
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${progress}%`,
                                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                                            transition: 'width 50ms linear',
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="mb-5 text-center py-2">
                                <span className="text-gray-500 text-xs">자동 이동이 취소되었습니다</span>
                            </div>
                        )}

                        {/* 버튼 그룹 */}
                        <div className="flex flex-col gap-3">
                            {/* 뉴스 원문 보기 (메인 버튼) */}
                            <button
                                onClick={handleGoNow}
                                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                    boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
                                }}
                            >
                                <ExternalLink className="w-4 h-4" />
                                뉴스 원문 바로 보기
                                <ArrowRight className="w-4 h-4" />
                            </button>

                            {/* 종목 분석 보기 (보조 버튼) */}
                            {symbol && (
                                <button
                                    onClick={handleGoStock}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm transition-all hover:bg-white/5"
                                    style={{
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#9ca3af',
                                    }}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    {symbol} 종목 분석 보기
                                </button>
                            )}
                        </div>

                        {/* 하단 안내 */}
                        <p className="text-center text-gray-600 text-xs mt-4">
                            이 페이지를 경유하면 더 빠른 뉴스 알림을 받으실 수 있습니다
                        </p>
                    </div>
                </div>

                {/* 하단 저작권 */}
                <p className="text-center text-gray-700 text-xs mt-4">
                    © 2025 AI Stock Analyst · 뉴스 원문은 각 언론사에 귀속됩니다
                </p>
            </div>

            <style jsx global>{`
                @keyframes fadeSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
}

export default function NewsRedirectPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            }
        >
            <NewsRedirectContent />
        </Suspense>
    );
}
