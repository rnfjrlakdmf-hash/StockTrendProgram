"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
            <h2 className="text-4xl font-bold mb-4">404</h2>
            <p className="text-xl text-gray-400 mb-8">요청하신 페이지를 찾을 수 없습니다.</p>
            <Link
                href="/"
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors"
            >
                <Home className="w-5 h-5" />
                홈으로 돌아가기
            </Link>
        </div>
    );
}
