import { Metadata } from "next";
import { Flame, TrendingUp, Sparkles, BarChart2 } from "lucide-react";
import KakaoAdFit from "@/components/KakaoAdFit";
import PostListClient, { SeoPost } from "./PostListClient";

export const metadata: Metadata = {
    title: "오늘의 핫이슈 종목 & 특징주 심층 분석 리포트 | 주가 전망·수급 분석 - StockTrend",
    description: "실시간 급등주, 테마 대장주, 외국인·기관 수급 특징주 심층 분석! 카카오, 삼성전자, 2차전지, 반도체 등 오늘의 핵심 종목 주가 전망과 모멘텀 리포트를 100% 무료로 확인하세요.",
    keywords: [
        "핫이슈 종목",
        "특징주 분석",
        "급등주 분석",
        "주가 전망",
        "테마 대장주",
        "외국인 순매수",
        "기관 수급",
        "주식 모멘텀",
        "카카오 주가",
        "삼성전자 주가",
        "주식 리포트",
        "StockTrend"
    ],
    alternates: {
        canonical: '/post',
    },
    openGraph: {
        title: "오늘의 핫이슈 종목 & 특징주 심층 분석 리포트 | StockTrend",
        description: "상위 1% 수급 데이터로 분석한 실시간 급등주, 테마 대장주, 외국인·기관 수급 특징주 심층 리포트.",
        url: 'https://stock-trend-program.co.kr/post',
        siteName: '스마트 투자비서 StockTrend',
        locale: 'ko_KR',
        type: 'website',
        images: [
            {
                url: 'https://stock-trend-program.co.kr/api/og?title=핫이슈+종목+심층+분석+리포트&subtitle=실시간+급등주+·+테마+대장주+·+외인수급&tag=오늘의특징주',
                width: 1200,
                height: 630,
                alt: '핫이슈 종목 심층 분석 리포트',
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "오늘의 핫이슈 종목 & 특징주 심층 분석 리포트",
        description: "상위 1% 실전 데이터로 분석한 오늘의 급등주와 특징주 심층 분석",
        images: ['https://stock-trend-program.co.kr/api/og?title=핫이슈+종목+심층+분석+리포트&subtitle=실시간+급등주+·+테마+대장주+·+외인수급&tag=오늘의특징주']
    }
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getSeoPosts(page: number, limitPerPage: number) {
    try {
        const apiUrl = `https://stock-trend-program.co.kr/api/seo_posts?page=${page}&limit=${limitPerPage}`;
        const res = await fetch(apiUrl, { cache: 'no-store' });
        
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        
        const data = await res.json();
        
        if (data.status !== "ok" || !data.posts?.length) {
            throw new Error("No posts from API");
        }

        const posts: SeoPost[] = data.posts.map((p: any) => ({
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
        console.error("SEO 포스트 로딩 에러:", error);
        return { posts: [], totalPages: 1 };
    }
}

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function SeoListPage(props: Props) {
    const searchParams = await props.searchParams;
    const page = parseInt((searchParams.page as string) || "1", 10);
    // 한 번에 풍부하게 가져와서 즉시 검색 및 필터링 가능하도록 설정 (최대 60개)
    const limitPerPage = 60;
    
    const { posts, totalPages } = await getSeoPosts(page, limitPerPage);

    // 구글 검색엔진 최적화를 위한 JSON-LD 구조화 데이터
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "오늘의 핫이슈 종목 & 특징주 심층 분석 리포트",
        "description": "실시간 급등주, 테마 대장주, 외국인·기관 수급 특징주 심층 분석 리포트",
        "url": "https://stock-trend-program.co.kr/post",
        "publisher": {
            "@type": "Organization",
            "name": "StockTrend",
            "url": "https://stock-trend-program.co.kr",
            "logo": "https://stock-trend-program.co.kr/favicon.ico"
        },
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": posts.slice(0, 10).map((post, idx) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "url": `https://stock-trend-program.co.kr/post/${post.slug}`,
                "name": post.title
            }))
        }
    };

    return (
        <div className="min-h-screen pt-20 pb-20 px-4 md:px-8 max-w-6xl mx-auto animate-in fade-in duration-500 text-white">
            {/* JSON-LD Google SEO Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* 상단 띠배너 광고 (모바일: 320x50, PC: 728x90) */}
            <div className="flex md:hidden justify-center -mt-2 mb-6">
                <KakaoAdFit adUnit="DAN-g3wzyZlZ4hBiYyRA" adWidth="320" adHeight="50" />
            </div>
            <div className="hidden md:flex justify-center -mt-2 mb-6">
                <KakaoAdFit adUnit="DAN-eeR4RhnpmQaeIlYm" adWidth="728" adHeight="90" />
            </div>

            {/* Hero Header Section */}
            <div className="text-center mb-12 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
                
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs md:text-sm font-black mb-4 shadow-sm">
                    <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                    <span>실시간 특징주 · 테마 대장주 리포트</span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 flex items-center justify-center gap-3 flex-wrap">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-rose-300 to-orange-400 drop-shadow-md">
                        핫이슈 종목 분석
                    </span>
                </h1>

                <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                    상위 1% 수급 데이터로 분석한 <span className="text-red-400 font-bold">오늘의 급등주 & 특징주 심층 분석</span>
                </p>

                {/* 3대 핵심 특징 뱃지 */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-6 text-xs md:text-sm text-gray-400 font-semibold">
                    <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-red-400" /> 실시간 급등주 & 테마 모멘텀
                    </span>
                    <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-rose-400" /> 외인·기관 큰손 수급 추적
                    </span>
                    <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> 매일 장전·장후 핵심 리포트
                    </span>
                </div>
            </div>

            {/* Interactive Client Component (실시간 검색, 카테고리 필터, 2열 카드 그리드, 내부 추천 링크) */}
            <PostListClient initialPosts={posts} totalPages={totalPages} currentPage={page} />

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
