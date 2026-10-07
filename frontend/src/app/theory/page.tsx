import { Metadata } from "next";
import { BookOpen, Sparkles, GraduationCap, Flame, TrendingUp } from "lucide-react";
import KakaoAdFit from "@/components/KakaoAdFit";
import TheoryListClient, { TheoryPost } from "./TheoryListClient";

export const metadata: Metadata = {
    title: "1타 강사의 매일 차트 스터디 | 실전 주식 차트·보조지표 아카데미",
    description: "초보자도 5분 만에 마스터하는 1타 강사의 아주 쉬운 주식 이론 강의! RSI, MACD, 볼린저밴드, 캔들 패턴, 20일선 눌림목 매매타점 완벽 정리.",
    alternates: {
        canonical: '/theory',
    },
    openGraph: {
        title: "1타 강사의 매일 차트 스터디 | 실전 주식 차트·보조지표 아카데미",
        description: "초보자도 5분 만에 마스터하는 1타 강사의 아주 쉬운 주식 이론 강의! RSI, MACD, 볼린저밴드, 캔들 패턴 완벽 가이드.",
        type: "website",
        images: ["https://stock-trend-program.co.kr/og-image.png"]
    }
};

import { STATIC_POSTS } from "@/lib/staticBlogPosts";

export const revalidate = 60; // 60초마다 ISR (캐시 갱신)

async function getTheoryPosts(page: number, limitPerPage: number) {
    // API 실패 시 서빙할 핵심 실전 차트 & 투자 이론 포스트 (구글 애드센스 빈 페이지 방지 보증)
    const fallbackTheoryPosts: TheoryPost[] = STATIC_POSTS.slice(0, 15).map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        createdAt: new Date(p.createdAt),
        tags: p.tags || ["차트스터디", "투자이론"],
        slug: p.slug || p.id,
        viewCount: p.viewCount || 850,
    }));

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const apiUrl = `https://stock-trend-program.co.kr/api/theory/posts?page=${page}&limit=${limitPerPage}`;
        const res = await fetch(apiUrl, { next: { revalidate: 60 }, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        
        const data = await res.json();
        
        if (data.status !== "ok" || !Array.isArray(data.posts) || data.posts.length === 0) {
            throw new Error("No posts from API");
        }

        const posts: TheoryPost[] = data.posts.map((p: any) => ({
            id: p.id,
            title: p.title,
            content: p.content,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            tags: p.tags || [],
            slug: p.slug || p.id,
            viewCount: p.viewCount || 0,
        }));

        return { posts, totalPages: data.totalPages || 1 };
    } catch (error) {
        console.warn("이론 포스트 API 실패, 안전 대체 데이터 제공:", error);
        return { 
            posts: fallbackTheoryPosts.slice((page - 1) * limitPerPage, page * limitPerPage), 
            totalPages: Math.max(1, Math.ceil(fallbackTheoryPosts.length / limitPerPage)) 
        };
    }
}

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function TheoryListPage(props: Props) {
    const searchParams = await props.searchParams;
    const page = parseInt((searchParams.page as string) || "1", 10);
    // 한 번에 풍부하게 가져와서 즉시 검색 및 필터링 가능하도록 설정 (최대 60개)
    const limitPerPage = 60;
    
    const { posts, totalPages } = await getTheoryPosts(page, limitPerPage);

    return (
        <div className="min-h-screen pt-20 pb-20 px-4 md:px-8 max-w-6xl mx-auto animate-in fade-in duration-500 text-white">
            {/* 상단 띠배너 광고 (모바일: 320x50, PC: 728x90) */}
            <div className="flex md:hidden justify-center -mt-2 mb-6">
                <KakaoAdFit adUnit="DAN-g3wzyZlZ4hBiYyRA" adWidth="320" adHeight="50" />
            </div>
            <div className="hidden md:flex justify-center -mt-2 mb-6">
                <KakaoAdFit adUnit="DAN-eeR4RhnpmQaeIlYm" adWidth="728" adHeight="90" />
            </div>

            {/* Hero Header Section */}
            <div className="text-center mb-12 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
                
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs md:text-sm font-black mb-4 shadow-sm">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span>실전 주식 아카데미 · 누구나 100% 무료</span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 flex items-center justify-center gap-3 flex-wrap">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 drop-shadow-md">
                        매일 차트 스터디
                    </span>
                </h1>

                <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                    초보자도 5분 만에 이해하는 <span className="text-emerald-400 font-bold">1타 강사의 실전 차트 분석 & 매매 타점</span> 강의
                </p>

                {/* 3대 핵심 특징 뱃지 */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3.5 mt-5 md:mt-6 text-xs md:text-sm text-gray-400 font-semibold">
                    <span className="shrink-0 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> 핵심 보조지표 마스터
                    </span>
                    <span className="shrink-0 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-sm">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 실전 눌림목 & 캔들패턴
                    </span>
                    <span className="shrink-0 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-sm">
                        <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" /> 매일 아침 신규 강의 연재
                    </span>
                </div>
            </div>

            {/* Interactive Client Component (검색, 카테고리 필터, 2열 카드 그리드, 내부 링크) */}
            <TheoryListClient initialPosts={posts} totalPages={totalPages} currentPage={page} />

            {/* 하단 광고 슬롯 */}
            <div className="w-full flex justify-center mt-14 mb-4">
                <KakaoAdFit adUnit="DAN-b9cY6ogHFZTTD0Sl" adWidth="320" adHeight="50" />
            </div>
            <div className="w-full flex justify-center mb-8">
                <KakaoAdFit adUnit="DAN-8TxTsrWjI6Q4SOt0" adWidth="320" adHeight="100" />
            </div>
        </div>
    );
}
