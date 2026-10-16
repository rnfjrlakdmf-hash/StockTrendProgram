"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SeoContentBlock from "@/components/SeoContentBlock";

export default function CalendarRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace("/signals"); }, [router]);
    return (
        <div className="min-h-screen bg-zinc-950 text-white py-10">
            <SeoContentBlock
                asH1={true}
                pageTitle="글로벌 거시경제 캘린더 & FOMC·CPI 증시 일정 가이드"
                pageDescription="미국 연준(FOMC) 기준금리 결정, 소비자물가지수(CPI), 비농업 고용지표(NFP), 한국 수출입 통계 및 주요 상장사 실적 발표 일정을 통합 제공하는 마켓 캘린더입니다."
            />
        </div>
    );
}
