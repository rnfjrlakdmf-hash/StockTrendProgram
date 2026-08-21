import { Metadata } from "next";
import { TrendingUp, Globe, Sparkles, BarChart2, ShieldCheck } from "lucide-react";
import KakaoAdFit from "@/components/KakaoAdFit";
import BlogListClient, { BlogPost } from "./BlogListClient";

export const metadata: Metadata = {
    title: "오늘의 국내·미국 증시 마감 시황 요약 리포트 | Market View - StockTrend",
    description: "코스피, 코스닥, 나스닥, S&P500 실시간 마감 시황과 삼성전자, SK하이닉스, 엔비디아 등 핵심 특징주 수급 요약 리포트! 상위 1% 전문가 증시 브리핑을 매일 아침·저녁 100% 무료로 확인하세요.",
    keywords: [
        "증시 시황",
        "국내 증시 마감",
        "미국 증시 마감",
        "코스피 시황",
        "코스닥 시황",
        "나스닥 시황",
        "S&P500 마감",
        "삼성전자 주가",
        "SK하이닉스 주가",
        "주식 시황 리포트",
        "Market View",
        "StockTrend"
    ],
    alternates: {
        canonical: '/blog',
    },
    openGraph: {
        title: "오늘의 국내·미국 증시 마감 시황 요약 리포트 | Market View",
        description: "상위 1% 전문가가 매일 분석하는 국내/미국 증시 시황과 핵심 주도 섹터 요약 브리핑.",
        url: 'https://stock-trend-program.co.kr/blog',
        siteName: '스마트 투자비서 StockTrend',
        locale: 'ko_KR',
        type: 'website',
        images: [
            {
                url: 'https://stock-trend-program.co.kr/api/og?title=오늘의+국내·미국+증시+마감+시황+리포트&subtitle=코스피+·+나스닥+·+반도체+핵심브리핑&tag=MarketView',
                width: 1200,
                height: 630,
                alt: 'Market View 마켓 리포트',
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "오늘의 국내·미국 증시 마감 시황 요약 리포트 | Market View",
        description: "상위 1% 투자자를 위한 전문가 증시 요약 리포트",
        images: ['https://stock-trend-program.co.kr/api/og?title=오늘의+국내·미국+증시+마감+시황+리포트&subtitle=코스피+·+나스닥+·+반도체+핵심브리핑&tag=MarketView']
    }
};

export const revalidate = 60; // 60초마다 ISR (캐시 갱신)

async function getBlogPosts(page: number, limitPerPage: number) {
    try {
        const apiUrl = `https://stock-trend-program.co.kr/api/blog/posts?page=${page}&limit=${limitPerPage}`;
        const res = await fetch(apiUrl, { next: { revalidate: 60 } });
        
        let apiPosts: BlogPost[] = [];
        let totalPages = 1;

        if (res.ok) {
            const data = await res.json();
            if (data.status === "ok" && data.posts?.length) {
                apiPosts = data.posts.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    content: p.content,
                    createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                    tags: p.tags || [],
                    slug: p.slug || p.id,
                    viewCount: p.viewCount || 0,
                }));
                totalPages = data.totalPages || 1;
            }
        }

        return { posts: apiPosts, totalPages: totalPages };
    } catch (error) {
        console.error("블로그 포스트 로딩 에러:", error);
        return { posts: [], totalPages: 1 };
    }
}

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function BlogListPage(props: Props) {
    const searchParams = await props.searchParams;
    const page = parseInt((searchParams.page as string) || "1", 10);
    // 한 번에 풍부하게 가져와서 즉시 검색 및 필터링 가능하도록 설정 (최대 60개)
    const limitPerPage = 60;
    
    const { posts, totalPages } = await getBlogPosts(page, limitPerPage);

    // 구글 검색엔진 최적화를 위한 JSON-LD 구조화 데이터
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "오늘의 국내·미국 증시 마감 시황 요약 리포트",
        "description": "코스피, 코스닥, 나스닥, S&P500 마감 시황과 핵심 주도 섹터 브리핑",
        "url": "https://stock-trend-program.co.kr/blog",
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
                "url": `https://stock-trend-program.co.kr/blog/${post.slug}`,
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
                
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs md:text-sm font-black mb-4 shadow-sm">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span>글로벌 증시 브리핑 · 매일 실시간 갱신</span>
                </div>

                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 flex items-center justify-center gap-3 flex-wrap">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 drop-shadow-md">
                        Market View
                    </span>
                </h1>

                <p className="text-gray-300 text-sm md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                    상위 1% 투자자들을 위한 <span className="text-blue-400 font-bold">국내 & 미국 증시 마감 시황 요약 리포트</span>
                </p>

                {/* 3대 핵심 특징 뱃지 */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-6 text-xs md:text-sm text-gray-400 font-semibold">
                    <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> 코스피 · 코스닥 마감 시황
                    </span>
                    <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-indigo-400" /> 뉴욕 나스닥 · S&P500 분석
                    </span>
                    <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> 반도체 & 주도섹터 심층 요약
                    </span>
                </div>
            </div>

            {/* Interactive Client Component (실시간 검색, 카테고리 필터, 2열 카드 그리드, 내부 추천 링크) */}
            <BlogListClient initialPosts={posts} totalPages={totalPages} currentPage={page} />

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
