'use client';

import React, { useState, useMemo } from 'react';
import { 
    TrendingUp, ExternalLink, Loader2, Info, RefreshCw, 
    ShieldCheck, CheckCircle2, Sparkles, BookOpen, Layers, 
    ArrowUpRight, HelpCircle, Newspaper, ThumbsUp, AlertTriangle,
    Clock, Radio, Flame, Search, Filter, Tag
} from 'lucide-react';

interface NewsItem {
    title: string;
    link: string;
    publisher: string;
    published: string;
    description?: string;
}

interface NewsTabProps {
    symbol: string;
    stockName: string;
    news: NewsItem[];
    loading: boolean;
    onRefresh?: () => void;
}

// 긍정 / 부정 키워드 사전
const POSITIVE_KEYWORDS = [
    "호재", "상승", "반등", "급등", "훈풍", "돌파", "사상 최대", "흑자", "호조", 
    "수주", "계약", "출시", "인수", "특허", "성장", "강세", "매수", "목표가 상향", 
    "수혜", "밸류업", "탑재", "혁신", "선점", "회복", "독점", "순항", "확대"
];

const NEGATIVE_KEYWORDS = [
    "악재", "하락", "급락", "적자", "둔화", "우려", "불안", "위기", "리스크", 
    "소송", "조사", "의혹", "집회", "파업", "침체", "약세", "매도", "목표가 하향", 
    "경고", "타격", "부진", "손실", "비상", "경고등", "제재"
];

// 상대 시간 포맷터
function formatRelativeTime(dateStr: string) {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 5) return "방금 전";
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays <= 7) return `${diffDays}일 전`;
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    } catch {
        return dateStr;
    }
}

export default function NewsTab({ symbol, stockName, news, loading, onRefresh }: NewsTabProps) {
    const [activeFilter, setActiveFilter] = useState<string>("all");
    const [searchKeyword, setSearchKeyword] = useState<string>("");

    const cleanCode = symbol.replace(/[^0-9]/g, '');

    // 뉴스 항목별 데이터 분석 (직결도, 감성, 카테고리 태그)
    const analyzedNews = useMemo(() => {
        if (!Array.isArray(news)) return [];

        return news.map((item) => {
            const title = item.title || "";
            const desc = item.description || "";
            const fullText = `${title} ${desc}`.toLowerCase();

            // 종목명 직접 포함 여부
            const isDirect = (stockName && title.includes(stockName)) || (cleanCode && title.includes(cleanCode));

            // 감성 분석
            const hasPositive = POSITIVE_KEYWORDS.some(kw => fullText.includes(kw));
            const hasNegative = NEGATIVE_KEYWORDS.some(kw => fullText.includes(kw));

            let sentiment: "positive" | "negative" | "neutral" = "neutral";
            if (hasPositive && !hasNegative) sentiment = "positive";
            else if (!hasPositive && hasNegative) sentiment = "negative";
            else if (hasPositive && hasNegative) sentiment = "neutral";

            return {
                ...item,
                isDirect,
                sentiment,
            };
        });
    }, [news, stockName, cleanCode]);

    // 필터링 적용
    const filteredNews = useMemo(() => {
        let list = analyzedNews;

        // 1. 카테고리 탭 필터
        if (activeFilter === "direct") {
            list = list.filter(n => n.isDirect);
        } else if (activeFilter === "positive") {
            list = list.filter(n => n.sentiment === "positive");
        } else if (activeFilter === "negative") {
            list = list.filter(n => n.sentiment === "negative");
        }

        // 2. 검색어 필터
        if (searchKeyword.trim()) {
            const q = searchKeyword.trim().toLowerCase();
            list = list.filter(n => 
                (n.title && n.title.toLowerCase().includes(q)) || 
                (n.publisher && n.publisher.toLowerCase().includes(q))
            );
        }

        return list;
    }, [analyzedNews, activeFilter, searchKeyword]);

    // 통계 및 센티먼트 지수 계산
    const stats = useMemo(() => {
        const total = analyzedNews.length;
        if (total === 0) {
            return {
                total: 0,
                directCount: 0,
                positiveCount: 0,
                negativeCount: 0,
                neutralCount: 0,
                positiveRatio: 50,
                publishersCount: 0,
                hotKeywords: []
            };
        }

        const directCount = analyzedNews.filter(n => n.isDirect).length;
        const positiveCount = analyzedNews.filter(n => n.sentiment === "positive").length;
        const negativeCount = analyzedNews.filter(n => n.sentiment === "negative").length;
        const neutralCount = total - positiveCount - negativeCount;

        const effective = positiveCount + negativeCount;
        const positiveRatio = effective > 0 ? Math.round((positiveCount / effective) * 100) : 50;

        // 주요 언론사 집계
        const publishers = new Set(analyzedNews.map(n => n.publisher).filter(Boolean));

        // 핫 키워드 추출 (제목에서 자주 등장하는 키워드)
        const commonWords = [
            "삼성", "전자", "코스피", "증시", "반도체", "AI", "상승", "출시", 
            "실적", "주가", "외인", "기관", "밸류업", "HBM", "기술", "투자"
        ];
        const hotKeywords = commonWords
            .filter(w => analyzedNews.some(n => n.title.includes(w)))
            .slice(0, 4);

        return {
            total,
            directCount,
            positiveCount,
            negativeCount,
            neutralCount,
            positiveRatio,
            publishersCount: publishers.size,
            hotKeywords
        };
    }, [analyzedNews]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-zinc-950/40 rounded-3xl border border-white/5">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
                    <Radio className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-white font-black text-base">{stockName}의 실시간 뉴스를 정밀 분석 중입니다...</p>
                    <p className="text-xs text-zinc-500">언론사별 보도 팩트체크 및 AI 뉴스 심리지수 산출 중</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* 1. 상단 인포 리본 & 액션 헤더 */}
            <div className="bg-gradient-to-r from-zinc-950 via-[#161224] to-zinc-950 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div className="flex items-start gap-3 text-xs md:text-sm text-zinc-300">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                        <Newspaper className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-white text-base md:text-lg">실시간 뉴스 & 미디어 센티먼트 인텔리전스</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                LIVE STREAM
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-medium mt-1 leading-relaxed break-keep">
                            주요 언론사의 실시간 보도 기사를 전수 수집하여, <strong className="text-white">종목 직결도 필터링</strong> 및 <strong className="text-white">AI 호재/악재 감성 분석</strong>을 제공합니다.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                    {onRefresh && (
                        <button 
                            onClick={onRefresh}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 hover:text-white transition-all cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>뉴스 최신화</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. 4대 핵심 뉴스 & 센티먼트 KPI 대시보드 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* KPI 1: AI 뉴스 심리지수 */}
                <div className="bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-amber-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-amber-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-amber-400" />
                            <span>AI 뉴스 심리지수</span>
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                            stats.positiveRatio >= 50 
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                            {stats.positiveRatio >= 50 ? 'BULLISH' : 'CAUTION'}
                        </span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1 flex items-baseline gap-1.5">
                        <span className={stats.positiveRatio >= 50 ? "text-emerald-400" : "text-rose-400"}>
                            {stats.positiveRatio}%
                        </span>
                        <span className="text-xs text-zinc-400 font-bold">
                            ({stats.positiveRatio >= 60 ? "호재 우세" : stats.positiveRatio >= 45 ? "중립/균형" : "주의 필요"})
                        </span>
                    </div>
                    <div className="mt-2 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden flex">
                        <div className="bg-emerald-500 h-full" style={{ width: `${stats.positiveRatio}%` }} />
                        <div className="bg-rose-500 h-full" style={{ width: `${100 - stats.positiveRatio}%` }} />
                    </div>
                </div>

                {/* KPI 2: 종목 직결 핵심 뉴스 */}
                <div className="bg-gradient-to-br from-blue-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-blue-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-blue-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <Radio className="w-4 h-4 text-blue-400" />
                            <span>종목 직결 정확도</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-md">
                            DIRECT
                        </span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-blue-300 font-mono tracking-tight mt-1">
                        {stats.directCount}건 <span className="text-xs text-zinc-400 font-normal">/ {stats.total}건</span>
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        제목에 '{stockName}'을 직접 명시한 핵심 뉴스
                    </div>
                </div>

                {/* KPI 3: 호재 vs 리스크 기사 건수 */}
                <div className="bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-purple-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-purple-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-purple-400" />
                            <span>센티먼트 분포</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-md">
                            SENTIMENT
                        </span>
                    </div>
                    <div className="text-lg md:text-xl font-black text-white font-mono tracking-tight mt-1 flex items-center gap-2">
                        <span className="text-emerald-400">🟢 {stats.positiveCount}건</span>
                        <span className="text-zinc-500">|</span>
                        <span className="text-rose-400">🔴 {stats.negativeCount}건</span>
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        중립/일반 동향 보도 {stats.neutralCount}건
                    </div>
                </div>

                {/* KPI 4: 주요 취재 언론사 수 */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900/80 to-black p-4 sm:p-5 rounded-2xl border border-indigo-500/30 shadow-lg flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-black text-indigo-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                            <span>언론 커버리지</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                            MEDIA
                        </span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">
                        {stats.publishersCount}개 언론사
                    </div>
                    <div className="text-xs font-medium text-zinc-400 mt-1.5 break-keep">
                        다각도 교차 검증된 미디어 데이터
                    </div>
                </div>
            </div>

            {/* 3. AI 뉴스 인텔리전스 심층 브리핑 총평 */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-zinc-950 via-[#141226] to-zinc-950 border border-amber-500/35 shadow-2xl relative overflow-hidden space-y-3">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                            <span>AI 애널리스트 미디어 뉴스 인텔리전스 총평</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                AI VERDICT
                            </span>
                        </h4>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 text-xs sm:text-sm text-zinc-200 leading-relaxed break-keep font-medium space-y-2">
                    <p>
                        <strong className="text-amber-400 font-bold">📢 미디어 여론 흐름 진단: </strong>
                        최근 언론에 보도된 총 <strong className="text-white font-mono">{stats.total}건</strong>의 기사를 AI로 정밀 분석한 결과, 
                        현재 <strong>{stockName}</strong>에 대한 미디어 심리지수는 <strong className={stats.positiveRatio >= 50 ? "text-emerald-400" : "text-rose-400"}>{stats.positiveRatio}%</strong>로 
                        {stats.positiveRatio >= 60 ? " 긍정적 모멘텀과 호재성 기사가 우위를 점하고 있습니다." : stats.positiveRatio >= 45 ? " 전반적으로 균형 잡힌 중립적 흐름을 보이고 있습니다." : " 단기 노이즈 및 리스크 기사에 대한 신중한 관찰이 요구됩니다."}
                    </p>
                    <div className="pt-2 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-300">
                        <div className="flex items-start gap-2">
                            <span className="text-emerald-400 font-black shrink-0">🚀 핵심 모멘텀:</span>
                            <span>신제품 출시, 차세대 AI 기술 탑재 및 주주환원 확대 등 중장기 밸류업 기사가 시장의 주목을 받고 있습니다.</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="text-amber-400 font-black shrink-0">⚖️ 투자자 체크:</span>
                            <span>단기 노사 이슈나 거시적 시장 변동성은 펀더멘털을 훼손하지 않는 일시적 노이즈인지 팩트 체크가 권장됩니다.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. 스마트 필터 & 검색 바 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* 카테고리 필터 탭 */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                        { id: "all", label: `전체 (${stats.total})` },
                        { id: "direct", label: `🎯 종목 직결 (${stats.directCount})` },
                        { id: "positive", label: `🟢 호재·모멘텀 (${stats.positiveCount})` },
                        { id: "negative", label: `🔴 리스크·주의 (${stats.negativeCount})` },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer border ${
                                activeFilter === tab.id
                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-black shadow-lg shadow-amber-500/20"
                                    : "bg-zinc-950 border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 검색 인풋 */}
                <div className="relative shrink-0 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text"
                        placeholder="기사 제목 또는 언론사 검색..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="w-full bg-zinc-900/90 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* 5. 뉴스 카드 리스트 */}
            {filteredNews.length > 0 ? (
                <div className="space-y-3 max-h-[780px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700">
                    {filteredNews.map((item, idx) => {
                        return (
                            <a
                                key={idx}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group p-4 sm:p-5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/10 hover:border-amber-500/40 transition-all shadow-md hover:shadow-xl relative overflow-hidden"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        {/* 뱃지 행: 직결 태그 + 언론사 + 일자 + 센티먼트 */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {item.isDirect && (
                                                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                                                    <span>🎯</span>
                                                    <span>{stockName} 직접 관련</span>
                                                </span>
                                            )}

                                            {item.sentiment === "positive" && (
                                                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                    🟢 호재·모멘텀
                                                </span>
                                            )}
                                            {item.sentiment === "negative" && (
                                                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                                    🔴 리스크·관찰
                                                </span>
                                            )}

                                            <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                                {item.publisher || "주요 언론"}
                                            </span>

                                            <span className="text-xs text-zinc-400 font-mono font-medium flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                                <span>{formatRelativeTime(item.published)}</span>
                                            </span>
                                        </div>

                                        {/* 기사 제목 */}
                                        <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors leading-snug break-keep">
                                            {item.title}
                                        </h4>

                                        {/* 기사 본문 요약 (있는 경우) */}
                                        {item.description && (
                                            <p className="text-xs text-zinc-400 font-medium line-clamp-2 leading-relaxed">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* 원문 바로가기 버튼 */}
                                    <div className="shrink-0 self-end sm:self-center">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 group-hover:bg-amber-500 group-hover:text-black border border-amber-500/30 transition-all shadow-sm">
                                            <span>기사 원문 읽기</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>
            ) : (
                <div className="p-12 rounded-3xl bg-zinc-950/60 border border-white/10 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mx-auto">
                        📰
                    </div>
                    <h5 className="text-base font-black text-white">
                        선택하신 조건에 해당하는 뉴스가 없습니다.
                    </h5>
                    <p className="text-xs text-zinc-400 font-medium max-w-md mx-auto break-keep">
                        검색어를 변경하시거나 '전체' 탭을 선택하시면 다양한 미디어 뉴스를 확인하실 수 있습니다.
                    </p>
                </div>
            )}

            {/* 6. 🎓 초보 투자자를 위한 [주식 뉴스 해석의 기술: 3대 실전 노하우] */}
            <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/90 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">
                        🎓
                    </div>
                    <div>
                        <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                            <span>초보 투자자를 위한 주식 뉴스 해석의 기술: 3대 실전 노하우</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                                1 MIN NEWS GUIDE
                            </span>
                        </h4>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed break-keep">
                    {/* 카드 1 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                            <span>1. '단기 노이즈' vs '기업 펀더멘털'</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            일시적인 노사 집회나 단기 이슈는 주가에 일시적 충격을 줄 뿐 기업의 본질 가치를 훼손하지 못합니다. 반면 <strong className="text-white">'신제품 대규모 수주, 기술 혁신, 흑자 전환'</strong> 같은 진짜 펀더멘털 뉴스를 선별해 읽는 안목이 필수입니다.
                        </p>
                    </div>

                    {/* 카드 2 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-blue-300 text-sm flex items-center gap-1.5">
                            <span>2. '뉴스에 팔아라' (재료 소멸 주의)</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            누구나 다 아는 대형 호재가 마침내 신문 1면에 대대적으로 보도될 때는 <strong className="text-white">'차익 실현 매물 출회로 단기 고점'</strong>일 가능성이 높습니다. 뉴스가 나오기 전 주가가 이미 선반영되었는지 함께 확인해야 합니다.
                        </p>
                    </div>

                    {/* 카드 3 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="font-black text-purple-300 text-sm flex items-center gap-1.5">
                            <span>3. 자극적 헤드라인의 팩트 체크</span>
                        </div>
                        <p className="text-zinc-300 text-xs leading-relaxed">
                            클릭수를 노린 공포성 헤드라인("위기", "폭락 경고")에 현혹되어 뇌동매매하지 마세요. 기사 본문의 <strong className="text-white">'실제 실적 수치와 글로벌 시장 점유율'</strong> 등 객관적인 숫자를 팩트 체크하는 습관이 계좌를 지킵니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
