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
            post.createdAt = new Date(post.createdAt);
            return post;
        }
        
        // API에서 못 찾으면 정적 포스트에서 다시 검색
        const staticPost = STATIC_POSTS.find(p => p.slug === decodedSlug);
        if (staticPost) return staticPost;
        
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
        return { title: "포스트를 찾을 수 없습니다" };
    }

    return {
        title: `${post.title} | StockTrendProgram`,
        description: post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
        alternates: {
            canonical: `/blog/${resolvedParams.id}`,
        },
        openGraph: {
            title: post.title,
            description: post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
            type: "article",
            publishedTime: post.createdAt.toISOString(),
            authors: [post.author],
            images: [
                {
                    url: `https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 배달되는 AI 주식 시황 리포트')}&tag=${encodeURIComponent('시황 리포트')}`,
                    width: 1200,
                    height: 630,
                    alt: post.title,
                }
            ]
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...",
            images: [`https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 배달되는 AI 주식 시황 리포트')}&tag=${encodeURIComponent('시황 리포트')}`]
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
        "description": post.content.replace(/<[^>]*>?/gm, '').substring(0, 150),
        "datePublished": post.createdAt.toISOString(),
        "dateModified": post.createdAt.toISOString(),
        "author": {
            "@type": "Organization",
            "name": post.author || "StockTrend AI"
        },
        "publisher": {
            "@type": "Organization",
            "name": "StockTrendProgram",
            "logo": {
                "@type": "ImageObject",
                "url": "https://stock-trend-program.co.kr/logo.png"
            }
        },
        "image": `https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 배달되는 AI 주식 시황 리포트')}&tag=${encodeURIComponent('시황 리포트')}`
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
                    목록으로 돌아가기
                </Link>
                
                <SocialShareButtons 
                    title={post.title}
                    description={post.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + "..."}
                    url={`https://stock-trend-program.co.kr/blog/${post.slug}`}
                    imageUrl={`https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 배달되는 AI 주식 시황 리포트')}&tag=${encodeURIComponent('시황 리포트')}`}
                />
            </div>

            {/* Title Section */}
            <header className="mb-12 border-b border-white/10 pb-8">
                <div className="flex flex-wrap gap-2 mb-6">
                    {post.tags.map((tag: string, idx: number) => (
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
                    __html: post.content
                        .replace(/href="\/market-report"/g, 'href="/discovery"')
                        .replace(/href="\/market"/g, 'href="/discovery"')
                        .replace(/<a href="[^"]*">오늘의 시장 분석 리포트 더 보기<\/a>/g, '<a href="/discovery">오늘의 시장 분석 리포트 더 보기</a>') 
                }}
            />
            
            {/* 푸시 알림 구독 버튼 (본문 끝난 후) */}
            <div className="mt-16 mb-8">
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
