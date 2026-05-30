'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ExternalLink } from 'lucide-react';

function NewsRedirectContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const url = searchParams.get('url');
        
        if (!url) {
            router.replace('/discovery');
            return;
        }

        // 로딩 프로그레스 바 애니메이션
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                return prev + 10;
            });
        }, 100);

        // 1초 뒤에 실제 뉴스 URL로 이동
        const redirectTimer = setTimeout(() => {
            window.location.href = url;
        }, 1000);

        return () => {
            clearInterval(timer);
            clearTimeout(redirectTimer);
        };
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-gray-700 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                    <ExternalLink className="w-8 h-8 text-blue-400" />
                </div>
                
                <h1 className="text-xl font-bold text-white mb-2">
                    뉴스 원문으로 이동 중입니다
                </h1>
                <p className="text-gray-400 text-sm mb-8">
                    잠시만 기다려주세요...
                </p>

                <div className="w-full bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
                    <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>로딩 중...</span>
                </div>
            </div>
        </div>
    );
}

export default function NewsRedirectPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
            <NewsRedirectContent />
        </Suspense>
    );
}
