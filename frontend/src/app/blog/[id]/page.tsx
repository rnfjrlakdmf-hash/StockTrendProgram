import { db } from "@/lib/firebase";
import Link from "next/link";
import { Clock, ArrowLeft, Share2, UserCheck, Eye } from "lucide-react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import SocialShareButtons from "@/components/SocialShareButtons";
import BlogViewTracker from "@/components/BlogViewTracker";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import KakaoAdFit from "@/components/KakaoAdFit";
import ResponsiveKakaoAd from "@/components/ResponsiveKakaoAd";
import { STATIC_POSTS } from "@/lib/staticBlogPosts";

export const revalidate = 60; // 60초마다 갱신 (ISR) - 백엔드 배포 후 캐시 무효화를 위한 재배포 트리거

async function getBlogPost(slug: string) {
    try {
        const decodedSlug = decodeURIComponent(slug);
        
        // 백엔드 API를 통해 블로그 포스트 상세 데이터를 가져옴 (서버사이드 Firestore 연결 문제 방지)
        const apiUrl = `https://stock-trend-program.co.kr/api/blog/posts/${encodeURIComponent(decodedSlug)}`;
        const res = await fetch(apiUrl, { next: { revalidate: 60 } });
        
        if (!res.ok) {
            console.error(`API error: ${res.status}`);
            return null;
        }
        
        const data = await res.json();
        
        if (data.status === "ok" && data.post) {
            // 날짜 문자열을 Date 객체로 변환
            const post = data.post;
            post.createdAt = post.createdAt ? new Date(post.createdAt) : new Date();
            return post;
        }
        
        // API에서 못 찾으면 정적 포스트에서 다시 검색
        const staticPost = STATIC_POSTS.find(p => p.slug === decodedSlug);
        if (staticPost) {
            return {
                ...staticPost,
                createdAt: staticPost.createdAt ? new Date(staticPost.createdAt) : new Date()
            };
        }
        
        return null;

    } catch (error) {
        console.error("블로그 포스트 상세 로딩 에러:", error);
        return null;
    }
}

// 동적 메타데이터 생성 (SEO 핵심)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const post = await getBlogPost(resolvedParams.id);
    
    if (!post) {
        return { title: "리포트를 찾을 수 없습니다" };
    }

    return {
        title: `${post.title} | 오늘의 마켓 리포트 - StockTrend`,
        description: (post?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
        alternates: {
            canonical: `/blog/${resolvedParams.id}`,
        },
        openGraph: {
            title: post.title,
            description: (post?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
            type: "article",
            publishedTime: post.createdAt.toISOString(),
            authors: [post.author || "StockTrend 수석 애널리스트팀"],
            images: [
                {
                    url: `https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침·저녁 배달되는 국내·미국 증시 시황 리포트')}&tag=${encodeURIComponent('마켓뷰')}`,
                    width: 1200,
                    height: 630,
                    alt: post.title,
                }
            ]
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: (post?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
            images: [`https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침·저녁 배달되는 국내·미국 증시 시황 리포트')}&tag=${encodeURIComponent('마켓뷰')}`]
        }
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const post = await getBlogPost(resolvedParams.id);

    if (!post) {
        notFound();
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": (post?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 150),
        "datePublished": post.createdAt.toISOString(),
        "dateModified": post.createdAt.toISOString(),
        "author": {
            "@type": "Person",
            "name": post.author || "StockTrend 수석 애널리스트팀"
        },
        "publisher": {
            "@type": "Organization",
            "name": "스마트 투자비서 StockTrend",
            "logo": {
                "@type": "ImageObject",
                "url": "https://stock-trend-program.co.kr/logo.png"
            }
        },
        "image": `https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침·저녁 배달되는 국내·미국 증시 시황 리포트')}&tag=${encodeURIComponent('마켓뷰')}`
    };

    return (
        <article className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-4xl mx-auto animate-in fade-in duration-500">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <BlogViewTracker id={post.slug} />
            {/* Header / Back */}
            <div className="mb-8 flex justify-between items-center">
                <Link 
                    href="/blog" 
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors font-medium text-sm border border-white/10"
                >
                    <ArrowLeft className="w-4 h-4" />
                    시황 목록으로 돌아가기
                </Link>
                
                <SocialShareButtons 
                    title={post.title}
                    description={(post?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 100) + "..."}
                    url={`https://stock-trend-program.co.kr/blog/${post.slug}`}
                    imageUrl={`https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침·저녁 배달되는 국내·미국 증시 시황 리포트')}&tag=${encodeURIComponent('마켓뷰')}`}
                />
            </div>

            {/* Title Section */}
            <header className="mb-12 border-b border-white/10 pb-8">
                <div className="flex flex-wrap gap-2 mb-6">
                    {post.tags?.map((tag: string, idx: number) => (
                        <span key={idx} className="text-xs md:text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                            #{tag}
                        </span>
                    ))}
                </div>
                
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
                    {post.title}
                </h1>
                
                <div className="flex items-center gap-6 text-sm text-gray-400 font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                            <UserCheck className="w-4 h-4" />
                        </div>
                        <span className="text-gray-300 font-bold">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <time dateTime={post.createdAt.toISOString()}>
                            {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long',
                                timeZone: 'Asia/Seoul'
                            })}
                        </time>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>{post.viewCount} 읽음</span>
                    </div>
                </div>
            </header>

            {/* 본문 최상단 광고 (Above the Fold - 반응형) */}
            <div className="w-full flex justify-center mt-8 mb-10">
                <ResponsiveKakaoAd 
                    mobileAdUnit="DAN-4lZ2zEzbyDJ1Yva6" mobileAdWidth="300" mobileAdHeight="250"
                    pcAdUnit="DAN-eeR4RhnpmQaeIlYm" pcAdWidth="728" pcAdHeight="90" 
                />
            </div>

            {/* Content Section (HTML Rendered) */}
            <div 
                className="blog-content leading-loose"
                dangerouslySetInnerHTML={{ 
                    __html: (post?.content || '')
                        .replace(/href="\/market-report"/g, 'href="/discovery"')
                        .replace(/href="\/market"/g, 'href="/discovery"')
                        .replace(/<a href="[^"]*">오늘의 시장 분석 리포트 더 보기<\/a>/g, '<a href="/discovery">오늘의 시장 분석 리포트 더 보기</a>') 
                        + '<br/><br/><p style="color: #6b7280; font-size: 0.875rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">본 포스팅은 <strong>스마트 투자비서</strong>가 제공하는 AI 기반 주식 분석 및 시황 리포트입니다. 스마트 투자비서와 함께 성공적인 투자를 이어나가세요.</p>'
                }}
            />
            
            {/* 함께 읽으면 좋은 추천 금융 리포트 (SEO & 애드센스 내부 링크 강화) */}
            <div className="mt-16 pt-10 border-t border-white/10">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
                        <span className="text-blue-400">📚</span> 함께 읽으면 좋은 추천 투자 칼럼
                    </h3>
                    <Link href="/blog" className="text-xs sm:text-sm font-bold text-blue-400 hover:text-blue-300">
                        전체 칼럼 보기 →
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    {STATIC_POSTS.filter(p => p.slug !== post.slug).slice(0, 4).map((rel, rIdx) => (
                        <Link 
                            key={rIdx} 
                            href={`/blog/${rel.slug}`}
                            className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-blue-500/30 transition-all flex flex-col justify-between group"
                        >
                            <div>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {rel.tags.slice(0, 2).map((t, tIdx) => (
                                        <span key={tIdx} className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                                <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 mb-2">
                                    {rel.title}
                                </h4>
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                                {rel.author} · 읽기
                            </span>
                        </Link>
                    ))}
                </div>

                {/* 주식 기초 교육 가이드 바로가기 (E-E-A-T 신뢰도 강화) */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/20 via-zinc-900/50 to-transparent border border-blue-500/20 mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h4 className="text-base font-bold text-white mb-1">
                                🎓 46대 필수 주식 용어 & 가이드 백과사전
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-400">
                                PER, PBR, 공매도, 골든크로스 등 실전 투자에 필요한 기초 지식을 무료로 학습하세요.
                            </p>
                        </div>
                        <Link 
                            href="/guide" 
                            className="shrink-0 px-5 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs sm:text-sm font-bold border border-blue-500/30 transition-all text-center"
                        >
                            용어 사전 둘러보기
                        </Link>
                    </div>
                </div>
            </div>

            {/* 푸시 알림 구독 버튼 (본문 끝난 후) */}
            <div className="mb-8">
                <PushSubscribeButton />
            </div>

            {/* 본문 하단 광고 (반응형) */}
            <div className="w-full flex justify-center mb-12">
                <ResponsiveKakaoAd 
                    mobileAdUnit="DAN-4lZ2zEzbyDJ1Yva6" mobileAdWidth="300" mobileAdHeight="250"
                    pcAdUnit="DAN-kfR4SXJubdA0vEcm" pcAdWidth="728" pcAdHeight="90" 
                />
            </div>
            
            {/* Global Styles specific to Blog Content */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .blog-content {
                    font-size: 1.125rem;
                    color: #d1d5db;
                }
                .blog-content h2 {
                    font-size: 2rem;
                    font-weight: 900;
                    color: white;
                    margin-top: 2.5rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 0.5rem;
                }
                .blog-content h3 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    color: #93c5fd;
                }
                .blog-content p {
                    margin-bottom: 1.25rem;
                }
                .blog-content ul {
                    list-style-type: none;
                    padding-left: 0;
                    margin-bottom: 1.5rem;
                }
                .blog-content li {
                    margin-bottom: 0.75rem;
                }
                .blog-content a {
                    color: #60a5fa;
                    text-decoration: underline;
                    text-underline-offset: 4px;
                }
                `
            }} />
        </article>
    );
}
