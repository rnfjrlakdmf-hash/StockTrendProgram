'use client';

import { useEffect } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Global Application Error:', error);
    }, [error]);

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-black text-white p-6 text-center">
            <div className="bg-yellow-500/10 p-4 rounded-full mb-6 ring-4 ring-yellow-500/20 animate-pulse">
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2">
                앱을 재가동해야 합니다
            </h2>

            <p className="text-gray-400 mb-8 max-w-xs text-sm leading-relaxed">
                예상치 못한 문제가 발생하여 안전 프로토콜이 작동했습니다.<br />
                아래 버튼을 눌러 앱을 새로고침해주세요.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-yellow-900/50 flex items-center justify-center gap-2 active:scale-95"
                    onClick={() => {
                        // [Fix] Clear all client-side state to break error loops
                        try {
                            localStorage.clear();
                            sessionStorage.clear();
                        } catch(e) {}
                        
                        reset();
                        window.location.reload();
                    }}
                >
                    <RefreshCw className="w-4 h-4" />
                    시스템 재가동
                </button>

                <button
                    className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-4 px-6 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
                    onClick={() => window.location.href = '/'}
                >
                    <Home className="w-4 h-4" />
                    홈 화면으로 이동
                </button>
            </div>
        </div>
    );
}
