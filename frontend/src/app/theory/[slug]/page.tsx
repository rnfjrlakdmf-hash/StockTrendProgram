import { db } from "@/lib/firebase";
import Link from "next/link";
import { Clock, ArrowLeft, UserCheck, Eye, BookOpen, Send } from "lucide-react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import SocialShareButtons from "@/components/SocialShareButtons";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import KakaoAdFit from "@/components/KakaoAdFit";
import ResponsiveKakaoAd from "@/components/ResponsiveKakaoAd";

export const dynamic = 'force-dynamic';
export const revalidate = 0; // ISR 60초

async function getRelatedPosts() {
    try {
        const apiUrl = `https://stock-trend-program.co.kr/api/theory/posts?page=1&limit=3`;
        const res = await fetch(apiUrl, { cache: 'no-store' });
        const data = await res.json();
        return data.posts || [];
    } catch { return []; }
}

async function getTheoryPost(slug: string) {
    try {
        const decodedSlug = decodeURIComponent(slug);
        
        const apiUrl = `https://stock-trend-program.co.kr/api/theory/posts/${encodeURIComponent(decodedSlug)}`;
        const res = await fetch(apiUrl, { cache: 'no-store' });
        
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
        title: `${post.title} | 스마트 투자비서`,
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
    const relatedPosts = await getRelatedPosts();

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
            "name": "스마트 투자비서",
            "logo": {
                "@type": "ImageObject",
                "url": "https://stock-trend-program.co.kr/logo.png"
            }
        },
        "image": `https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent('매일 아침 업데이트되는 차트 스터디')}&tag=${encodeURIComponent('주식이론방')}`
    };

    // TOC(목차) 자동 생성 및 본문 ID 주입
    const tocRegex = /<(h[23])([^>]*)>(.*?)<\/\1>/gi;
    let match;
    const toc = [];
    let idCounter = 0;
    
    let contentWithIds = post.content
        .replace(/href="\/market-report"/g, 'href="/discovery"')
        .replace(/href="\/market"/g, 'href="/discovery"')
        .replace(/<a href="[^"]*">오늘의 시장 분석 리포트 더 보기<\/a>/g, '<a href="/discovery">오늘의 시장 분석 리포트 더 보기</a>')
        .replace(/whitespace-nowrap/g, 'break-keep');
        
    contentWithIds = contentWithIds.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/gi, (fullMatch, tag, attrs, innerHtml) => {
        const id = `toc-${idCounter++}`;
        return `<${tag} id="${id}"${attrs} class="scroll-mt-32">${innerHtml}</${tag}>`;
    });

    while ((match = tocRegex.exec(post.content)) !== null) {
        const level = match[1] === 'h2' ? 2 : 3;
        const text = match[3].replace(/<[^>]*>?/gm, '').trim();
        if (text) {
            toc.push({ level, text, id: `toc-${toc.length}` });
        }
    }

    let tocHtml = '';
    if (toc.length > 0) {
        tocHtml = '<div class="mb-14 p-8 bg-[#0a0a0f] border-y border-white/10 my-10"><h3 class="text-xs uppercase tracking-widest text-gray-500 font-bold mb-6">In This Report</h3><ul class="space-y-4">';
        let h2Index = 0;
        toc.forEach((item) => {
            if (item.level === 2) h2Index++;
            const isH3 = item.level === 3;
            const padding = isH3 ? 'pl-8' : '';
            const prefix = isH3 ? '<span class="text-gray-600 mr-2">-</span>' : `<span class="text-gray-500 font-mono text-sm mr-3">0${h2Index}</span>`;
            const color = isH3 ? 'text-gray-400 font-normal' : 'text-gray-200 font-semibold';
            tocHtml += `<li class="${padding}"><a href="#${item.id}" class="hover:text-white transition-colors flex items-start ${color}">${prefix} <span class="flex-1">${item.text}</span></a></li>`;
        });
        tocHtml += '</ul></div>';
    }

    const finalContent = tocHtml + contentWithIds + '<br/><br/><p style="color: #6b7280; font-size: 0.875rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem; margin-top: 2rem;">본 포스팅은 <strong>스마트 투자비서</strong>가 제공하는 AI 기반 주식 분석 및 차트 스터디입니다. YMYL 가이드라인을 준수하여 작성되었으나, 모든 투자의 최종 판단과 책임은 투자자 본인에게 있습니다.</p>';

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
            <header className="mb-14 border-b border-white/10 pb-10">
                <div className="flex flex-wrap gap-2 mb-8">
                    {post.tags?.map((tag: string, idx: number) => (
                        <span key={idx} className="text-xs font-semibold text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 tracking-wide uppercase">
                            {tag}
                        </span>
                    ))}
                </div>
                
                <h1 className="text-3xl md:text-5xl font-black text-gray-100 leading-tight mb-8 tracking-tight">
                    {post.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="text-gray-300 font-bold tracking-wide">{post.author}</span>
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

            {/* Content Section (HTML Rendered, includes SVG charts) */}
            <div 
                className="theory-content leading-loose"
                dangerouslySetInnerHTML={{ __html: finalContent }}
            />
            
            {/* 뷰 카운터 증가용 클라이언트 사이드 스크립트 */}
            <script dangerouslySetInnerHTML={{
                __html: `
                    fetch('/api/theory/${post.slug}/view', { method: 'POST' }).catch(console.error);
                `
            }} />

            {/* Author Bio Box [SEO YMYL E-E-A-T] */}
            <div className="mt-20 mb-12 bg-transparent border-t border-white/10 pt-12 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-16 h-16 shrink-0 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                    <UserCheck className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-200 tracking-wide">스마트 투자비서 수석 애널리스트팀</h3>
                        <span className="bg-gray-800 text-gray-400 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-gray-700">Verified</span>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                        월스트리트 퀀트 트레이딩 알고리즘과 글로벌 증시 빅데이터를 학습한 AI 금융 분석팀입니다. 
                        개인 투자자들이 정보의 비대칭성을 극복하고 안전하게 자산을 불릴 수 있도록, 어렵고 복잡한 주식 이론과 시황을 가장 명확하고 통찰력 있게 풀어냅니다.
                    </p>
                </div>
            </div>

            {/* 내부 링크 구조 (Related Posts) */}
            <div className="mb-16 border-t border-white/10 pt-16">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-8">
                    Related Reports
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedPosts.filter((rp: any) => rp.slug !== post.slug).slice(0, 3).map((rp: any) => (
                        <Link key={rp.id} href={`/theory/${rp.slug || rp.id}`} className="block group">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors h-full flex flex-col">
                                <h4 className="text-gray-300 font-semibold group-hover:text-white transition-colors line-clamp-2 mb-4 text-sm leading-snug">
                                    {rp.title}
                                </h4>
                                <div className="mt-auto flex items-center text-xs text-gray-500">
                                    <Clock className="w-3.5 h-3.5 mr-1" />
                                    {new Date(rp.createdAt).toLocaleDateString('ko-KR')}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="mt-8 mb-4">
                <PushSubscribeButton />
            </div>

            {/* [New] Telegram Subscribe Banner */}
            <div className="mb-12">
                <div className="w-full bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(37,99,235,0.15)]">
                    <div className="bg-blue-600 p-3 rounded-full mb-4 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                        <Send className="w-8 h-8 text-white ml-1" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">이 글이 유익하셨나요?</h3>
                    <p className="text-blue-200 mb-6 font-medium">더 빠르고 정확한 주식 핵심 정보를 텔레그램에서 무료로 받아보세요!</p>
                    <Link href="https://t.me/stocktrend_live" target="_blank" rel="noopener noreferrer" className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all text-lg flex items-center justify-center gap-3">
                        👉 실시간 속보방 무료 입장하기
                    </Link>
                </div>
            </div>

            <div className="w-full flex justify-center mb-12">
                <ResponsiveKakaoAd 
                    mobileAdUnit="DAN-4lZ2zEzbyDJ1Yva6" mobileAdWidth="300" mobileAdHeight="250"
                    pcAdUnit="DAN-kfR4SXJubdA0vEcm" pcAdWidth="728" pcAdHeight="90" 
                />
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
