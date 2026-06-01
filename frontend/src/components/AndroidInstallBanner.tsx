'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function AndroidInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        // beforeinstallprompt 이벤트 리스너 등록 (안드로이드 크롬 등에서 지원)
        const handleBeforeInstallPrompt = (e: Event) => {
            // 기본 설치 팝업을 막습니다
            e.preventDefault();
            // 나중에 수동으로 띄우기 위해 이벤트를 저장합니다
            setDeferredPrompt(e);
            
            // 사용자가 예전에 '나중에'를 누르지 않았다면 배너를 보여줍니다
            const dismissed = localStorage.getItem('android_install_banner_dismissed');
            const dismissedRecently = dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000;
            
            if (!dismissedRecently) {
                setShow(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 이미 설치 완료된 경우 이벤트를 감지하여 배너 숨김
        const handleAppInstalled = () => {
            setShow(false);
            setDeferredPrompt(null);
            console.log('[PWA] 앱 설치 완료');
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // 설치 프롬프트 띄우기
        deferredPrompt.prompt();

        // 사용자의 응답 대기
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('[PWA] 사용자가 설치에 동의했습니다');
            setShow(false); // 수락하면 배너 닫기
        } else {
            console.log('[PWA] 사용자가 설치를 거절했습니다');
        }

        // 프롬프트는 한 번만 사용할 수 있으므로 초기화
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        localStorage.setItem('android_install_banner_dismissed', String(Date.now()));
        setShow(false);
    };

    if (!show || !deferredPrompt) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[9999] animate-in slide-in-from-bottom-4 duration-500"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div
                className="mx-3 mb-3 rounded-3xl p-1"
                style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.4), rgba(20,184,166,0.4))',
                }}
            >
                <div
                    className="rounded-[22px] p-5 relative overflow-hidden"
                    style={{
                        background: 'rgba(8, 8, 18, 0.97)',
                        backdropFilter: 'blur(24px)',
                    }}
                >
                    {/* 반짝이는 배경 효과 */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>

                    {/* 닫기 버튼 */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                            style={{ background: 'linear-gradient(135deg, #22c55e, #14b8a6)' }}
                        >
                            <img src="/icon.png" alt="App Icon" className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                            <p className="text-white text-base font-black">AI 주식 비서 앱 설치</p>
                            <p className="text-green-300 text-xs font-bold mt-0.5">
                                바탕화면에 설치하고 바로 접속하세요!
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleInstallClick}
                        className="w-full py-3.5 rounded-2xl text-white font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-green-900/30 relative z-10"
                        style={{ background: 'linear-gradient(135deg, #22c55e, #14b8a6)' }}
                    >
                        <Download className="w-4 h-4" />
                        무료로 앱 다운로드
                    </button>

                    <p className="text-center text-gray-500 text-[10px] mt-3 relative z-10">
                        설치 시 저장 공간을 거의 차지하지 않습니다 (약 1MB 이하)
                    </p>
                </div>
            </div>
        </div>
    );
}
