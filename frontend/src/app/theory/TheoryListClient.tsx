"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, BookOpen, ChevronRight, Eye, Search, Filter, GraduationCap, Flame, ArrowUpRight } from "lucide-react";

export interface TheoryPost {
    id: string;
    title: string;
    content: string;
    createdAt: Date | string;
    tags: string[];
    slug: string;
    viewCount: number;
}

interface TheoryListClientProps {
    initialPosts: TheoryPost[];
    totalPages: number;
    currentPage: number;
}

// 카테고리 정의
const CATEGORIES = [
    { id: "all", label: "전체 강의", emoji: "📚" },
    { id: "indicators", label: "핵심 보조지표", emoji: "📊" },
    { id: "patterns", label: "캔들 & 차트패턴", emoji: "🕯️" },
    { id: "strategies", label: "실전 매매타점", emoji: "🎯" },
    { id: "fundamentals", label: "기초 & 공시분석", emoji: "📖" },
];

// 함께 보면 좋은 주식 필수 용어 가이드 (내부 링크 SEO 강화)
const RECOMMENDED_GUIDES = [
    { slug: "rsi", title: "RSI (상대강도지수)", emoji: "📊", desc: "과매수·과매도 반전 포착 지표" },
    { slug: "macd", title: "MACD 추세 매매", emoji: "📈", desc: "단기·장기 이평선 교차 분석" },
    { slug: "bollinger-band", title: "볼린저 밴드", emoji: "📉", desc: "주가 변동성과 지지/저항" },
    { slug: "moving-average", title: "이동평균선 기초", emoji: "📏", desc: "골든크로스 & 데드크로스" },
    { slug: "per", title: "PER 주가수익비율", emoji: "💵", desc: "기업 저평가 적정주가 계산" },
    { slug: "pbr", title: "PBR 주가순자산비율", emoji: "🏦", desc: "장부가치 대비 청산 가치" },
    { slug: "dart", title: "DART 전자공시", emoji: "📋", desc: "상장사 실적·공시 팩트체크" },
    { slug: "short-selling", title: "공매도 & 대차잔고", emoji: "🔻", desc: "하락 베팅과 숏커버링 원리" },
];

export function getPostCategory(title: string, tags: string[] = []) {
    const text = (title + " " + tags.join(" ")).toLowerCase();
    if (
        text.includes("지표") || text.includes("rsi") || text.includes("macd") || 
        text.includes("윌리엄스") || text.includes("디마크") || text.includes("볼린저") || 
        text.includes("이격도") || text.includes("cci") || text.includes("stochastic") || text.includes("스토캐스틱")
    ) {
        return { id: "indicators", label: "보조지표", emoji: "📊", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    }
    if (
        text.includes("캔들") || text.includes("패턴") || text.includes("하이킨") || 
        text.includes("흑운형") || text.includes("유성형") || text.includes("수렴") || 
        text.includes("다크") || text.includes("갭") || text.includes("망치형") || text.includes("헤드앤숄더")
    ) {
        return { id: "patterns", label: "캔들·패턴", emoji: "🕯️", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    if (
        text.includes("눌림목") || text.includes("스캘핑") || text.includes("이동평균") || 
        text.includes("정배열") || text.includes("역배열") || text.includes("반등") || 
        text.includes("타점") || text.includes("매매") || text.includes("일선")
    ) {
        return { id: "strategies", label: "실전타점", emoji: "🎯", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
    }
    return { id: "fundamentals", label: "기초·공시", emoji: "📖", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
}

// 불필요한 기본 태그 제거 및 핵심 고유 태그 추출
export function cleanPostTags(tags: string[] = []) {
    const genericTags = new Set(["주식초보", "주식공부", "주식이론", "투자전략", "주식기초"]);
    const distinctive = tags.filter(t => !genericTags.has(t));
    if (distinctive.length > 0) {
        return distinctive.slice(0, 3);
    }
    return tags.slice(0, 2);
}

export default function TheoryListClient({ initialPosts, totalPages, currentPage }: TheoryListClientProps) {
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

    // 최신 대표 강의 (첫 번째 글, 검색이나 카테고리 필터 없을 때 상단 하이라이트)
    const featuredPost = (activeCategory === "all" && !searchQuery.trim() && currentPage === 1 && filteredPosts.length > 0) 
        ? filteredPosts[0] 
        : null;

    const listPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

    return (
        <div className="w-full">
            {/* 상단 검색 & 카테고리 필터 바 */}
            <div className="mb-10 space-y-5 bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-3xl shadow-xl">
                {/* 실시간 검색창 */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="지표명, 캔들 패턴, 매매기법 검색 (예: RSI, 하이킨 아시, 20일선, 스캘핑...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-black/60 border border-white/10 rounded-2xl text-white placeholder-gray-500 font-medium focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm md:text-base"
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
                        <Filter className="w-3.5 h-3.5 text-emerald-400" /> 주제 분류:
                    </span>
                    {CATEGORIES.map(cat => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                                    isActive
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/50 scale-105"
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
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span>총 <strong className="text-emerald-400">{filteredPosts.length}</strong>개의 강의</span>
                    {searchQuery && <span className="text-gray-500">(&apos;{searchQuery}&apos; 검색 결과)</span>}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                    매일 오전 8시 신규 강의 업데이트
                </div>
            </div>

            {/* 1. 최신 대표 강의 하이라이트 (Featured Card) */}
            {featuredPost && (
                <div className="mb-8">
                    <Link href={`/theory/${featuredPost.slug}`} className="block group">
                        <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-black border-2 border-emerald-500/30 hover:border-emerald-400 p-6 md:p-8 transition-all duration-300 shadow-2xl hover:shadow-emerald-500/15 group-hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />
                            
                            <div className="relative z-10">
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full shadow-sm">
                                        <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" /> 오늘의 최신 강의
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                                        ⏱️ 5분 마스터
                                    </span>
                                    {cleanPostTags(featuredPost.tags).map((tag, idx) => (
                                        <span key={idx} className="text-xs font-semibold text-emerald-400/90 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>

                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white group-hover:text-emerald-300 transition-colors mb-4 tracking-tight leading-snug">
                                    {featuredPost.title}
                                </h2>

                                <p className="text-gray-300 text-sm md:text-base leading-relaxed line-clamp-2 md:line-clamp-3 mb-6 max-w-4xl font-normal">
                                    {(featuredPost?.content || "").replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim().slice(0, 200)}...
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <div className="flex items-center text-xs md:text-sm text-gray-400 font-medium gap-4">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                            {new Date(featuredPost.createdAt).toLocaleDateString("ko-KR", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                timeZone: "Asia/Seoul",
                                            })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                                            {featuredPost.viewCount}회 학습
                                        </span>
                                    </div>
                                    <div className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 rounded-xl group-hover:from-emerald-400 group-hover:to-teal-500 transition-all shadow-md">
                                        강의 바로보기
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
                    <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-400 font-medium">검색 조건에 맞는 강의가 없습니다.</p>
                    <button
                        onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
                        className="mt-4 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-all"
                    >
                        전체 목록으로 돌아가기
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {listPosts.map((post) => {
                        const cat = getPostCategory(post.title, post.tags);
                        const cleanTags = cleanPostTags(post.tags);

                        return (
                            <Link key={post.id} href={`/theory/${post.slug}`} className="block group">
                                <article className="h-full flex flex-col justify-between bg-zinc-900/50 backdrop-blur-md border border-white/10 hover:border-emerald-500/50 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/0 group-hover:bg-emerald-500/10 blur-2xl transition-all duration-300 rounded-full pointer-events-none" />

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

                                        {/* 강의 제목 */}
                                        <h3 className="text-lg md:text-xl font-bold text-gray-100 group-hover:text-emerald-300 transition-colors mb-2.5 line-clamp-2 leading-snug">
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
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all">
                                            강의 보기
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
                            href={`/theory?page=${currentPage - 1}`} 
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
                                    href={`/theory?page=${pageNum}`}
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                                        currentPage === pageNum 
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/50 scale-105" 
                                            : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    {pageNum}
                                </Link>
                            );
                        } else if (pageNum === page - 2 || pageNum === page + 2) {
                            return <span key={pageNum} className="text-gray-600 px-1">...</span>;
                        }
                        return null;
                    })}

                    {currentPage < totalPages && (
                        <Link 
                            href={`/theory?page=${currentPage + 1}`} 
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            )}

            {/* 3. [구글 애드센스 SEO 특화] 추천 주식 용어 사전 내부 링크 그리드 */}
            <div className="mt-16 pt-10 border-t border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📚</span>
                        <h3 className="text-lg md:text-xl font-bold text-white">
                            함께 공부하면 좋은 주식 필수 기초 가이드
                        </h3>
                    </div>
                    <Link href="/guide" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        전체 용어 사전 <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    {RECOMMENDED_GUIDES.map((item, idx) => (
                        <Link
                            key={idx}
                            href={`/guide/${item.slug}`}
                            className="p-3.5 bg-black/40 border border-white/5 hover:border-emerald-500/40 rounded-2xl hover:bg-white/5 transition-all group"
                        >
                            <div className="text-xl mb-1">{item.emoji}</div>
                            <h4 className="text-sm font-bold text-gray-200 group-hover:text-emerald-400 transition-colors">
                                {item.title}
                            </h4>
                            <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                {item.desc}
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
