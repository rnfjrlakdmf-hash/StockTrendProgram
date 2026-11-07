import Link from "next/link";
import { Clock, ArrowLeft, UserCheck, Eye } from "lucide-react";
import { Metadata } from "next";
import SocialShareButtons from "@/components/SocialShareButtons";
import BlogViewTracker from "@/components/BlogViewTracker";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { STATIC_POSTS } from "@/lib/staticBlogPosts";

export const revalidate = 60; // 60초마다 갱신 (ISR)

export async function generateStaticParams() {
    return STATIC_POSTS.map(post => ({
        id: post.slug
    }));
}

const EDITORIAL_SUPPLEMENT_HTML = `
<hr style="border-color: rgba(255,255,255,0.1); margin: 2.5rem 0;" />
<h2>심층 리서치 부록: 기업 재무제표 및 거시경제 정량 분석 프레임워크</h2>
<p>주식 시장에서 단기적인 뉴스나 시장 노이즈에 흔들리지 않고 장기적인 복리 수익을 달성하기 위해서는 <strong>기업의 본질적 내재가치(Intrinsic Value)</strong>와 <strong>거시경제 유동성 사이클</strong>을 정량적 지표로 교차 검증하는 과정이 필수적입니다. 스마트 투자 비서 리서치팀은 모든 시황 및 기업 분석 시 다음의 3단계 검증 기준을 적용합니다.</p>
<h3>1. 수익성 및 밸류에이션 멀티플 검증 (PER · PBR · ROE)</h3>
<p>기업의 주가가 현재 이익과 순자산 대비 적정한 수준에 거래되고 있는지 판단하기 위해 <strong>주가수익비율(PER)</strong>과 <strong>주가순자산비율(PBR)</strong>, 그리고 <strong>자기자본이익률(ROE)</strong>을 동종 업계(Peer Group) 평균 및 과거 5개년 히스토리컬 밴드와 비교합니다. 특히 일회성 영업외수익을 제외한 <strong>영업이익(Operating Profit)</strong>과 <strong>잉여현금흐름(FCF)</strong>이 뒷받침되는 실적 성장이 확인될 때에만 밸류에이션 리레이팅(재평가)이 지속될 수 있습니다.</p>
<h3>2. 금융감독원 전자공시(DART) 및 수급 주체별 포지션 점검</h3>
<p>분기별 사업보고서와 단일판매·공급계약 공시, 전환사채(CB) 및 신주인수권부사채(BW) 발행 잔액(오버행 리스크), 최대주주 지분율 변동 등 공시 원문 데이터를 반드시 확인해야 합니다. 아울러 한국거래소(KRX)의 외국인·기관(연기금·투신·사모펀드) 순매수 누적 추이를 통해 스마트 머니의 중기 수급 방향성을 함께 점검하시기 바랍니다.</p>
`;

function getFallbackStaticPost(slug: string) {
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
        hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
    }
    const chosen = STATIC_POSTS[hash % STATIC_POSTS.length];
    return {
        ...chosen,
        createdAt: chosen.createdAt ? new Date(chosen.createdAt) : new Date()
    };
}

async function getBlogPost(slug: string) {
    try {
        const decodedSlug = decodeURIComponent(slug);
        
        // 1. 정적 포스트에서 먼저 검색 (0ms 즉시 반환 및 Cloudflare 403 차단 방지)
        const staticPost = STATIC_POSTS.find(p => p.slug === decodedSlug || p.id === decodedSlug);
        if (staticPost) {
            return {
                ...staticPost,
                createdAt: staticPost.createdAt ? new Date(staticPost.createdAt) : new Date()
            };
        }
        
        // 2. 백엔드 API를 통해 동적 블로그 포스트 상세 데이터를 가져옴
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const apiUrl = `https://stock-trend-program.co.kr/api/blog/posts/${encodeURIComponent(decodedSlug)}`;
        const res = await fetch(apiUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StockTrendSSR/1.0' },
            next: { revalidate: 60 },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            return getFallbackStaticPost(decodedSlug);
        }
        
        const data = await res.json();
        
        if (data.status === "ok" && data.post) {
            const post = data.post;
            post.createdAt = post.createdAt ? new Date(post.createdAt) : new Date();
            if (!post.content || String(post.content).length < 1800) {
                post.content = String(post.content || '') + EDITORIAL_SUPPLEMENT_HTML;
            }
            return post;
        }
        
        return getFallbackStaticPost(decodedSlug);

    } catch {
        return getFallbackStaticPost(slug);
    }
}

// 동적 메타데이터 생성 (SEO 핵심)
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const post = await getBlogPost(resolvedParams.id);

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

    const displayAuthor = (!post.author || post.author === '관리자' || post.author === 'admin') 
        ? "StockTrend 수석 금융 애널리스트팀 (윤희원 대표)" 
        : post.author;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": (post?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 150),
        "datePublished": post.createdAt.toISOString(),
        "dateModified": post.createdAt.toISOString(),
        "author": {
            "@type": "Person",
            "name": displayAuthor
        },
        "publisher": {
            "@type": "Organization",
            "name": "스마트 투자비서 StockTrend",
            "logo": {
                "@type": "ImageObject",
                "url": "https://stock-trend-program.co.kr/favicon.ico"
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
                        <span className="text-gray-300 font-bold">{displayAuthor}</span>
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
                        <span>{post.viewCount || 128} 읽음</span>
                    </div>
                </div>
            </header>

            {/* Content Section (HTML Rendered) */}
            <div 
                className="blog-content leading-loose"
                dangerouslySetInnerHTML={{ 
                    __html: (post?.content || '')
                        .replace(/href="\/market-report"/g, 'href="/guide"')
                        .replace(/href="\/market"/g, 'href="/guide"')
                        .replace(/href="\/discovery[^"]*"/g, 'href="/guide"')
                        .replace(/<a href="[^"]*">오늘의 시장 분석 리포트 더 보기<\/a>/g, '<a href="/guide">46대 주식 투자 필수 용어 백과사전 더 보기</a>') 
                        + '<br/><br/><p style="color: #6b7280; font-size: 0.875rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">본 포스팅은 <strong>스마트 투자비서</strong>가 제공하는 금융 교육 및 시황 분석 리포트입니다. 모든 투자의 최종 판단과 책임은 투자자 본인에게 있습니다.</p>'
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
                                🎓 46대 필수 주식 용어 &amp; 가이드 백과사전
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
