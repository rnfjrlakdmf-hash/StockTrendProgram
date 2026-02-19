"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Critical Global Error:", error);
    }, [error]);

    return (
        <html>
            <body className="bg-black text-white flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h2 className="text-2xl font-bold mb-4 text-red-500">시스템 오류 발생 (System Fault)</h2>
                <p className="mb-6 text-gray-400">앱 초기화 중 문제가 발생했습니다.</p>
                <button
                    onClick={() => reset()}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                    시스템 복구 시도
                </button>
            </body>
        </html>
    );
}
