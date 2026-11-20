"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    BookOpen,
    Clock,
    ChevronRight,
    Eye,
    Search,
    Filter,
    GraduationCap,
    Flame,
    CheckCircle2,
    Sparkles,
    Map,
    ListChecks,
    HelpCircle,
    Loader2,
    Lock,
    PlusCircle,
    Award,
    RotateCcw,
} from "lucide-react";
import {
    EconomicsPost,
    EconomicsCategoryStat,
    ECONOMICS_CATEGORIES_META,
} from "@/lib/economicsFallback";
import { API_BASE_URL } from "@/lib/config";
import { useAuth, isAdminEmail } from "@/context/AuthContext";

interface CurriculumItem {
    order: number;
    topic: string;
    difficulty: string;
    published: boolean;
    slug: string | null;
    dayNumber: number | null;
    publishedTitle: string | null;
}

interface CurriculumGroup extends EconomicsCategoryStat {
    totalCount: number;
    publishedCount: number;
    items: CurriculumItem[];
}

interface EconomicsListClientProps {
    initialPosts: EconomicsPost[];
    initialCategories: EconomicsCategoryStat[];
    curriculumTotal: number;
}

const COMPLETED_STORAGE_KEY = "econ_completed_slugs_v1";

function getCategoryStyle(categoryId: string) {
    switch (categoryId) {
        case "micro":
            return "text-amber-300 bg-amber-500/15 border-amber-500/30";
        case "macro":
            return "text-sky-300 bg-sky-500/15 border-sky-500/30";
        case "money":
            return "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
        case "global":
            return "text-violet-300 bg-violet-500/15 border-violet-500/30";
        case "behavior":
            return "text-rose-300 bg-rose-500/15 border-rose-500/30";
        case "history":
            return "text-orange-300 bg-orange-500/15 border-orange-500/30";
        default:
            return "text-indigo-300 bg-indigo-500/15 border-indigo-500/30";
    }
}

function getDifficultyBadge(diff: string) {
    if (diff === "입문") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    if (diff === "기초") return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    if (diff === "실전") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    return "bg-purple-500/15 text-purple-300 border-purple-500/30";
}

export default function EconomicsListClient({
    initialPosts,
    initialCategories,
    curriculumTotal,
}: EconomicsListClientProps) {
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = isAdminEmail(user?.email);

    const [posts, setPosts] = useState<EconomicsPost[]>(initialPosts);
    const [viewMode, setViewMode] = useState<"lessons" | "roadmap">("lessons");
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [onlyUnread, setOnlyUnread] = useState<boolean>(false);

    // 나의 공부 완료 기록 (localStorage)
    const [completedSlugs, setCompletedSlugs] = useState<string[]>([]);

    // 커리큘럼 로드맵 데이터
    const [curriculum, setCurriculum] = useState<CurriculumGroup[] | null>(null);
    const [loadingCurriculum, setLoadingCurriculum] = useState<boolean>(false);
    const [roadmapCategory, setRoadmapCategory] = useState<string>("micro");

    // 대표님(관리자) 즉시 새 강의 생성 상태
    const [genCategory, setGenCategory] = useState<string>("auto");
    const [genCustomTopic, setGenCustomTopic] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generatingTopicLabel, setGeneratingTopicLabel] = useState<string>("");
    const [genMessage, setGenMessage] = useState<{ type: "success" | "error"; text: string; slug?: string } | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setCompletedSlugs(parsed);
            }
        } catch {
            // ignore
        }
    }, []);

    // 커리큘럼 탭 열 때 API 호출
    const fetchCurriculum = async () => {
        setLoadingCurriculum(true);
        try {
            const baseUrl = API_BASE_URL || "";
            const res = await fetch(`${baseUrl}/api/economics/curriculum`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === "ok" && Array.isArray(data.curriculum)) {
                    setCurriculum(data.curriculum);
                }
            }
        } catch (err) {
            console.error("커리큘럼 조회 실패:", err);
        } finally {
            setLoadingCurriculum(false);
        }
    };

    useEffect(() => {
        if (viewMode === "roadmap" && !curriculum && !loadingCurriculum) {
            fetchCurriculum();
        }
    }, [viewMode]);

    // 최신 목록 리프레시
    const refreshPosts = async () => {
        try {
            const baseUrl = API_BASE_URL || "";
            const res = await fetch(`${baseUrl}/api/economics/posts?page=1&limit=100`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === "ok" && Array.isArray(data.posts) && data.posts.length > 0) {
                    setPosts(data.posts);
                }
            }
        } catch (err) {
            console.error("목록 새로고침 실패:", err);
        }
    };

    // 대표님 전용: 겹치지 않는 새 강의 즉시 생성
    const handleGenerateNow = async (overrideCategory?: string, overrideTopic?: string) => {
        if (!isAdmin || isGenerating) return;
        setIsGenerating(true);
        setGenMessage(null);
        setGeneratingTopicLabel(
            overrideTopic
                ? `'${overrideTopic.split("-")[0].trim()}' 강의 작성 중...`
                : "과거 발행 목록과 겹치지 않는 새로운 경제학 주제를 선정해 강의를 작성 중입니다..."
        );

        try {
            const baseUrl = API_BASE_URL || "";
            const res = await fetch(`${baseUrl}/api/economics/generate-now`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: overrideCategory ?? genCategory,
                    custom_topic: (overrideTopic ?? genCustomTopic).trim() || null,
                    admin_email: user?.email || "",
                    send_push: false,
                }),
            });
            const data = await res.json();
            if (data.status === "ok" && data.slug) {
                setGenMessage({
                    type: "success",
                    text: `🎉 Day ${data.dayNumber} [${data.categoryLabel}] "${data.title}" 강의가 완성되었습니다!`,
                    slug: data.slug,
                });
                setGenCustomTopic("");
                await refreshPosts();
                if (curriculum) {
                    await fetchCurriculum();
                }
            } else {
                setGenMessage({
                    type: "error",
                    text: data.message || "강의 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
                });
            }
        } catch (err: any) {
            setGenMessage({
                type: "error",
                text: `네트워크 오류: ${err?.message || "서버 응답 지연"}`,
            });
        } finally {
            setIsGenerating(false);
            setGeneratingTopicLabel("");
        }
    };

    const completedSet = useMemo(() => new Set(completedSlugs), [completedSlugs]);

    const completedCountInPublished = useMemo(
        () => posts.filter((p) => completedSet.has(p.slug)).length,
        [posts, completedSet]
    );

    const progressPct = posts.length > 0 ? Math.round((completedCountInPublished / posts.length) * 100) : 0;

    // 분야별 완주 통계
    const categories = initialCategories && initialCategories.length > 0 ? initialCategories : ECONOMICS_CATEGORIES_META;

    // 필터링 & 검색
    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            if (activeCategory !== "all" && post.category !== activeCategory) return false;
            if (onlyUnread && completedSet.has(post.slug)) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const inTitle = (post.title || "").toLowerCase().includes(q);
                const inDef = (post.oneLineDef || "").toLowerCase().includes(q);
                const inSum = (post.summary || "").toLowerCase().includes(q);
                const inTags = (post.tags || []).some((t) => t.toLowerCase().includes(q));
                if (!inTitle && !inDef && !inSum && !inTags) return false;
            }
            return true;
        });
    }, [posts, activeCategory, onlyUnread, searchQuery, completedSet]);

    const featuredPost =
        viewMode === "lessons" && activeCategory === "all" && !searchQuery.trim() && !onlyUnread && filteredPosts.length > 0
            ? filteredPosts[0]
            : null;
    const listPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

    return (
        <div className="w-full space-y-8">
            {/* 1. 나의 경제학 공부 현황 대시보드 */}
            <div className="rounded-3xl bg-gradient-to-br from-indigo-950/60 via-zinc-900/90 to-slate-950 border border-indigo-500/30 p-5 md:p-7 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full mb-2">
                            <Award className="w-3.5 h-3.5" />
                            <span>나의 경제학 공부 진도표</span>
                        </div>
                        <h2 className="text-lg md:text-2xl font-black text-white">
                            하루 5분씩 차곡차곡! 지금 <span className="text-amber-400">{completedCountInPublished}강</span>을 마스터했어요
                        </h2>
                        <p className="text-xs md:text-sm text-gray-400 mt-1">
                            현재까지 발행된 <strong className="text-gray-200">{posts.length}강</strong> 중 {completedCountInPublished}강 완료 · 총{" "}
                            <strong className="text-indigo-300">{curriculumTotal}일+ 비중복 커리큘럼</strong>이 매일 오전 7:40에 자동 연재됩니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-center min-w-[100px]">
                            <div className="text-[11px] text-gray-400 font-semibold">발행 강의 완주율</div>
                            <div className="text-xl md:text-2xl font-black text-amber-400">{progressPct}%</div>
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-center min-w-[100px]">
                            <div className="text-[11px] text-gray-400 font-semibold">전체 커리큘럼</div>
                            <div className="text-xl md:text-2xl font-black text-indigo-300">
                                {posts.length}
                                <span className="text-xs text-gray-500 font-bold">/{curriculumTotal}+</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 전체 진도 바 */}
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-5">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(progressPct, completedCountInPublished > 0 ? 6 : 0)}%` }}
                    />
                </div>

                {/* 6개 분야별 현황 미니 카드 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {categories.map((cat) => {
                        const publishedInCat = posts.filter((p) => p.category === cat.id);
                        const doneInCat = publishedInCat.filter((p) => completedSet.has(p.slug)).length;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                    setViewMode("lessons");
                                    setActiveCategory(cat.id === activeCategory ? "all" : cat.id);
                                }}
                                className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                                    activeCategory === cat.id && viewMode === "lessons"
                                        ? "bg-amber-500/15 border-amber-400/60 shadow-md"
                                        : "bg-black/35 border-white/10 hover:border-white/25 hover:bg-white/5"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-base">{cat.emoji}</span>
                                    <span className="text-[11px] font-bold text-gray-400">
                                        {publishedInCat.length}/{cat.totalPlanned || 30}
                                    </span>
                                </div>
                                <div className="text-xs font-extrabold text-white truncate">{cat.label}</div>
                                <div className="text-[10px] text-amber-300/90 mt-0.5 font-semibold">
                                    완료 {doneInCat}강
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. 대표님(관리자) 전용: 지금 하나 더 공부하기 (겹치지 않는 새 강의 즉시 생성) */}
            {isAdmin && (
                <div className="rounded-3xl bg-gradient-to-r from-amber-950/40 via-zinc-900/90 to-indigo-950/40 border-2 border-amber-500/40 p-5 md:p-6 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950">
                                    대표님 전용 학습실
                                </span>
                                <span className="text-xs font-bold text-amber-300">
                                    매일 자동 1강 외에 오늘 더 공부하고 싶을 때!
                                </span>
                            </div>
                            <h3 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span>겹치지 않는 새 경제학 강의 지금 바로 생성하기</span>
                            </h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-4">
                            <select
                                value={genCategory}
                                onChange={(e) => setGenCategory(e.target.value)}
                                disabled={isGenerating}
                                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/15 text-sm text-white font-semibold focus:outline-none focus:border-amber-400"
                            >
                                <option value="auto">🔄 자동 순환 추천 (6대 분야 골고루)</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.emoji} {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-5">
                            <input
                                type="text"
                                value={genCustomTopic}
                                onChange={(e) => setGenCustomTopic(e.target.value)}
                                disabled={isGenerating}
                                placeholder="(선택) 궁금한 경제 주제 직접 입력 (비우면 커리큘럼 자동 선택)"
                                className="w-full px-3.5 py-3 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <button
                                type="button"
                                onClick={() => handleGenerateNow()}
                                disabled={isGenerating}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>강의 집필 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle className="w-4 h-4" />
                                        <span>새 강의 바로 만들기</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {isGenerating && generatingTopicLabel && (
                        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
                            <span>{generatingTopicLabel} (그림·그래프·퀴즈까지 약 15~25초 소요됩니다)</span>
                        </div>
                    )}

                    {genMessage && (
                        <div
                            className={`mt-3 p-3.5 rounded-xl border text-xs md:text-sm font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                genMessage.type === "success"
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                                    : "bg-rose-500/15 border-rose-500/40 text-rose-200"
                            }`}
                        >
                            <span>{genMessage.text}</span>
                            {genMessage.slug && (
                                <button
                                    type="button"
                                    onClick={() => router.push(`/economics/${genMessage.slug}`)}
                                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black hover:bg-emerald-400 transition-colors shrink-0 cursor-pointer"
                                >
                                    방금 만든 강의 공부하기 →
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 3. 메인 뷰 전환 탭: 매일 강의 모아보기 vs 180일 커리큘럼 로드맵 */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex p-1.5 rounded-2xl bg-zinc-900 border border-white/10">
                    <button
                        type="button"
                        onClick={() => setViewMode("lessons")}
                        className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                            viewMode === "lessons"
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <ListChecks className="w-4 h-4" />
                        <span>매일 강의 모아보기 ({posts.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("roadmap")}
                        className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                            viewMode === "roadmap"
                                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md"
                                : "text-gray-400 hover:text-white"
                        }`}
                    >
                        <Map className="w-4 h-4" />
                        <span>180일 비중복 커리큘럼 로드맵</span>
                    </button>
                </div>

                <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>매일 오전 7시 40분 새로운 주제 자동 발행 (중복 0%)</span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                TAB 1: 매일 강의 모아보기
               ══════════════════════════════════════════════════ */}
            {viewMode === "lessons" && (
                <div className="space-y-8">
                    {/* 검색 & 분야 필터 바 */}
                    <div className="space-y-4 bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-4 sm:p-5 md:p-6 rounded-3xl shadow-xl">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="궁금한 경제 개념 검색 (예: 금리, 인플레이션, 환율, 기회비용, 넛지, GDP...)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-16 py-3.5 bg-black/60 border border-white/10 rounded-2xl text-white placeholder-gray-500 font-medium focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all text-sm md:text-base"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-white bg-white/10 px-2.5 py-1 rounded-lg"
                                    >
                                        지우기
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setOnlyUnread(!onlyUnread)}
                                className={`px-4 py-3 rounded-2xl text-xs md:text-sm font-bold border transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer ${
                                    onlyUnread
                                        ? "bg-amber-500/20 border-amber-400 text-amber-300"
                                        : "bg-black/40 border-white/10 text-gray-300 hover:bg-white/5"
                                }`}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>아직 안 본 강의만</span>
                            </button>
                        </div>

                        {/* 6대 분야 필터 */}
                        <div className="w-full min-w-0 overflow-x-auto pb-1 pt-1 no-scrollbar flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 hidden sm:flex items-center gap-1 shrink-0 mr-1">
                                <Filter className="w-3.5 h-3.5 text-amber-400" /> 분야:
                            </span>
                            <button
                                type="button"
                                onClick={() => setActiveCategory("all")}
                                className={`shrink-0 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                                    activeCategory === "all"
                                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md"
                                        : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                                }`}
                            >
                                📚 전체 ({posts.length})
                            </button>
                            {categories.map((cat) => {
                                const isActive = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`shrink-0 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                            isActive
                                                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md"
                                                : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                                        }`}
                                    >
                                        <span>{cat.emoji}</span>
                                        <span>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 오늘의 최신 강의 하이라이트 (Featured) */}
                    {featuredPost && (
                        <Link href={`/economics/${featuredPost.slug}`} className="block group">
                            <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/35 via-zinc-900/95 to-indigo-950/40 border-2 border-amber-500/40 hover:border-amber-400 p-6 md:p-8 transition-all duration-300 shadow-2xl hover:shadow-amber-500/15 group-hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 px-3 py-1 rounded-full shadow-sm">
                                            <Flame className="w-3.5 h-3.5 text-orange-700" />
                                            오늘의 1일 1경제학 · Day {featuredPost.dayNumber || 1}
                                        </span>
                                        <span
                                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getCategoryStyle(
                                                featuredPost.category
                                            )}`}
                                        >
                                            {featuredPost.categoryEmoji} {featuredPost.categoryLabel}
                                        </span>
                                        <span
                                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getDifficultyBadge(
                                                featuredPost.difficulty
                                            )}`}
                                        >
                                            난이도: {featuredPost.difficulty}
                                        </span>
                                        <span className="text-xs font-bold text-indigo-200 bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                                            <HelpCircle className="w-3.5 h-3.5" /> 복습 퀴즈 포함
                                        </span>
                                        {completedSet.has(featuredPost.slug) && (
                                            <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> 공부 완료
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white group-hover:text-amber-300 transition-colors mb-4 leading-snug break-keep">
                                        {featuredPost.title}
                                    </h2>

                                    {featuredPost.oneLineDef && (
                                        <div className="p-4 rounded-2xl bg-black/45 border border-amber-500/25 mb-5 max-w-4xl">
                                            <span className="text-xs font-black text-amber-400 block mb-1">
                                                💡 3초 한 줄 핵심 정의
                                            </span>
                                            <p className="text-sm md:text-base text-gray-100 font-semibold leading-relaxed break-keep">
                                                {featuredPost.oneLineDef}
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                                        <div className="flex items-center text-xs md:text-sm text-gray-400 font-medium gap-4">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                                {featuredPost.createdDateKst ||
                                                    new Date(featuredPost.createdAt).toLocaleDateString("ko-KR", {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                        timeZone: "Asia/Seoul",
                                                    })}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                                {featuredPost.viewCount || 0}회 학습
                                            </span>
                                        </div>
                                        <div className="inline-flex items-center gap-1.5 text-xs md:text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 px-5 py-2.5 rounded-xl group-hover:from-amber-300 group-hover:to-yellow-300 transition-all shadow-lg">
                                            <span>오늘의 5분 공부 시작하기</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </article>
                        </Link>
                    )}

                    {/* 2열 강의 카드 리스트 */}
                    {listPosts.length === 0 && !featuredPost ? (
                        <div className="text-center py-20 bg-zinc-900/40 border border-white/10 rounded-3xl">
                            <BookOpen className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                            <p className="text-gray-300 font-bold mb-1">조건에 맞는 경제학 강의가 없습니다.</p>
                            <p className="text-xs text-gray-500">다른 분야를 선택하거나 검색어를 초기화해 보세요.</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveCategory("all");
                                    setSearchQuery("");
                                    setOnlyUnread(false);
                                }}
                                className="mt-4 px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-amber-500/30 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>필터 초기화</span>
                            </button>
                        </div>
                    ) : listPosts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {listPosts.map((post) => {
                                const isDone = completedSet.has(post.slug);
                                return (
                                    <Link key={post.slug} href={`/economics/${post.slug}`} className="block group">
                                        <article
                                            className={`h-full flex flex-col justify-between bg-zinc-900/60 backdrop-blur-md border rounded-2xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                                                isDone
                                                    ? "border-emerald-500/30 hover:border-emerald-400/60"
                                                    : "border-white/10 hover:border-amber-500/50"
                                            }`}
                                        >
                                            <div>
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-white/10 text-amber-300">
                                                            Day {post.dayNumber || 1}
                                                        </span>
                                                        <span
                                                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${getCategoryStyle(
                                                                post.category
                                                            )}`}
                                                        >
                                                            {post.categoryEmoji} {post.categoryLabel}
                                                        </span>
                                                        <span
                                                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${getDifficultyBadge(
                                                                post.difficulty
                                                            )}`}
                                                        >
                                                            {post.difficulty}
                                                        </span>
                                                    </div>
                                                    {isDone && (
                                                        <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> 완료
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-lg md:text-xl font-black text-white group-hover:text-amber-300 transition-colors mb-2.5 leading-snug break-keep">
                                                    {post.title}
                                                </h3>

                                                <p className="text-xs md:text-sm text-gray-300 leading-relaxed line-clamp-2 mb-4 break-keep">
                                                    {post.oneLineDef ||
                                                        post.summary ||
                                                        (post.content || "").replace(/<[^>]*>?/gm, "").slice(0, 120)}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between pt-3.5 border-t border-white/10 text-xs text-gray-400">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-amber-400/80" />
                                                        {post.createdDateKst ||
                                                            new Date(post.createdAt).toLocaleDateString("ko-KR", {
                                                                month: "short",
                                                                day: "numeric",
                                                                timeZone: "Asia/Seoul",
                                                            })}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                                                        {post.viewCount || 0}
                                                    </span>
                                                </div>
                                                <span className="font-bold text-amber-300 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                                    공부하기 <ChevronRight className="w-3.5 h-3.5" />
                                                </span>
                                            </div>
                                        </article>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            )}

            {/* ══════════════════════════════════════════════════
                TAB 2: 180일 비중복 경제학 커리큘럼 로드맵
               ══════════════════════════════════════════════════ */}
            {viewMode === "roadmap" && (
                <div className="space-y-6">
                    <div className="rounded-3xl bg-zinc-900/70 border border-indigo-500/30 p-5 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                            <div>
                                <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5 text-indigo-400" />
                                    <span>6대 분야 180일 왕초보 경제학 완전 정복 로드맵</span>
                                </h3>
                                <p className="text-xs md:text-sm text-gray-400 mt-1">
                                    매일 오전 7시 40분마다 6개 분야를 번갈아 가며 겹치지 않는 주제가 하나씩 열립니다. 180일 완주 후에도 AI가 중복 없는 심화 주제를 계속 연재합니다!
                                </p>
                            </div>
                        </div>

                        {/* 로드맵 분야 선택 탭 */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setRoadmapCategory(cat.id)}
                                    className={`shrink-0 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                        roadmapCategory === cat.id
                                            ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                                            : "bg-black/40 text-gray-300 border-white/10 hover:bg-white/5"
                                    }`}
                                >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingCurriculum ? (
                        <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                            <span className="text-sm font-semibold">180일 커리큘럼 로드맵을 불러오는 중...</span>
                        </div>
                    ) : curriculum ? (
                        (() => {
                            const group = curriculum.find((g) => g.id === roadmapCategory) || curriculum[0];
                            if (!group) return null;
                            return (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="text-sm font-bold text-gray-200">
                                            {group.emoji} {group.label} ·{" "}
                                            <span className="text-gray-400 font-normal">{group.shortDesc}</span>
                                        </div>
                                        <div className="text-xs font-bold text-indigo-300">
                                            오픈됨 {group.publishedCount} / {group.totalCount}강
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {group.items.map((item) => {
                                            const isDone = item.slug ? completedSet.has(item.slug) : false;
                                            return (
                                                <div
                                                    key={item.order}
                                                    className={`p-4 rounded-2xl border flex items-start justify-between gap-3 transition-all ${
                                                        item.published
                                                            ? "bg-emerald-950/20 border-emerald-500/35 hover:border-emerald-400"
                                                            : "bg-zinc-900/50 border-white/10"
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                                            <span className="text-[11px] font-black text-gray-400">
                                                                #{String(item.order).padStart(2, "0")}
                                                            </span>
                                                            <span
                                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getDifficultyBadge(
                                                                    item.difficulty
                                                                )}`}
                                                            >
                                                                {item.difficulty}
                                                            </span>
                                                            {item.published ? (
                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                                                                    {item.dayNumber ? `Day ${item.dayNumber} 오픈` : "발행됨"}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-gray-500 flex items-center gap-1">
                                                                    <Lock className="w-2.5 h-2.5" /> 순차 오픈 예정
                                                                </span>
                                                            )}
                                                            {isDone && (
                                                                <span className="text-[10px] font-black text-amber-300">
                                                                    ✅ 완주
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs md:text-sm font-bold text-gray-100 leading-snug break-keep">
                                                            {item.topic}
                                                        </p>
                                                    </div>

                                                    <div className="shrink-0">
                                                        {item.published && item.slug ? (
                                                            <Link
                                                                href={`/economics/${item.slug}`}
                                                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black inline-flex items-center gap-1 transition-colors"
                                                            >
                                                                <span>공부</span>
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                            </Link>
                                                        ) : isAdmin ? (
                                                            <button
                                                                type="button"
                                                                disabled={isGenerating}
                                                                onClick={() => handleGenerateNow(group.id, item.topic)}
                                                                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                                            >
                                                                먼저 열기
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()
                    ) : (
                        <div className="py-12 text-center text-sm text-gray-400">
                            커리큘럼 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
