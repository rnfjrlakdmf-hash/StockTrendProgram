"use client";

import Header from "@/components/Header";
import MorningBriefWidget from "@/components/MorningBriefWidget";
import AIDisclaimer from "@/components/AIDisclaimer";

export default function BriefingPage() {
    return (
        <div className="min-h-screen pb-10 bg-black text-white">
            <Header title="AI 모닝 브리핑" subtitle="매일 아침 받아보는 시장의 핵심 인사이트" />
            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 mt-4">
                <MorningBriefWidget />
                <AIDisclaimer className="mt-12 opacity-80" />
            </div>
        </div>
    );
}
