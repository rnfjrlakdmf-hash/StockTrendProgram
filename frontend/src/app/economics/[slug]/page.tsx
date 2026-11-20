import Link from "next/link";
import { Metadata } from "next";
import { Clock, ArrowLeft, Eye, BookOpen, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import SocialShareButtons from "@/components/SocialShareButtons";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { API_BASE_URL } from "@/lib/config";
import { EconomicsPost, FALLBACK_ECONOMICS_POSTS } from "@/lib/economicsFallback";
import EconomicsStudyTools from "./EconomicsStudyTools";

export const dynamic = "force-dynamic";

interface RelatedSummary {
    slug: string;
    dayNumber: number;
    title: string;
    oneLineDef?: string;
    category?: string;
    categoryLabel?: string;
    categoryEmoji?: string;
    createdAt?: string;
}

async function getEconomicsDetail(slug: string): Promise<{
    post: EconomicsPost;
    prevPost: RelatedSummary | null;
    nextPost: RelatedSummary | null;
    relatedPosts: RelatedSummary[];
}> {
    const decodedSlug = decodeURIComponent(slug);
    const fallbackPost =
        FALLBACK_ECONOMICS_POSTS.find((p) => p.slug === decodedSlug) || FALLBACK_ECONOMICS_POSTS[0];

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const baseUrl = API_BASE_URL || (typeof window === "undefined" ? "http://127.0.0.1:8000" : "");
        const res = await fetch(`${baseUrl}/api/economics/posts/${encodeURIComponent(decodedSlug)}`, {
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            return { post: fallbackPost, prevPost: null, nextPost: null, relatedPosts: [] };
        }
        const data = await res.json();
        if (data.status === "ok" && data.post) {
            return {
                post: data.post as EconomicsPost,
                prevPost: data.prevPost || null,
                nextPost: data.nextPost || null,
                relatedPosts: data.relatedPosts || [],
            };
        }
        return { post: fallbackPost, prevPost: null, nextPost: null, relatedPosts: [] };
    } catch {
        return { post: fallbackPost, prevPost: null, nextPost: null, relatedPosts: [] };
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const resolved = await params;
    const { post } = await getEconomicsDetail(resolved.slug);
    const desc =
        post.oneLineDef ||
        post.summary ||
        (post.content || "").replace(/<[^>]*>?/gm, "").substring(0, 150) + "...";

    const ogImg = `https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(
        post.title
    )}&subtitle=${encodeURIComponent(`매일 1일 1경제학 · Day ${post.dayNumber || 1}`)}&tag=${encodeURIComponent(
        post.categoryLabel || "경제학공부방"
    )}`;

    return {
        title: `${post.title} | 매일 1일 1경제학 공부방`,
        description: desc,
        alternates: {
            canonical: `/economics/${resolved.slug}`,
        },
        openGraph: {
            title: post.title,
            description: desc,
            type: "article",
            images: [{ url: ogImg, width: 1200, height: 630, alt: post.title }],
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: desc,
            images: [ogImg],
        },
    };
}

export default async function EconomicsDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const resolved = await params;
    const { post, prevPost, nextPost, relatedPosts } = await getEconomicsDetail(resolved.slug);

    const createdDateObj = post.createdAt ? new Date(post.createdAt) : new Date();
    const validDate = isNaN(createdDateObj.getTime()) ? new Date() : createdDateObj;

    // 자동 목차 (TOC) 추출 및 본문 ID 주입
    const tocRegex = /<(h[23])([^>]*)>(.*?)<\/\1>/gi;
    const toc: { level: number; text: string; id: string }[] = [];
    let idCounter = 0;

    let contentWithIds = (post.content || "").replace(/whitespace-nowrap/g, "break-keep");
    contentWithIds = contentWithIds.replace(
        /<(h[23])([^>]*)>(.*?)<\/\1>/gi,
        (_full: string, tag: string, attrs: string, innerHtml: string) => {
            const id = `econ-toc-${idCounter++}`;
            if (attrs.includes("class=")) {
                return `<${tag} id="${id}"${attrs.replace(/class="([^"]*)"/, 'class="$1 scroll-mt-28"')}>${innerHtml}</${tag}>`;
            }
            return `<${tag} id="${id}"${attrs} class="scroll-mt-28">${innerHtml}</${tag}>`;
        }
    );

    let m;
    while ((m = tocRegex.exec(post.content || "")) !== null) {
        const level = m[1].toLowerCase() === "h2" ? 2 : 3;
        const text = m[3].replace(/<[^>]*>?/gm, "").trim();
        if (text) {
            toc.push({ level, text, id: `econ-toc-${toc.length}` });
        }
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.oneLineDef || post.summary || "",
        datePublished: validDate.toISOString(),
        author: {
            "@type": "Person",
            name: post.author || "StockTrend 경제학 1타 선생님",
        },
        publisher: {
            "@type": "Organization",
            name: "스마트 투자비서 · 1일 1경제학 공부방",
            logo: {
                "@type": "ImageObject",
                url: "https://stock-trend-program.co.kr/icon.png",
            },
        },
    };

    return (
        <article className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-4xl mx-auto animate-in fade-in duration-500 text-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* 상단 네비게이션 */}
            <div className="mb-8 flex flex-wrap justify-between items-center gap-3">
                <Link
                    href="/economics"
                    className="inline-flex items-center gap-2 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-colors font-semibold text-sm border border-white/10"
                >
                    <ArrowLeft className="w-4 h-4" />
                    경제학 공부방 목록으로
                </Link>

                <SocialShareButtons
                    title={post.title}
                    description={post.oneLineDef || post.summary || ""}
                    url={`https://stock-trend-program.co.kr/economics/${post.slug}`}
                    imageUrl={`https://stock-trend-program.co.kr/api/og?title=${encodeURIComponent(
                        post.title
                    )}&subtitle=${encodeURIComponent(`매일 1일 1경제학 · Day ${post.dayNumber || 1}`)}&tag=${encodeURIComponent(
                        post.categoryLabel || "경제학"
                    )}`}
                />
            </div>

            {/* 헤더 섹션 */}
            <header className="mb-10 border-b border-white/10 pb-8">
                <div className="flex flex-wrap items-center gap-2 mb-5">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-sm">
                        Day {post.dayNumber || 1} · 매일 1일 1경제학
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                        {post.categoryEmoji || "🎓"} {post.categoryLabel || "경제학"}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        난이도: {post.difficulty || "입문"}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-gray-300 border border-white/10">
                        ⏱️ 5분 완성
                    </span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6 tracking-tight break-keep">
                    {post.title}
                </h1>

                {/* 💡 3초 한 줄 핵심 정의 배너 */}
                {post.oneLineDef && (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-indigo-500/15 border border-amber-400/40 mb-6 shadow-lg">
                        <div className="text-xs font-black text-amber-300 mb-1 flex items-center gap-1.5">
                            <span>💡</span>
                            <span>오늘의 3초 한 줄 핵심 정의</span>
                        </div>
                        <p className="text-base md:text-lg font-extrabold text-white leading-relaxed break-keep">
                            {post.oneLineDef}
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-5 text-sm text-gray-400 font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                        <span className="text-gray-200 font-bold">
                            {post.author || "StockTrend 경제학 1타 선생님"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <time dateTime={validDate.toISOString()}>
                            {post.createdDateKst ||
                                validDate.toLocaleDateString("ko-KR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    weekday: "long",
                                    timeZone: "Asia/Seoul",
                                })}
                        </time>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>{post.viewCount || 50}회 학습</span>
                    </div>
                </div>
            </header>

            {/* 자동 목차 (TOC) */}
            {toc.length > 0 && (
                <nav className="mb-10 p-6 rounded-2xl bg-zinc-900/80 border border-white/10">
                    <div className="text-xs uppercase tracking-widest text-amber-400 font-black mb-4 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        <span>오늘 배울 차례 (클릭하면 바로 이동)</span>
                    </div>
                    <ul className="space-y-2.5">
                        {toc.map((item, idx) => (
                            <li key={item.id} className={item.level === 3 ? "pl-6" : ""}>
                                <a
                                    href={`#${item.id}`}
                                    className={`text-sm md:text-base transition-colors hover:text-amber-300 flex items-start gap-2 ${
                                        item.level === 2 ? "text-gray-100 font-bold" : "text-gray-400 font-medium"
                                    }`}
                                >
                                    <span className="text-amber-400/80 font-mono text-xs mt-1">
                                        {item.level === 2 ? `0${idx + 1}` : "↳"}
                                    </span>
                                    <span className="break-keep">{item.text}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}

            {/* 강의 본문 (HTML + 다크모드 SVG 도식 + 가로 막대그래프) */}
            <div
                className="econ-content leading-loose"
                dangerouslySetInnerHTML={{ __html: contentWithIds }}
            />

            {/* 인터랙티브 복습 퀴즈 & 공부 완료 도장 위젯 */}
            <EconomicsStudyTools
                slug={post.slug}
                dayNumber={post.dayNumber || 1}
                title={post.title}
                quiz={post.quiz || []}
            />

            {/* 이전 강의 / 다음 강의 네비게이션 */}
            {(prevPost || nextPost) && (
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {prevPost ? (
                        <Link
                            href={`/economics/${prevPost.slug}`}
                            className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 hover:border-amber-400/50 transition-all group flex flex-col justify-between"
                        >
                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1 mb-2">
                                <ChevronLeft className="w-4 h-4 text-amber-400" />
                                이전 강의 · Day {prevPost.dayNumber}
                            </span>
                            <span className="text-sm md:text-base font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2 break-keep">
                                {prevPost.title}
                            </span>
                        </Link>
                    ) : (
                        <div />
                    )}

                    {nextPost && (
                        <Link
                            href={`/economics/${nextPost.slug}`}
                            className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 hover:border-amber-400/50 transition-all group flex flex-col justify-between text-right"
                        >
                            <span className="text-xs font-bold text-gray-400 flex items-center justify-end gap-1 mb-2">
                                다음 강의 · Day {nextPost.dayNumber}
                                <ChevronRight className="w-4 h-4 text-amber-400" />
                            </span>
                            <span className="text-sm md:text-base font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2 break-keep">
                                {nextPost.title}
                            </span>
                        </Link>
                    )}
                </div>
            )}

            {/* 관련 추천 경제학 강의 */}
            {relatedPosts && relatedPosts.length > 0 && (
                <div className="mt-14 border-t border-white/10 pt-10">
                    <h3 className="text-sm uppercase tracking-widest text-amber-400 font-black mb-5">
                        📚 이어서 공부하면 좋은 경제학 강의
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {relatedPosts.map((rp) => (
                            <Link
                                key={rp.slug}
                                href={`/economics/${rp.slug}`}
                                className="block group bg-zinc-900/60 border border-white/10 hover:border-amber-400/50 rounded-2xl p-5 transition-all"
                            >
                                <div className="text-[11px] font-bold text-amber-300 mb-2">
                                    Day {rp.dayNumber} · {rp.categoryEmoji} {rp.categoryLabel}
                                </div>
                                <h4 className="text-sm font-black text-gray-100 group-hover:text-amber-300 transition-colors line-clamp-2 mb-2 break-keep">
                                    {rp.title}
                                </h4>
                                {rp.oneLineDef && (
                                    <p className="text-xs text-gray-400 line-clamp-2 break-keep">
                                        {rp.oneLineDef}
                                    </p>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* 매일 아침 푸시 알림 구독 */}
            <div className="mt-10">
                <PushSubscribeButton />
            </div>

            <p className="text-gray-500 text-xs mt-10 border-t border-white/10 pt-6 leading-relaxed">
                본 콘텐츠는 <strong>스마트 투자비서 · 매일 1일 1경제학 공부방</strong>에서 제공하는 무료 경제 기초 교육 자료입니다. 특정 종목의 매수·매도를 권유하지 않으며, 모든 투자 판단의 책임은 본인에게 있습니다.
            </p>

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                .econ-content {
                    font-size: 1.075rem;
                    color: #e2e8f0;
                }
                .econ-content h2 {
                    font-size: 1.65rem;
                    font-weight: 900;
                    color: #ffffff;
                    margin-top: 2.75rem;
                    margin-bottom: 1.25rem;
                    border-bottom: 2px solid rgba(245, 158, 11, 0.35);
                    padding-bottom: 0.6rem;
                }
                .econ-content h3 {
                    font-size: 1.3rem;
                    font-weight: 800;
                    margin-top: 2rem;
                    margin-bottom: 0.9rem;
                    color: #fbbf24;
                    border-left: 4px solid #f59e0b;
                    padding-left: 0.9rem;
                }
                .econ-content p {
                    margin-bottom: 1.25rem;
                    line-height: 1.85;
                }
                .econ-content svg {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.75rem;
                }
                `,
                }}
            />
        </article>
    );
}
