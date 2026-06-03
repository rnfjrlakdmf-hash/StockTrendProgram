"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function AppInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // 기본적으로 안보이게 시작

  useEffect(() => {
    // 1. 이미 앱으로 설치되어 있는지 확인
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
                             || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // 2. iOS 환경 감지 (Safari)
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    
    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      // 이미 닫았는지 확인
      if (!localStorage.getItem('hideInstallBanner')) {
        setTimeout(() => setShowBanner(true), 2000);
      }
    }

    // 3. Android PWA (beforeinstallprompt 이벤트 감지)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem('hideInstallBanner')) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      alert("iOS에서는 브라우저 하단의 [공유] 버튼을 누른 후 [홈 화면에 추가]를 선택해주세요!");
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setShowBanner(false);
    localStorage.setItem('hideInstallBanner', 'true'); // 세션이나 영구적으로 닫기
  };

  if (isStandalone || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-[999] animate-in slide-in-from-bottom-10 duration-500">
      <div className="max-w-md mx-auto bg-blue-600 border border-blue-400 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent pointer-events-none" />
        
        <div className="flex-1 min-w-0 z-10">
          <h4 className="font-bold text-white mb-1 flex items-center gap-1">
            <span className="animate-bounce">🚀</span> 앱으로 설치하고 더 빠르게!
          </h4>
          <p className="text-xs text-blue-100 truncate">
            홈 화면에 추가하면 매일 푸시 알림을 받을 수 있어요.
          </p>
        </div>
        
        <div className="flex items-center gap-2 z-10 shrink-0">
          <button 
            onClick={handleInstall}
            className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-black transition-colors shadow-lg"
          >
            설치하기
          </button>
          <button 
            onClick={handleClose}
            className="p-2 text-blue-200 hover:text-white bg-blue-700/50 hover:bg-blue-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
