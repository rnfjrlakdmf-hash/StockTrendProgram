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
        // 서버 배포 직후 이전 빌드 청크(ChunkLoadError) 참조 시 1회 자동 새로고침 복구
        const msg = String(error?.message || '');
        if (
            msg.includes('ChunkLoadError') ||
            msg.includes('Loading chunk') ||
            msg.includes('Failed to fetch dynamically imported module')
        ) {
            try {
                const reloaded = sessionStorage.getItem('chunk_reload_done');
                if (!reloaded) {
                    sessionStorage.setItem('chunk_reload_done', '1');
                    window.location.reload();
                }
            } catch (e) {}
        }
    }, [error]);

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-black text-white p-6 text-center">
            <div className="bg-yellow-500/10 p-4 rounded-full mb-6 ring-4 ring-yellow-500/20 animate-pulse">
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2">
                화면을 새로고침합니다
            </h2>

            <p className="text-gray-400 mb-8 max-w-xs text-sm leading-relaxed">
                최신 업데이트 반영 또는 일시적인 시세 캐시 동기화를 위해<br />
                아래 버튼을 눌러 화면을 다시 불러와 주세요.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-yellow-900/50 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                    onClick={() => {
                        // 로그인 세션은 유지하고 시세 캐시만 초기화
                        try {
                            localStorage.removeItem('cached_watchlist');
                            localStorage.removeItem('cached_quotes');
                            sessionStorage.removeItem('chunk_reload_done');
                        } catch(e) {}
                        
                        reset();
                        window.location.reload();
                    }}
                >
                    <RefreshCw className="w-4 h-4" />
                    화면 다시 불러오기
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
