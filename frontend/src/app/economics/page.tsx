import { Metadata } from "next";
import { GraduationCap, Sparkles, BookOpen, Flame } from "lucide-react";
import KakaoRevenueAd from "@/components/KakaoRevenueAd";
import SeoContentBlock from "@/components/SeoContentBlock";
import { API_BASE_URL } from "@/lib/config";
import {
    EconomicsPost,
    EconomicsCategoryStat,
    ECONOMICS_CATEGORIES_META,
    FALLBACK_ECONOMICS_POSTS,
} from "@/lib/economicsFallback";
import EconomicsListClient from "./EconomicsListClient";

export const metadata: Metadata = {
    title: "매일 1일 1경제학 공부방 | 왕초보 눈높이 5분 경제 아카데미",
    description:
        "경제학 왕초보도 하루 5분, 주제가 단 하나도 겹치지 않게 매일 하나씩 마스터하는 무료 경제학 공부방! 생활 미시경제부터 금리·인플레이션·환율·행동경제학·경제사까지 그림과 퀴즈로 쉽게 배우세요.",
    alternates: {
        canonical: "/economics",
    },
    openGraph: {
        title: "매일 1일 1경제학 공부방 | 왕초보 눈높이 5분 경제 아카데미",
        description:
            "하루 5분, 주제가 겹치지 않는 180일+ 초보자 경제학 아카데미! 일상 비유와 그림, 복습 퀴즈로 경제 문해력을 키워보세요.",
        type: "website",
        images: ["https://stock-trend-program.co.kr/og-image.png"],
    },
};

export const revalidate = 60;

async function getEconomicsData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        const baseUrl = API_BASE_URL || (typeof window === "undefined" ? "http://127.0.0.1:8000" : "");
        const res = await fetch(`${baseUrl}/api/economics/posts?page=1&limit=100`, {
            next: { revalidate: 60 },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();

        if (data.status === "ok" && Array.isArray(data.posts) && data.posts.length > 0) {
            return {
                posts: data.posts as EconomicsPost[],
                categories: (data.categories || ECONOMICS_CATEGORIES_META) as EconomicsCategoryStat[],
                curriculumTotal: Number(data.curriculumTotal || 180),
            };
        }
        throw new Error("No economics posts yet");
    } catch (err) {
        console.warn("[Economics Page] API fallback 사용:", err);
        return {
            posts: FALLBACK_ECONOMICS_POSTS,
            categories: ECONOMICS_CATEGORIES_META,
            curriculumTotal: 180,
        };
    }
}

export default async function EconomicsPage() {
    const { posts, categories, curriculumTotal } = await getEconomicsData();

    return (
        <div className="min-h-screen pt-20 pb-20 px-4 md:px-8 max-w-6xl mx-auto animate-in fade-in duration-500 text-white">
            {/* 상단 광고 배너 */}
            <div className="flex justify-center -mt-2 mb-6">
                <KakaoRevenueAd type="banner" />
            </div>

            {/* 히어로 헤더 */}
            <div className="text-center mb-10 md:mb-12 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs md:text-sm font-black mb-4 shadow-sm">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    <span>왕초보 눈높이 경제 아카데미 · 매일 주제 중복 0%</span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-400 drop-shadow-md">
                        매일 1일 1경제학 공부방
                    </span>
                </h1>

                <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto font-medium leading-relaxed break-keep">
                    어려운 교과서 대신 <span className="text-amber-300 font-bold">일상 비유 · 그림 도식 · 3지선다 퀴즈</span>로
                    매일 하루 5분씩, 주제가 절대 겹치지 않게 경제학을 쉽게 배워보세요!
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mt-5 text-xs md:text-sm text-gray-300 font-semibold">
                    <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 6대 핵심 분야 순환 커리큘럼
                    </span>
                    <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> 그림 &amp; 숫자 비교로 5분 이해
                    </span>
                    <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-400" /> 매일 오전 7:40 신규 주제 자동 연재
                    </span>
                </div>
            </div>

            {/* 인터랙티브 공부방 클라이언트 */}
            <EconomicsListClient
                initialPosts={posts}
                initialCategories={categories}
                curriculumTotal={curriculumTotal}
            />

            {/* 하단 광고 */}
            <div className="w-full flex justify-center mt-14 mb-8">
                <KakaoRevenueAd type="bottom" />
            </div>

            <SeoContentBlock
                pageTitle="매일 1일 1경제학 아카데미 | 생활 미시경제부터 거시경제·금리·환율·행동경제학까지"
                pageDescription="수요와 공급, 기회비용, 인플레이션, 기준금리, 채권과 금리의 관계, 환율, 행동경제학 심리 편향, 세계 경제사까지 초보자가 반드시 알아야 할 180대 핵심 경제 원리를 하루 한 편씩 쉽고 체계적으로 제공하는 무료 경제 교육 아카이브입니다."
            />
        </div>
    );
}
