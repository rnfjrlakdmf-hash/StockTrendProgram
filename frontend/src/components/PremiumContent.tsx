"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoginModal from './LoginModal';

export default function PremiumContent({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useAuth();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    if (!isLoaded) {
        // 인증 상태 로딩 중에는 아무것도 안 보여주거나 뼈대(Skeleton) 렌더링
        return <div className="animate-pulse bg-slate-800 h-64 rounded-xl"></div>;
    }

    if (user) {
        return <>{children}</>;
    }

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Blured Content */}
            <div className="filter blur-md select-none opacity-50 pointer-events-none transition-all duration-500">
                {children}
            </div>
            
            {/* Paywall Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900 p-6">
                <div className="bg-slate-800/90 p-8 rounded-2xl text-center max-w-md w-full border border-slate-700/50 backdrop-blur-md shadow-2xl">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">프리미엄 AI 리포트</h3>
                    <p className="text-slate-300 mb-6 leading-relaxed">
                        핵심 AI 적정 주가와 기관/고래 매집 동향은<br/>로그인 후 확인할 수 있습니다.
                    </p>
                    <button 
                        onClick={() => setIsLoginModalOpen(true)}
                        className="w-full py-4 bg-[#FEE500] hover:bg-[#FEE500]/90 text-black font-bold rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-[#FEE500]/20"
                    >
                        <span className="text-lg">카카오로 1초 만에 계속하기</span>
                    </button>
                    <p className="text-xs text-slate-500 mt-4">100% 무료 서비스입니다.</p>
                </div>
            </div>

            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)} 
            />
        </div>
    );
}
