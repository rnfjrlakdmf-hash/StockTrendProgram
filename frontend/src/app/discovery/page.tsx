"use client";
import React from 'react';
import Header from "@/components/Header";

export default function DiscoveryPage() {
    return (
        <div className="min-h-screen bg-black text-white p-10">
            <Header title="시스템 복구 중" subtitle="잠시 후 다시 이용해주세요." />
            <div className="mt-20 text-center">
                <p className="text-gray-500">배포 안정화를 위해 시스템을 최적화 중입니다.</p>
                <a href="/analysis" className="mt-10 inline-block px-10 py-4 bg-blue-600 rounded-full font-black">분석 페이지로 이동</a>
            </div>
        </div>
    );
}
