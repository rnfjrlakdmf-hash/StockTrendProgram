import Link from "next/link";
import { Clock, ArrowLeft, UserCheck, Eye, BookOpen } from "lucide-react";
import { Metadata } from "next";
import SocialShareButtons from "@/components/SocialShareButtons";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { STATIC_POSTS } from "@/lib/staticBlogPosts";

export const revalidate = 60; // ISR 60초

const THEORY_SUPPLEMENT_HTML = `
<hr style="border-color: rgba(255,255,255,0.1); margin: 2.5rem 0;" />
<h2>실전 차트 아카데미 부록: 기술적 지표와 펀더멘털의 교차 검증</h2>
<p>캔들 차트 패턴과 기술적 보조지표(이동평균선, RSI, MACD, 볼린저밴드)는 시장 참여자들의 매수·매도 심리와 수급 응집도를 시각적으로 보여주는 훌륭한 도구입니다. 그러나 기술적 분석의 승률을 극대화하기 위해서는 반드시 <strong>거래량(Volume) 수반 여부</strong>와 <strong>기업의 기초 체력(재무제표 및 공시)</strong>을 함께 확인해야 합니다.</p>
<h3>1. 거래량과 기관·외국인 수급의 동행 확인</h3>
<p>주요 저항선을 돌파하거나 이동평균선 골든크로스가 발생할 때 평소 대비 200% 이상의 유의미한 거래대금 증가와 기관·외국인의 연속 순매수가 동반되는지 확인하십시오. 거래량이 수반되지 않은 단순 기술적 반등은 속임수(Whip-saw) 패턴으로 이어질 가능성이 높습니다.</p>
<h3>2. 손절선(Stop-loss) 설정과 분할 매수 원칙</h3>
<p>모든 기술적 타점 진입 전에는 직전 지지선 또는 20일 이동평균선 이탈 시의 명확한 리스크 관리 기준을 사전에 설정하고, 한 번에 전액 진입하기보다 2~3회에 걸친 분할 접근을 통해 평균 매수 단가의 안전마진을 확보하는 것이 바람직합니다.</p>
`;

function getFallbackTheoryPost(slug: string) {
    const theoryPool = STATIC_POSTS.slice(13);
    const pool = theoryPool.length > 0 ? theoryPool : STATIC_POSTS;
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
        hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
    }
    const chosen = pool[hash % pool.length];
    return {
        ...chosen,
        createdAt: chosen.createdAt ? new Date(chosen.createdAt) : new Date(),
    };
}

async function getRelatedPosts() {
    return STATIC_POSTS.slice(13, 19);
}

async function getTheoryPost(slug: string) {
    try {
        const decodedSlug = decodeURIComponent(slug);

        // 1. STATIC_POSTS에서 먼저 검색 (0ms 즉시 반환 및 API 실패 방어)
        const staticP = STATIC_POSTS.find(p => p.slug === decodedSlug || p.id === decodedSlug);
        if (staticP) {
            return {
                ...staticP,
                createdAt: staticP.createdAt ? new Date(staticP.createdAt) : new Date(),
            };
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const apiUrl = `https://stock-trend-program.co.kr/api/theory/posts/${encodeURIComponent(decodedSlug)}`;
        const res = await fetch(apiUrl, { next: { revalidate: 60 }, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            return getFallbackTheoryPost(decodedSlug);
        }
        
        const data = await res.json();
        
        if (data.status === "ok" && data.post) {
            const post = data.post;
            post.createdAt = post.createdAt ? new Date(post.createdAt) : new Date();
            if (!post.content || String(post.content).length < 1800) {
                post.content = String(post.content || '') + THEORY_SUPPLEMENT_HTML;
            }
            return post;
        }
        
        return getFallbackTheoryPost(decodedSlug);

    } catch {
        return getFallbackTheoryPost(slug);
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const post = await getTheoryPost(resolvedParams.slug);
    const desc = (post?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 150) + "...";

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

    const displayAuthor = (!post.author || post.author === '관리자' || post.author === 'admin')
        ? "StockTrend 금융 리서치팀 (윤희원 대표)"
        : post.author;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
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
            "name": "스마트 투자비서",
            "logo": {
                "@type": "ImageObject",
                "url": "https://stock-trend-program.co.kr/icon.png"
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
        .replace(/href="\/market-report"/g, 'href="/guide"')
        .replace(/href="\/market"/g, 'href="/guide"')
        .replace(/href="\/discovery[^"]*"/g, 'href="/guide"')
        .replace(/<a href="[^"]*">오늘의 시장 분석 리포트 더 보기<\/a>/g, '<a href="/guide">46대 주식 투자 필수 용어 백과사전 더 보기</a>')
        .replace(/whitespace-nowrap/g, 'break-keep');
        
    contentWithIds = contentWithIds.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/gi, (_fullMatch: string, tag: string, attrs: string, innerHtml: string) => {
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

    const finalContent = tocHtml + contentWithIds + '<br/><br/><p style="color: #6b7280; font-size: 0.875rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem; margin-top: 2rem;">본 포스팅은 <strong>스마트 투자비서</strong>가 제공하는 금융 교육 및 차트 스터디입니다. 모든 투자의 최종 판단과 책임은 투자자 본인에게 있습니다.</p>';

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
                    description={(post?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 100) + "..."}
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
                        <span className="text-gray-300 font-bold tracking-wide">{displayAuthor}</span>
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
                        <span>{post.viewCount || 142} 읽음</span>
                    </div>
                </div>
            </header>

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
                        한국거래소(KRX), 금융감독원 전자공시시스템(DART), 미국 SEC 공시 데이터를 기반으로 기업 밸류에이션과 기술적 보조지표를 연구하는 금융 교육팀입니다.
                        개인 투자자들이 정보의 비대칭성을 극복하고 건전한 투자 원칙을 수립할 수 있도록 체계적인 금융 이론과 시황 해설을 제공합니다.
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
