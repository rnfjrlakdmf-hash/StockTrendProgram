"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, TrendingUp, ChevronRight, Eye, Search, Filter, Globe, ArrowUpRight, BarChart2, Zap } from "lucide-react";

export interface BlogPost {
    id: string;
    title: string;
    content: string;
    createdAt: Date | string;
    tags: string[];
    slug: string;
    viewCount: number;
}

interface BlogListClientProps {
    initialPosts: BlogPost[];
    totalPages: number;
    currentPage: number;
}

// 카테고리 정의
const CATEGORIES = [
    { id: "all", label: "전체 시황", emoji: "🌐" },
    { id: "korea", label: "국내증시 (코스피/코스닥)", emoji: "🇰🇷" },
    { id: "us", label: "미국증시 (나스닥/S&P)", emoji: "🇺🇸" },
    { id: "weekly", label: "주간전망·전략", emoji: "📅" },
    { id: "sector", label: "반도체·주도섹터", emoji: "⚡" },
];

// 하단 추천 내부 링크 (구글 애드센스 및 SEO 강화)
const RECOMMENDED_PAGES = [
    { href: "/post", title: "오늘의 핫이슈 종목 분석", emoji: "🔥", desc: "상위 1% 수급 데이터 기반 급등주·특징주 심층 리포트" },
    { href: "/theory", title: "1타 강사 매일 차트 스터디", emoji: "📚", desc: "초보자도 5분 만에 마스터하는 보조지표 & 실전 매매타점" },
    { href: "/theme", title: "실시간 주도 테마 레이더", emoji: "⚡", desc: "시장의 돈이 몰리는 실시간 주도 테마 TOP 10" },
    { href: "/signals", title: "실시간 마켓 시그널", emoji: "🚦", desc: "글로벌 리스크 신호등 및 DART 팩트 속보" },
];

export function getPostCategory(title: string, tags: string[] = []) {
    const text = (title + " " + tags.join(" ")).toLowerCase();
    
    if (text.includes("미국") || text.includes("나스닥") || text.includes("s&p") || text.includes("다우") || text.includes("뉴욕")) {
        return { id: "us", label: "미국증시", emoji: "🇺🇸", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
    }
    if (text.includes("주간") || text.includes("전망") || text.includes("전략") || text.includes("위클리") || text.includes("weekly")) {
        return { id: "weekly", label: "주간전망", emoji: "📅", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    if (text.includes("반도체") || text.includes("2차전지") || text.includes("바이오") || text.includes("ai") || text.includes("섹터")) {
        return { id: "sector", label: "주도섹터", emoji: "⚡", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
    }
    return { id: "korea", label: "국내증시", emoji: "🇰🇷", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
}

// 불필요한 중복 태그 정제 및 핵심 키워드 추출
export function cleanPostTags(tags: string[] = []) {
    const genericTags = new Set(["마켓뷰", "시황", "주식전망", "증시", "주식공부", "주식기초"]);
    const distinctive = tags.filter(t => !genericTags.has(t));
    if (distinctive.length > 0) {
        return distinctive.slice(0, 3);
    }
    return tags.slice(0, 2);
}

export default function BlogListClient({ initialPosts, totalPages, currentPage }: BlogListClientProps) {
    const [activeCategory, setActiveCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // 필터링 & 검색 적용
    const filteredPosts = useMemo(() => {
        return initialPosts.filter(post => {
            // 카테고리 매칭
            if (activeCategory !== "all") {
                const cat = getPostCategory(post.title, post.tags);
                if (cat.id !== activeCategory) return false;
            }
            // 검색어 매칭
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const titleMatch = post.title.toLowerCase().includes(query);
                const tagMatch = post.tags.some(t => t.toLowerCase().includes(query));
                const contentMatch = (post.content || "").toLowerCase().includes(query);
                if (!titleMatch && !tagMatch && !contentMatch) return false;
            }
            return true;
        });
    }, [initialPosts, activeCategory, searchQuery]);

    // 최신 대표 시황 리포트 (첫 번째 글, 검색/필터 없을 때 상단 하이라이트)
    const featuredPost = (activeCategory === "all" && !searchQuery.trim() && currentPage === 1 && filteredPosts.length > 0) 
        ? filteredPosts[0] 
        : null;

    const listPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

    return (
        <div className="w-full">
            {/* 상단 실시간 검색 & 카테고리 필터 바 */}
            <div className="mb-10 space-y-5 bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-xl">
                {/* 실시간 검색창 */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="국내/미국 시황, 코스피, 나스닥, 반도체 등 검색 (예: 코스피 6900, 나스닥 마감, 삼성전자...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-black/60 border border-white/10 rounded-2xl text-white placeholder-gray-500 font-medium focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm md:text-base"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-white bg-white/10 px-2 py-1 rounded-md"
                        >
                            지우기
                        </button>
                    )}
                </div>

                {/* 카테고리 필터 탭 */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-xs font-bold text-gray-400 flex items-center gap-1 shrink-0 mr-1 hidden sm:flex">
                        <Filter className="w-3.5 h-3.5 text-blue-400" /> 시장 분류:
                    </span>
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                                    isActive
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/50 scale-105"
                                        : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                                }`}
                            >
                                <span>{cat.emoji}</span>
                                <span>{cat.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 결과 카운트 안내 */}
            <div className="flex items-center justify-between mb-6 px-1">
                <div className="text-xs md:text-sm font-bold text-gray-400 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-400" />
                    <span>총 <strong className="text-blue-400">{filteredPosts.length}</strong>개의 전문가 마켓 리포트</span>
                    {searchQuery && <span className="text-gray-500">(&apos;{searchQuery}&apos; 검색 결과)</span>}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                    매일 국내/미국 장마감 후 실시간 브리핑 연재
                </div>
            </div>

            {/* 1. 최신 대표 시황 리포트 하이라이트 (Featured Card) */}
            {featuredPost && (
                <div className="mb-8">
                    <Link href={`/blog/${featuredPost.slug}`} className="block group">
                        <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950/40 via-zinc-900/90 to-black border-2 border-blue-500/30 hover:border-blue-400 p-6 md:p-8 transition-all duration-300 shadow-2xl hover:shadow-blue-500/15 group-hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />
                            
                            <div className="relative z-10">
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className="inline-flex items-center gap-1 text-xs font-black text-blue-300 bg-blue-500/20 border border-blue-500/40 px-3 py-1 rounded-full shadow-sm">
                                        <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> 오늘의 핵심 시황
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                                        📊 증시 마감 브리핑
                                    </span>
                                    {cleanPostTags(featuredPost.tags).map((tag, idx) => (
                                        <span key={idx} className="text-xs font-semibold text-blue-400/90 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>

                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white group-hover:text-blue-300 transition-colors mb-4 tracking-tight leading-snug">
                                    {featuredPost.title}
                                </h2>

                                <p className="text-gray-300 text-sm md:text-base leading-relaxed line-clamp-2 md:line-clamp-3 mb-6 max-w-4xl font-normal">
                                    {(featuredPost?.content || "").replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim().slice(0, 200)}...
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <div className="flex items-center text-xs md:text-sm text-gray-400 font-medium gap-4">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                                            {new Date(featuredPost.createdAt).toLocaleDateString("ko-KR", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                timeZone: "Asia/Seoul",
                                            })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                                            {featuredPost.viewCount}회 조회
                                        </span>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 rounded-xl group-hover:from-blue-400 group-hover:to-indigo-500 transition-all shadow-md">
                                        리포트 읽기
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </article>
                    </Link>
                </div>
            )}

            {/* 2. 깔끔한 2열 그리드 카드 리스트 */}
            {listPosts.length === 0 && !featuredPost ? (
                <div className="text-center py-20 bg-zinc-900/40 border border-white/10 rounded-3xl">
                    <Globe className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-400 font-medium">검색 조건에 맞는 시황 리포트가 없습니다.</p>
                    <button
                        onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
                        className="mt-4 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold hover:bg-blue-500/30 transition-all"
                    >
                        전체 리포트 목록으로 돌아가기
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {listPosts.map((post) => {
                        const cat = getPostCategory(post.title, post.tags);
                        const cleanTags = cleanPostTags(post.tags);

                        return (
                            <Link key={post.id} href={`/blog/${post.slug}`} className="block group">
                                <article className="h-full flex flex-col justify-between bg-zinc-900/50 backdrop-blur-md border border-white/10 hover:border-blue-500/50 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/0 group-hover:bg-blue-500/10 blur-2xl transition-all duration-300 rounded-full pointer-events-none" />

                                    <div>
                                        {/* 카테고리 뱃지 & 태그 */}
                                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${cat.color}`}>
                                                <span>{cat.emoji}</span>
                                                <span>{cat.label}</span>
                                            </span>
                                            {cleanTags.map((tag, idx) => (
                                                <span key={idx} className="text-[10px] font-medium text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>

                                        {/* 리포트 제목 */}
                                        <h3 className="text-lg md:text-xl font-bold text-gray-100 group-hover:text-blue-300 transition-colors mb-2.5 line-clamp-2 leading-snug">
                                            {post.title}
                                        </h3>

                                        {/* 본문 요약 */}
                                        <p className="text-gray-400 text-xs md:text-sm line-clamp-2 mb-4 leading-relaxed font-normal">
                                            {(post?.content || "").replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim().slice(0, 120)}...
                                        </p>
                                    </div>

                                    {/* 하단 메타 & 버튼 */}
                                    <div className="flex items-center justify-between pt-3.5 border-t border-white/5 text-xs text-gray-500 font-medium">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-gray-400" />
                                                {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                                                    month: "short",
                                                    day: "numeric",
                                                    timeZone: "Asia/Seoul",
                                                })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3 h-3 text-gray-600" />
                                                {post.viewCount}
                                            </span>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all">
                                            리포트 읽기
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </article>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12 pb-4">
                    {currentPage > 1 && (
                        <Link 
                            href={`/blog?page=${currentPage - 1}`} 
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                        </Link>
                    )}
                    
                    {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                            return (
                                <Link 
                                    key={pageNum} 
                                    href={`/blog?page=${pageNum}`}
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                                        currentPage === pageNum 
                                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/50 scale-105" 
                                            : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    {pageNum}
                                </Link>
                            );
                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                            return <span key={pageNum} className="text-gray-600 px-1">...</span>;
                        }
                        return null;
                    })}

                    {currentPage < totalPages && (
                        <Link 
                            href={`/blog?page=${currentPage + 1}`} 
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            )}

            {/* 3. [구글 애드센스 & SEO 특화] 내부 추천 링크 위젯 */}
            <div className="mt-16 pt-10 border-t border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🚀</span>
                        <h3 className="text-lg md:text-xl font-bold text-white">
                            함께 활용하면 투자 승률이 올라가는 스마트 분석 도구
                        </h3>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {RECOMMENDED_PAGES.map((item, idx) => (
                        <Link
                            key={idx}
                            href={item.href}
                            className="p-4 bg-black/40 border border-white/5 hover:border-blue-500/40 rounded-2xl hover:bg-white/5 transition-all group flex flex-col justify-between"
                        >
                            <div>
                                <div className="text-2xl mb-2">{item.emoji}</div>
                                <h4 className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors flex items-center justify-between">
                                    {item.title}
                                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                </h4>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
