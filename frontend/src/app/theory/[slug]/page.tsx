import { db } from "@/lib/firebase";
import Link from "next/link";
import { Clock, ArrowLeft, UserCheck, Eye, BookOpen } from "lucide-react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import SocialShareButtons from "@/components/SocialShareButtons";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import KakaoAdFit from "@/components/KakaoAdFit";

export const revalidate = 60; // ISR 60초

async function getTheoryPost(slug: string) {
    try {
        const decodedSlug = decodeURIComponent(slug);
        
        const apiUrl = `https://stock-trend-program.co.kr/api/theory/posts/${encodeURIComponent(decodedSlug)}`;
        const res = await fetch(apiUrl, { next: { revalidate: 60 } });
        
        if (!res.ok) {
            console.error(`API error: ${res.status}`);
            return null;
        }
        
        const data = await res.json();
        
        if (data.status === "ok" && data.post) {
            const post = data.post;
            post.createdAt = new Date(post.createdAt);
            return post;
        }
        
        return null;

    } catch (error) {
        console.error("이론 포스트 상세 로딩 에러:", error);
        return null;
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const post = await getTheoryPost(resolvedParams.slug);
    
    if (!post) {
        return { title: "강의를 찾을 수 없습니다" };
    }

    const desc = post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...";

    return {
        title: `${post.title} | StockTrend 매일 차트 스터디`,
        description: desc,
        alternates: {
            canonical: `/theory/${resolvedParams.slug}`,
        },
        openGraph: {
            title: post.title,
            description: desc,
            type: "article",
            publishedTime: post.createdAt.toISOString(),
            authors: [post.author],
            images: [
                {
                    url: `https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 업데이트되는 차트 스터디')}&tag=${encodeURIComponent('주식이론방')}`,
                    width: 1200,
                    height: 630,
                    alt: post.title,
                }
            ]
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: desc,
            images: [`https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 업데이트되는 차트 스터디')}&tag=${encodeURIComponent('주식이론방')}`]
        }
    };
}

export default async function TheoryPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    const post = await getTheoryPost(resolvedParams.slug);

    if (!post) {
        notFound();
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.content.replace(/<[^>]*>?/gm, '').substring(0, 150),
        "datePublished": post.createdAt.toISOString(),
        "dateModified": post.createdAt.toISOString(),
        "author": {
            "@type": "Person",
            "name": post.author || "StockTrend 차트 마스터"
        },
        "publisher": {
            "@type": "Organization",
            "name": "StockTrendProgram",
            "logo": {
                "@type": "ImageObject",
                "url": "https://stock-trend-program.co.kr/logo.png"
            }
        },
        "image": `https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 업데이트되는 차트 스터디')}&tag=${encodeURIComponent('주식이론방')}`
    };

    return (
        <article className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-4xl mx-auto animate-in fade-in duration-500">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            
            {/* Header / Back */}
            <div className="mb-8 flex justify-between items-center">
                <Link 
                    href="/theory" 
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors font-medium text-sm border border-white/10"
                >
                    <ArrowLeft className="w-4 h-4" />
                    이론방 목록으로
                </Link>
                
                <SocialShareButtons 
                    title={post.title}
                    description={post.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + "..."}
                    url={`https://stock-trend-program.co.kr/theory/${post.slug}`}
                    imageUrl={`https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 업데이트되는 차트 스터디')}&tag=${encodeURIComponent('주식이론방')}`}
                />
            </div>

            {/* Title Section */}
            <header className="mb-12 border-b border-white/10 pb-8">
                <div className="flex flex-wrap gap-2 mb-6">
                    {post.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="text-xs md:text-sm font-bold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                            #{tag}
                        </span>
                    ))}
                </div>
                
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
                    {post.title}
                </h1>
                
                <div className="flex items-center gap-6 text-sm text-gray-400 font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-600 to-emerald-600 flex items-center justify-center text-white">
                            <BookOpen className="w-4 h-4" />
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
                                weekday: 'long'
                            })}
                        </time>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>{post.viewCount} 읽음</span>
                    </div>
                </div>
            </header>

            {/* Content Section (HTML Rendered, includes SVG charts) */}
            <div 
                className="theory-content leading-loose"
                dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* 뷰 카운터 증가용 클라이언트 사이드 스크립트 */}
            <script dangerouslySetInnerHTML={{
                __html: `
                    fetch('/api/theory/${post.slug}/view', { method: 'POST' }).catch(console.error);
                `
            }} />

            <div className="w-full flex justify-center my-8">
                <KakaoAdFit adUnit="DAN-b9cY6ogHFZTTD0Sl" adWidth="320" adHeight="50" />
            </div>

            <div className="mt-16 mb-8">
                <PushSubscribeButton />
            </div>

            <div className="w-full flex justify-center mb-12">
                <KakaoAdFit adUnit="DAN-b9cY6ogHFZTTD0Sl" adWidth="320" adHeight="50" />
            </div>
            
            <style dangerouslySetInnerHTML={{
                __html: `
                .theory-content {
                    font-size: 1.125rem;
                    color: #d1d5db;
                }
                .theory-content h2 {
                    font-size: 2rem;
                    font-weight: 900;
                    color: white;
                    margin-top: 2.5rem;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 0.5rem;
                }
                .theory-content h3 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    color: #4ade80;
                    border-left: 4px solid #22c55e;
                    padding-left: 1rem;
                }
                .theory-content p {
                    margin-bottom: 1.25rem;
                }
                .theory-content ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                .theory-content li {
                    margin-bottom: 0.75rem;
                }
                .theory-content strong {
                    color: white;
                    background-color: rgba(34, 197, 94, 0.2);
                    padding: 0 0.25rem;
                    border-radius: 0.25rem;
                }
                .theory-content svg {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                }
                `
            }} />
        </article>
    );
}
