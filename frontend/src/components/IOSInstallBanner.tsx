'use client';

import { useEffect, useState } from 'react';
import { X, Share, Plus } from 'lucide-react';

/**
 * iOS 사파리 유저에게 "홈 화면에 추가" 안내를 보여주는 배너
 * 조건: iOS 기기 + Safari 브라우저 + 아직 PWA로 실행 중이 아닌 경우
 */
export default function IOSInstallBanner() {
    const [show, setShow] = useState(false);
    const [isInApp, setIsInApp] = useState(false);

    useEffect(() => {
        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        
        // 카카오톡, 네이버, 인스타그램, 라인 등 인앱 브라우저 감지
        const inAppBrowser = /KAKAOTALK|Instagram|NAVER|Line/i.test(ua);
        
        // PWA로 이미 실행 중이면 표시 안 함
        const isStandalone =
            ('standalone' in navigator && (navigator as any).standalone === true) ||
            window.matchMedia('(display-mode: standalone)').matches;
            
        // 이미 닫은 적 있으면 표시 안 함 (7일간 숨김)
        const dismissed = localStorage.getItem('ios_install_banner_dismissed');
        const dismissedRecently =
            dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000;

        if (isIOS && !isStandalone && !dismissedRecently) {
            if (inAppBrowser) {
                setIsInApp(true);
            }
            // 3초 후 배너 표시 (페이지 로딩 안정화 후)
            const timer = setTimeout(() => setShow(true), 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('ios_install_banner_dismissed', String(Date.now()));
        setShow(false);
    };

    if (!show) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[9999] animate-in slide-in-from-bottom-4 duration-500"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div
                className="mx-3 mb-3 rounded-3xl p-1"
                style={{
                    background: isInApp 
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.4), rgba(239,68,68,0.4))' 
                        : 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.4))',
                }}
            >
                <div
                    className="rounded-[22px] p-5"
                    style={{
                        background: 'rgba(8, 8, 18, 0.97)',
                        backdropFilter: 'blur(24px)',
                    }}
                >
                    {/* 닫기 버튼 */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* 상단 배지 */}
                    <div className="flex items-center gap-2 mb-3">
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                            style={{ 
                                background: isInApp 
                                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)' 
                                    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
                            }}
                        >
                            {isInApp ? '⚠️' : '🔔'}
                        </div>
                        <div>
                            <p className="text-white text-sm font-black">
                                {isInApp ? '현재 화면에선 알림을 받을 수 없어요' : '아이폰 알림 받기'}
                            </p>
                            <p className="text-gray-400 text-[11px]">
                                {isInApp 
                                    ? '카카오톡/네이버에서는 기능이 제한됩니다' 
                                    : '홈 화면에 추가하면 주식 알림이 와요!'}
                            </p>
                        </div>
                    </div>

                    {/* 안내 단계 */}
                    <div className="space-y-2.5 mb-4">
                        {isInApp ? (
                            // 인앱 브라우저 안내 (사파리로 이동 유도)
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 bg-amber-500/20 border border-amber-500/40 text-amber-300">1</div>
                                    <p className="text-gray-300 text-xs leading-relaxed">
                                        화면 오른쪽 아래 <strong className="text-amber-300">[ ⠇]</strong> 또는 <strong className="text-amber-300">[···]</strong> 버튼 누르기
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 bg-red-500/20 border border-red-500/40 text-red-300">2</div>
                                    <p className="text-gray-300 text-xs leading-relaxed">
                                        <strong className="text-red-300">"다른 브라우저로 열기"</strong> 또는 <strong className="text-red-300">"Safari로 열기"</strong> 선택
                                    </p>
                                </div>
                            </>
                        ) : (
                            // 일반 사파리 브라우저 안내 (홈화면 추가 유도)
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 bg-blue-500/20 border border-blue-500/40 text-blue-300">1</div>
                                    <div className="flex items-center gap-2">
                                        <Share className="w-4 h-4 text-blue-400" />
                                        <p className="text-gray-300 text-xs leading-relaxed">
                                            아래 <strong className="text-blue-300">공유 버튼</strong> <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500/20 rounded border border-blue-500/40 text-[10px] font-bold text-blue-300 mx-0.5">↑</span> 을 누르세요
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 bg-purple-500/20 border border-purple-500/40 text-purple-300">2</div>
                                    <div className="flex items-center gap-2">
                                        <Plus className="w-4 h-4 text-purple-400" />
                                        <p className="text-gray-300 text-xs leading-relaxed">
                                            스크롤 내려서 <strong className="text-purple-300">"홈 화면에 추가"</strong> 선택
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 bg-green-500/20 border border-green-500/40 text-green-300">3</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-400 text-base">✓</span>
                                        <p className="text-gray-300 text-xs leading-relaxed">
                                            <strong className="text-green-300">홈 화면 앱</strong>으로 다시 실행 후 알림 허용
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 하단 안내 */}
                    <p className="text-center text-gray-600 text-[10px]">
                        💡 아이폰은 애플 정책상 위 방법으로만 알림 설정이 가능합니다
                    </p>

                    {/* 닫기 버튼 */}
                    <button
                        onClick={handleDismiss}
                        className="w-full mt-3 py-2.5 rounded-2xl text-gray-500 text-xs font-bold hover:bg-white/5 transition-colors border border-white/5"
                    >
                        나중에 하기
                    </button>
                </div>
            </div>
        </div>
    );
}
