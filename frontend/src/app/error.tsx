'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        console.error('Global Application Error:', error);

        // 서버로 에러 상세 내용 전송 (원인 파악용)
        try {
            fetch('/api/system/admin/log-client-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: error?.message || String(error),
                    stack: error?.stack,
                    digest: error?.digest,
                    url: typeof window !== 'undefined' ? window.location.href : '',
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                }),
            }).catch(() => {});
        } catch (e) {}

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
                    window.location.href = window.location.pathname + '?_fresh=' + Date.now();
                }
            } catch (e) {}
        }
    }, [error]);

    const handleForceReload = async () => {
        setClearing(true);
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('cached_watchlist');
                localStorage.removeItem('cached_quotes');
                sessionStorage.removeItem('chunk_reload_done');
                if ('caches' in window) {
                    const keys = await caches.keys();
                    for (const k of keys) {
                        await caches.delete(k);
                    }
                }
            }
        } catch (e) {}
        reset();
        window.location.href = window.location.pathname + '?_fresh=' + Date.now();
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-6 text-center">
            <div className="bg-yellow-500/10 p-4 rounded-full mb-6 ring-4 ring-yellow-500/20 animate-pulse">
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2">
                화면을 새로고침합니다
            </h2>

            <p className="text-gray-400 mb-6 max-w-xs text-sm leading-relaxed">
                최신 업데이트 반영 또는 일시적인 시세 캐시 동기화를 위해<br />
                아래 버튼을 눌러 화면을 다시 불러와 주세요.
            </p>

            {/* 에러 상세 메시지 표시 (원인 파악용) */}
            {error && (
                <div className="mb-6 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-left max-w-sm w-full">
                    <div className="text-[11px] font-bold text-red-400 mb-1">⚠️ 상세 원인 메시지:</div>
                    <div className="text-xs font-mono text-red-200 break-all leading-snug">
                        {error.message || String(error)}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                    disabled={clearing}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-yellow-900/50 flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
                    onClick={handleForceReload}
                >
                    <RefreshCw className={`w-4 h-4 ${clearing ? 'animate-spin' : ''}`} />
                    {clearing ? '캐시 정리 및 화면 복구 중...' : '화면 다시 불러오기'}
                </button>

                <button
                    className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-4 px-6 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => window.location.href = '/'}
                >
                    <Home className="w-4 h-4" />
                    홈 화면으로 이동
                </button>
            </div>
        </div>
    );
}
