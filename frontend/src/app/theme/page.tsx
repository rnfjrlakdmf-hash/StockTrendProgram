"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import KakaoAdFit from "@/components/KakaoAdFit";
import SeoContentBlock from "@/components/SeoContentBlock";
import { API_BASE_URL } from "@/lib/config";
import { 
    Search, Loader2, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, 
    Layers, Sparkles, Info, X, Zap, Flame, BarChart3, Clock, 
    ShieldCheck, AlertOctagon, RefreshCw, LayoutGrid, Table, 
    ExternalLink, ChevronRight, Activity, Award, CheckCircle2, Shield
} from "lucide-react";
import CleanStockList from "@/components/CleanStockList";
import { useAuth } from "@/context/AuthContext";
import KakaoShareButton from "@/components/KakaoShareButton";
import { TrendingThemesSkeleton, ThemeAnalysisSkeleton } from "@/components/SkeletonCard";

// [Cache System] Ultra-fast navigation for Themes
const THEME_CACHE: Record<string, { data: any, timestamp: number, quotes?: Record<string, any> }> = {};
const TRENDING_CACHE: { data: any[], timestamp: number } = { data: [], timestamp: 0 };
const CACHE_DURATION = 60 * 1000 * 5; // 5 minute cache


function StockCardItem({ 
    stock, 
    idx, 
    router, 
    isFollower = false, 
    unifiedRank, 
    isUnifiedSort = false 
}: { 
    stock: any; 
    idx: number; 
    router: any; 
    isFollower?: boolean; 
    unifiedRank?: number; 
    isUnifiedSort?: boolean; 
}) {
    const isLeader = stock.isLeader;
    
    return (
        <div
            className={`p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-zinc-900/95 to-zinc-950 border transition-all hover:-translate-y-1 shadow-xl group flex flex-col justify-between gap-4 relative overflow-hidden ${
                stock.is_real 
                    ? 'border-emerald-500/30 hover:border-emerald-400/70 shadow-[0_4px_20px_rgba(16,185,129,0.08)]' 
                    : isLeader 
                    ? 'border-orange-500/30 hover:border-orange-400/70' 
                    : 'border-white/10 hover:border-blue-500/50'
            }`}
        >
            {/* Top Row: Rank Badge, Stock Name, Real Badge & Price */}
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isUnifiedSort ? (
                            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm ${
                                unifiedRank === 1 ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black ring-2 ring-amber-400/30' :
                                unifiedRank === 2 ? 'bg-slate-300 text-black font-black' :
                                unifiedRank === 3 ? 'bg-amber-700 text-white font-bold' :
                                'bg-white/10 text-zinc-300 font-mono'
                            }`}>
                                {unifiedRank === 1 ? '👑 1위' : unifiedRank === 2 ? '🥈 2위' : unifiedRank === 3 ? '🥉 3위' : `#${unifiedRank}위`}
                            </span>
                        ) : isFollower ? (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                ⚡ 후발/관련주
                            </span>
                        ) : (
                            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm ${
                                idx === 0 ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black ring-2 ring-amber-400/30' :
                                idx === 1 ? 'bg-slate-300 text-black font-black' :
                                'bg-amber-700 text-white font-bold'
                            }`}>
                                {idx === 0 ? '👑 1대장' : idx === 1 ? '🥈 2대장' : '🥉 3대장'}
                            </span>
                        )}

                        {isLeader && isUnifiedSort && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                대장주
                            </span>
                        )}
                        
                        {stock.is_real ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" /> 찐수혜 검증
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                <AlertOctagon className="w-3 h-3 text-amber-400" /> 테마 편승주의
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-lg md:text-xl font-black text-white group-hover:text-amber-300 transition-colors">
                            {stock.name}
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-400 bg-white/10 px-2 py-0.5 rounded-md">
                            {stock.symbol}
                        </span>
                    </div>
                </div>

                {/* Price Block */}
                <div className="text-right shrink-0">
                    <div className="text-lg md:text-xl font-black text-white font-mono">
                        {stock.price !== '-' ? `${stock.price}원` : '-'}
                    </div>
                    <div className={`text-xs font-black font-mono tracking-tight ${
                        stock.isPositive ? 'text-rose-400' : stock.isNegative ? 'text-sky-400' : 'text-zinc-400'
                    }`}>
                        {stock.change}
                    </div>
                </div>
            </div>

            {/* Reason Text */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/5 text-xs text-zinc-300 leading-relaxed font-medium">
                💡 {stock.reason || "해당 테마와 사업 연관성이 확인된 종목입니다."}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                    onClick={() => router.push(`/discovery?q=${stock.symbol}`)}
                    className="py-2.5 px-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                >
                    <span>실시간 캔들차트</span>
                    <ExternalLink className="w-3 h-3" />
                </button>
                <button
                    onClick={() => router.push(`/stock/${stock.symbol}`)}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-200 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                >
                    <span>수급·재무 분석</span>
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

function ThemePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const [quotes, setQuotes] = useState<Record<string, any>>({});
    const [showHelp, setShowHelp] = useState(false);
    const [viewMode, setViewMode] = useState<"card" | "table">("card");
    const [sortBy, setSortBy] = useState<"default" | "change" | "real">("default");
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setKeyword(q);
            handleAnalyze(q);
        }
    }, [searchParams]);

    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("theme_recent_searches");
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
        } catch {}
    }, []);

    const saveRecentSearch = (kw: string) => {
        if (!kw || typeof kw !== "string") return;
        try {
            const updated = [kw, ...recentSearches.filter(s => s !== kw)].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem("theme_recent_searches", JSON.stringify(updated));
        } catch {}
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        try {
            localStorage.removeItem("theme_recent_searches");
        } catch {}
    };

    const cleanThemeTitle = (name: string) => {
        if (!name) return "";
        return name
            .replace(/\(비트코인 등\)/g, "(가상자산)")
            .replace(/\(삼성전자\/SK하이닉스.*?\)/g, "(반도체 대형주)")
            .replace(/테마/g, "")
            .trim();
    };

    const handleAnalyze = async (overrideKeyword?: any) => {
        const searchKeyword = typeof overrideKeyword === 'string' ? overrideKeyword : keyword;
        if (!searchKeyword) return;
        
        saveRecentSearch(searchKeyword);
        setLoading(true);
        setError("");

        // [Instant Load] Check global THEME_CACHE first
        const cachedData = THEME_CACHE[searchKeyword];
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
            setResult(cachedData.data);
            if (cachedData.quotes) {
                setQuotes(cachedData.quotes);
            }
            setLoading(false);
            return;
        }

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/theme/${encodeURIComponent(searchKeyword)}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId); // Clear timeout if request completes

            // [Fix] Check response status
            if (!res.ok) {
                setError("분석 정보를 불러오지 못했습니다. 키워드를 변경해보세요.");
                setLoading(false);
                return;
            }

            const json = await res.json();

            if (json.status === "success" && json.data) {
                // Fetch quotes instantly using the multi-quote endpoint
                let newQuotes = {};
                const allSymbols = [
                    ...(json.data.leaders || []).map((s: any) => s.symbol),
                    ...(json.data.followers || []).map((s: any) => s.symbol)
                ];

                if (allSymbols.length > 0) {
                    try {
                        const quoteRes = await fetch(`${API_BASE_URL}/api/market/stock/quotes/multi?symbols=${allSymbols.join(',')}`);
                        const quoteJson = await quoteRes.json();
                        if (quoteJson.status === "success" && quoteJson.data) {
                            newQuotes = quoteJson.data;
                            setQuotes(newQuotes);
                        }
                    } catch (e) {
                        console.error("Failed to fetch multi quotes:", e);
                    }
                }

                setResult(json.data);
                THEME_CACHE[searchKeyword] = { data: json.data, quotes: newQuotes, timestamp: Date.now() };
            } else {
                setError(json.message || "분석 정보를 불러오지 못했습니다. 키워드를 변경해보세요.");
            }
        } catch (err: any) {
            clearTimeout(timeoutId);

            // Handle timeout specifically
            if (err.name === 'AbortError') {
                setError("요청 시간이 초과되었습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.");
            } else {
                setError("서버 연결에 실패했습니다.");
            }
        } finally {
            setLoading(false);
        }
    };


    const [trendingThemes, setTrendingThemes] = useState<any[]>(TRENDING_CACHE.data || []);

    useEffect(() => {
        const fetchTrending = async (force = false) => {
            if (!force && TRENDING_CACHE.data.length > 0 && (Date.now() - TRENDING_CACHE.timestamp < CACHE_DURATION)) {
                return; // Use cache
            }
            try {
                // [Fix] 실시간 테마 및 인기 검색 키워드 수집 (상세 데이터 포함)
                const res = await fetch(`${API_BASE_URL}/api/market/rank/themes`);
                const json = await res.json();
                if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
                    setTrendingThemes(json.data); 
                    TRENDING_CACHE.data = json.data;
                    TRENDING_CACHE.timestamp = Date.now();
                }
            } catch (err) {
                console.error("Failed to fetch trending themes:", err);
            }
        };
        fetchTrending(false);
        
        // 1분마다 실시간 인기 검색어 갱신
        const interval = setInterval(() => fetchTrending(true), 60000);
        return () => clearInterval(interval);
    }, []);

    // [New] URL 파라미터 q= 검색어 자동 실행 (푸시 알림 딥링크용)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const q = params.get('q');
            if (q) {
                setKeyword(q);
                handleAnalyze(q);
            }
        }
    }, []);

    // [New] Prefetch function for hover optimization
    const prefetchTheme = async (themeName: string) => {
        if (!themeName) return;
        if (THEME_CACHE[themeName]) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/theme/${encodeURIComponent(themeName)}`);
            if (res.ok) {
                const json = await res.json();
                if (json.status === "success" && json.data) {
                    // Prefetch quotes as well to make it truly instant
                    const allSymbols = [
                        ...(json.data.leaders || []).map((s: any) => s.symbol),
                        ...(json.data.followers || []).map((s: any) => s.symbol)
                    ];
                    let prefetchedQuotes = {};
                    if (allSymbols.length > 0) {
                        try {
                            const quoteRes = await fetch(`${API_BASE_URL}/api/market/stock/quotes/multi?symbols=${allSymbols.join(',')}`);
                            const quoteJson = await quoteRes.json();
                            if (quoteJson.status === "success" && quoteJson.data) {
                                prefetchedQuotes = quoteJson.data;
                            }
                        } catch (e) {}
                    }
                    THEME_CACHE[themeName] = { data: json.data, quotes: prefetchedQuotes, timestamp: Date.now() };
                }
            }
        } catch (e) {
            console.error("Prefetch error:", e);
        }
    };

    // [테마 종합 통계 계산]
    const themeStats = useMemo(() => {
        if (!result) return null;
        const all = [...(result.leaders || []), ...(result.followers || [])];
        let totalChange = 0;
        let validCount = 0;
        let upCount = 0;
        let downCount = 0;
        let realCount = 0;
        let topGainer: any = null;
        let maxChange = -999;

        all.forEach((s: any) => {
            if (s.is_real) realCount++;
            const q = quotes[s.symbol];
            const changeStr = s.change || q?.change || q?.change_percent || "0";
            const num = parseFloat(String(changeStr).replace(/[+%▲▼,]/g, ""));
            if (!isNaN(num)) {
                totalChange += num;
                validCount++;
                if (num > 0) upCount++;
                else if (num < 0) downCount++;

                if (num > maxChange) {
                    maxChange = num;
                    topGainer = { 
                        ...s, 
                        changeNum: num, 
                        price: s.price || q?.price || "-",
                        changeStr: s.change || q?.change || "0.00%"
                    };
                }
            }
        });

        const avgChangeVal = validCount > 0 ? (totalChange / validCount) : 0;
        const avgChangeStr = `${avgChangeVal > 0 ? '+' : ''}${avgChangeVal.toFixed(2)}%`;
        const leader1 = result.leaders && result.leaders.length > 0 ? result.leaders[0] : null;
        const leader1Quote = leader1 ? quotes[leader1.symbol] : null;

        return {
            avgChangeStr,
            avgChangeVal,
            upCount,
            downCount,
            totalCount: all.length,
            realCount,
            topGainer,
            leader1: leader1 ? {
                ...leader1,
                price: leader1.price || leader1Quote?.price || "-",
                change: leader1.change || leader1Quote?.change || "0.00%"
            } : null
        };
    }, [result, quotes]);

    // [종목 데이터 포맷팅 및 정렬 매트릭스]
    const processedStocks = useMemo(() => {
        if (!result) return { leaders: [], followers: [], allSorted: [] };
        
        const formatStock = (s: any, isLeader: boolean, rank: number) => {
            const q = quotes[s.symbol];
            const price = s.price || q?.price || "-";
            const change = s.change || q?.change || q?.change_percent || "0.00%";
            const changeNum = parseFloat(String(change).replace(/[+%▲▼,]/g, "")) || 0;
            const isPositive = String(change).startsWith('+') || changeNum > 0;
            const isNegative = String(change).startsWith('-') || changeNum < 0;
            return {
                ...s,
                isLeader,
                rank,
                price,
                change,
                changeNum,
                isPositive,
                isNegative,
                marketStatus: q?.market_status || "정규"
            };
        };

        let leaders = (result.leaders || []).map((s: any, i: number) => formatStock(s, true, i + 1));
        let followers = (result.followers || []).map((s: any, i: number) => formatStock(s, false, i + 1));

        if (sortBy === "change") {
            leaders.sort((a, b) => b.changeNum - a.changeNum);
            followers.sort((a, b) => b.changeNum - a.changeNum);
        } else if (sortBy === "real") {
            leaders.sort((a, b) => (b.is_real ? 1 : 0) - (a.is_real ? 1 : 0) || b.changeNum - a.changeNum);
            followers.sort((a, b) => (b.is_real ? 1 : 0) - (a.is_real ? 1 : 0) || b.changeNum - a.changeNum);
        }

        const all = [...leaders, ...followers];
        if (sortBy === "change") {
            all.sort((a, b) => b.changeNum - a.changeNum);
        } else if (sortBy === "real") {
            all.sort((a, b) => (b.is_real ? 1 : 0) - (a.is_real ? 1 : 0) || b.changeNum - a.changeNum);
        }

        return { leaders, followers, allSorted: all };
    }, [result, quotes, sortBy]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleAnalyze();
    };

    return (
        <div className="min-h-screen pb-20 text-white bg-zinc-950">
            <Header title="실시간 주도 테마 레이더 (테마 발굴)" subtitle="시장 주도 테마와 대장주를 한눈에 파악하세요." />

            <div className="max-w-4xl mx-auto p-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* 상단 띠배너 광고 (모바일: 320x50, PC: 728x90) */}
                <div className="flex md:hidden justify-center -mt-2 mb-4">
                    <KakaoAdFit adUnit="DAN-g3wzyZlZ4hBiYyRA" adWidth="320" adHeight="50" />
                </div>
                <div className="hidden md:flex justify-center -mt-2 mb-4">
                    <KakaoAdFit adUnit="DAN-eeR4RhnpmQaeIlYm" adWidth="728" adHeight="90" />
                </div>
                {/* Search Hero - Ultra Luxury VIP Design */}
                <div className="text-center space-y-8 py-8 relative overflow-hidden">
                    {/* Background Radial Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-gradient-to-r from-orange-600/15 via-amber-500/10 to-yellow-600/15 blur-[120px] rounded-full pointer-events-none -z-10"></div>

                    {/* Top VIP Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-orange-400 text-xs font-black shadow-lg shadow-orange-500/10 backdrop-blur-md">
                        <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                        <span>AI 실시간 주도 테마 & 대장주 발굴 레이더</span>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight flex items-center justify-center gap-2 flex-wrap">
                            <span>실시간 주도 테마 레이더</span>
                            <span className="text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 font-bold">(테마발굴)</span>
                        </h2>
                        <button 
                            onClick={() => setShowHelp(true)}
                            className="p-2 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-orange-400/50 rounded-full transition-all text-gray-400 hover:text-orange-300 shadow-lg"
                            title="화면 설명 보기"
                        >
                            <Info className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-gray-300 text-sm sm:text-base md:text-lg font-medium tracking-wide max-w-2xl mx-auto leading-relaxed">
                        관심있는 테마 키워드를 입력하면 <span className="text-orange-400 font-bold bg-orange-400/10 px-2 py-0.5 rounded-md border border-orange-500/20">대장주와 핵심 리스크</span>를 즉각적으로 분석합니다.
                    </p>

                    {/* 럭셔리 글래스모피즘 검색창 */}
                    <div className="relative max-w-2xl mx-auto group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/30 via-amber-500/30 to-yellow-500/30 rounded-3xl blur-lg opacity-40 group-hover:opacity-80 transition duration-500"></div>
                        <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10">
                                <Search className="h-6 w-6 text-orange-400/90" />
                            </div>
                            <input
                                type="text"
                                placeholder="예: 비만치료제, 온디바이스AI, 전력기기, 2차전지..."
                                className="w-full h-16 pl-16 pr-28 bg-zinc-950/80 backdrop-blur-2xl border border-white/15 focus:border-orange-400 rounded-2xl text-base sm:text-lg md:text-xl font-bold outline-none focus:ring-2 focus:ring-orange-500/30 transition-all text-white placeholder-zinc-500 shadow-inner"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="absolute right-2 top-2 bottom-2 px-6 flex items-center justify-center bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl font-black transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.7)] disabled:opacity-50 disabled:shadow-none cursor-pointer active:scale-95 z-10"
                            >
                                {loading ? <Loader2 className="animate-spin text-white w-6 h-6" /> : <ArrowRight className="text-white w-6 h-6 stroke-[3]" />}
                            </button>
                        </div>
                    </div>

                    {/* 추천 핫 테마 칩 & 최근 검색어 */}
                    <div className="max-w-2xl mx-auto space-y-2">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap text-xs">
                            <span className="text-zinc-500 font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400" /> 인기 추천:
                            </span>
                            {['온디바이스AI', '전력기기', '비만치료제', '2차전지', 'CXL반도체', '휴머노이드'].map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setKeyword(s);
                                        handleAnalyze(s);
                                    }}
                                    className="px-2.5 py-1 bg-white/5 hover:bg-orange-500/20 hover:text-orange-300 border border-white/10 hover:border-orange-500/30 rounded-xl text-zinc-300 transition-all font-medium active:scale-95"
                                >
                                    #{s}
                                </button>
                            ))}
                        </div>

                        {recentSearches.length > 0 && (
                            <div className="flex items-center justify-between text-xs text-zinc-400 px-1 pt-1 border-t border-white/5 flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-zinc-500">최근 검색:</span>
                                    {recentSearches.map((s, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setKeyword(s);
                                                handleAnalyze(s);
                                            }}
                                            className="px-2 py-0.5 bg-white/5 hover:bg-white/15 rounded-lg text-zinc-300 hover:text-white transition-colors"
                                        >
                                            #{s}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={clearRecentSearches}
                                    className="text-zinc-500 hover:text-zinc-300 underline text-[11px]"
                                >
                                    기록 지우기
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 🏆 TOP 10 실시간 인기 테마 섹션 (Luxury VIP Grid) */}
                    <div className="pt-8 w-full max-w-5xl mx-auto">
                        <div className="flex items-center justify-between gap-2 mb-4 px-1 pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                    <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                                </div>
                                <h3 className="text-white font-black text-sm sm:text-base tracking-wide">
                                    실시간 인기 테마 TOP 10
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[11px] text-zinc-400 font-mono font-medium">
                                    1분 주기 실시간 자동 갱신
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {trendingThemes.length === 0 ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className="skeleton-shimmer rounded-2xl h-24" />
                                ))
                            ) : (
                            trendingThemes.slice(0, 10).map((t, idx) => {
                                const rawName = typeof t === 'string' ? t : t.name;
                                const cleanName = cleanThemeTitle(rawName);
                                const isTop1 = idx === 0;
                                const isTop2 = idx === 1;
                                const isTop3 = idx === 2;
                                const isTop3Group = idx < 3;
                                
                                return (
                                    <button
                                        key={idx}
                                        onMouseEnter={() => prefetchTheme(rawName)}
                                        onClick={() => { 
                                            setKeyword(rawName); 
                                            handleAnalyze(rawName); 
                                        }}
                                        className={`group relative p-4 rounded-2xl transition-all duration-300 text-left overflow-hidden flex flex-col justify-between h-full min-h-[102px] active:scale-95 shadow-lg ${
                                            isTop1 
                                                ? 'bg-gradient-to-br from-amber-950/50 via-zinc-900/90 to-yellow-950/40 border border-amber-400/50 hover:border-amber-300 shadow-[0_4px_25px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/20' 
                                                : isTop2
                                                ? 'bg-gradient-to-br from-slate-900/80 via-zinc-900/90 to-zinc-950 border border-slate-400/40 hover:border-slate-300 shadow-[0_4px_20px_rgba(148,163,184,0.1)]'
                                                : isTop3
                                                ? 'bg-gradient-to-br from-amber-950/40 via-zinc-900/90 to-zinc-950 border border-amber-600/40 hover:border-amber-500 shadow-[0_4px_20px_rgba(217,119,6,0.1)]'
                                                : 'bg-zinc-900/70 backdrop-blur-md border border-white/10 hover:border-orange-500/40 hover:bg-zinc-900/90'
                                        } hover:-translate-y-1`}
                                    >
                                        <div className="flex justify-between items-center mb-2 z-10 w-full">
                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm ${
                                                isTop1 ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black ring-2 ring-amber-400/30' :
                                                isTop2 ? 'bg-slate-300 text-black font-black' :
                                                isTop3 ? 'bg-amber-600 text-white font-bold' :
                                                'bg-white/5 text-zinc-400 font-mono border border-white/5 group-hover:text-zinc-200'
                                            }`}>
                                                {isTop1 ? '👑 1위' : isTop2 ? '🥈 2위' : isTop3 ? '🥉 3위' : `${String(idx + 1).padStart(2, '0')}`}
                                            </span>
                                            {typeof t !== 'string' && t.change && (
                                                <span className={`text-[12px] font-black font-mono tracking-tight ${
                                                    (t.change.includes('+') || !t.change.includes('-')) && t.change !== '0.00%' 
                                                        ? 'text-rose-400' 
                                                        : 'text-sky-400'
                                                }`}>
                                                    {t.change.startsWith('+') ? t.change : `+${t.change}`}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="z-10 flex flex-col w-full space-y-0.5">
                                            <span className="font-black text-white group-hover:text-amber-300 text-sm transition-colors truncate w-full" title={rawName}>
                                                {cleanName}
                                            </span>
                                            {typeof t !== 'string' && t.desc && (
                                                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 line-clamp-1 transition-colors w-full">
                                                    {t.desc}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-center">
                        {error}
                    </div>
                )}

                {/* Help Modal */}
                {showHelp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 relative shadow-2xl">
                            <button 
                                onClick={() => setShowHelp(false)}
                                className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                                <Info className="w-6 h-6 text-orange-400" />
                                화면 설명서
                            </h3>
                            
                            <div className="space-y-6 text-sm text-gray-300 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2 border-b border-white/10 pb-2">⏰ 거래 시간별 주가 표시</h4>
                                    <ul className="space-y-3 mt-3">
                                        <li className="flex items-start gap-2">
                                            <span className="font-mono text-xs bg-gray-800 px-1.5 py-0.5 rounded shrink-0 mt-0.5">[정규]</span>
                                            <span><strong>정규장 (09:00 ~ 15:30)</strong> 동안 형성된 종가를 의미합니다. 장이 마감된 이후에도 정규장 기준 등락률을 고정하여 보여줍니다.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="font-mono text-xs bg-gray-800 px-1.5 py-0.5 rounded shrink-0 mt-0.5">[시간외]</span>
                                            <span><strong>시간외 단일가 (16:00 ~ 18:00)</strong> 거래에서 발생한 주가 등락률입니다. 정규장 마감 이후의 호재/악재를 반영합니다.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="font-mono text-xs bg-gray-800 px-1.5 py-0.5 rounded shrink-0 mt-0.5">[야간]</span>
                                            <span><strong>NXT 야간거래 (18:00 ~ 23:50)</strong> 거래에서 발생한 주가 등락률입니다.</span>
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2 border-b border-white/10 pb-2">🏅 종목 뱃지 설명</h4>
                                    <ul className="space-y-3 mt-3">
                                        <li className="flex items-start gap-2">
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/50 mt-0.5">
                                                <span>🥇</span><span>찐수혜</span>
                                            </div>
                                            <span>테마와 <strong>실제적인 사업 연관성이나 매출</strong>이 발생하고 있는 진짜 수혜주입니다.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 bg-gray-500/20 text-gray-400 border-gray-500/50 mt-0.5">
                                                <span>💩</span><span>주의</span>
                                            </div>
                                            <span>실질적인 사업 연관성이 없거나 단순한 <strong>단기 테마 편승(루머)</strong>일 가능성이 높은 주의 종목입니다.</span>
                                        </li>
                                    </ul>
                                </div>
                                
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2 border-b border-white/10 pb-2">⏳ 테마 라이프사이클 시계</h4>
                                    <p className="mb-2">AI가 분석한 현재 테마의 진행 단계를 시계로 표현합니다.</p>
                                    <ul className="space-y-2 text-xs">
                                        <li><span className="text-blue-400 font-bold">오전 (태동기):</span> 주목받기 시작하는 초기 단계. 잠재력이 높으나 불확실성도 큽니다.</li>
                                        <li><span className="text-red-400 font-bold">점심 (성장/과열):</span> 시장의 관심이 집중되며 가격이 급등하는 구간. 변동성이 극대화됩니다.</li>
                                        <li><span className="text-orange-400 font-bold">저녁 (성숙기):</span> 대장주 위주로 자리가 잡히며 상승 탄력이 둔화되는 시기.</li>
                                        <li><span className="text-gray-400 font-bold">밤 (쇠퇴기):</span> 테마의 재료가 소멸되어 가격이 제자리로 돌아가는 소외 구간.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Analysis Loading Skeleton */}
                {loading && (
                    <ThemeAnalysisSkeleton />
                )}

                {/* Analysis Result - Ultra Luxury VIP Intelligence Dashboard */}
                {result && !loading && (
                    <div className="space-y-8 animate-in zoom-in-95 duration-500 text-left">
                        
                        {/* 1. 럭셔리 VIP 테마 종합 인텔리전스 헤더 & 4대 정량 지표 */}
                        <div className="p-6 sm:p-8 md:p-10 rounded-3xl bg-gradient-to-br from-orange-950/60 via-zinc-900/90 to-zinc-950 border border-orange-500/40 relative overflow-hidden shadow-2xl space-y-7 ring-1 ring-orange-500/20 backdrop-blur-2xl">
                            <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Header Row: Title & Action Buttons */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 text-orange-300 text-xs font-black uppercase tracking-wider shadow-md">
                                        <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                                        <span>AI 퀀트 테마 심층 인텔리전스</span>
                                    </div>
                                    <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3 flex-wrap">
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400">#{result.theme}</span>
                                        <span className="text-sm sm:text-base font-bold text-zinc-400 bg-white/5 px-3 py-1 rounded-xl border border-white/10">
                                            실시간 테마 리포트
                                        </span>
                                    </h3>
                                </div>

                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <button
                                        onClick={() => handleAnalyze(result.theme)}
                                        className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/15 text-zinc-200 hover:text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md"
                                    >
                                        <RefreshCw className="w-4 h-4 text-orange-400" />
                                        <span>실시간 시세 갱신</span>
                                    </button>
                                    <KakaoShareButton 
                                        title={`🔥 [실시간 주도 테마] ${result.theme} 대장주 & 수급 분석`}
                                        description={result.description || "AI가 정밀 분석한 이 테마의 핵심 대장주와 리스크 요인을 확인하세요."}
                                        url={`https://stock-trend-program.co.kr/theme?q=${result.theme}`}
                                        className="bg-gradient-to-r from-[#FEE500] to-[#FADA0A] hover:brightness-105 text-black px-5 py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#FEE500]/20 cursor-pointer active:scale-95 border border-yellow-400/50"
                                        buttonText="테마 분석 카톡 공유"
                                    />
                                </div>
                            </div>

                            {/* 테마 개요 설명 박스 */}
                            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2 relative z-10">
                                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-widest block">THEME SYNOPSIS</span>
                                <p className="text-sm sm:text-base text-zinc-200 leading-relaxed font-medium">
                                    {result.description}
                                </p>
                            </div>

                            {/* 4대 핵심 정량 지표 매트릭스 카드 (4-Column Matrix) */}
                            {themeStats && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 relative z-20 pt-1">
                                    {/* 지표 1: 평균 등락률 */}
                                    <div 
                                        onClick={() => setActiveTooltip(activeTooltip === "avgChange" ? null : "avgChange")}
                                        onMouseEnter={() => setActiveTooltip("avgChange")}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="p-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-orange-500/50 backdrop-blur-md relative cursor-pointer group transition-all shadow-lg"
                                    >
                                        <div className="text-xs text-zinc-400 font-bold flex items-center justify-between gap-1 mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Activity className="w-4 h-4 text-orange-400" /> 
                                                <span>테마 평균 등락률</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded-full font-mono group-hover:text-orange-400 group-hover:bg-orange-500/20 transition-colors">?</span>
                                        </div>
                                        <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                                            themeStats.avgChangeVal > 0 ? 'text-rose-400' : themeStats.avgChangeVal < 0 ? 'text-sky-400' : 'text-zinc-200'
                                        }`}>
                                            {themeStats.avgChangeStr}
                                        </div>
                                        <span className="text-[10px] text-zinc-500 mt-1 block">전체 종목 가중평균</span>

                                        {activeTooltip === "avgChange" && (
                                            <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-60 sm:w-64 p-3.5 rounded-2xl bg-zinc-900 border border-orange-500/50 shadow-2xl text-left z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="text-xs font-black text-orange-400 mb-1 flex items-center gap-1">
                                                    <span>📈 테마 평균 등락률이란?</span>
                                                </div>
                                                <p className="text-xs text-zinc-300 leading-relaxed">
                                                    해당 테마에 편입된 모든 종목의 실시간 평균 상승/하락률입니다. 시장 전체 대비 테마의 수급 강도를 나타냅니다.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 지표 2: 수급 상승/하락비율 */}
                                    <div 
                                        onClick={() => setActiveTooltip(activeTooltip === "upDown" ? null : "upDown")}
                                        onMouseEnter={() => setActiveTooltip("upDown")}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="p-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-emerald-500/50 backdrop-blur-md relative cursor-pointer group transition-all shadow-lg"
                                    >
                                        <div className="text-xs text-zinc-400 font-bold flex items-center justify-between gap-1 mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <TrendingUp className="w-4 h-4 text-emerald-400" /> 
                                                <span>수급 상승/하락</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded-full font-mono group-hover:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">?</span>
                                        </div>
                                        <div className="text-lg sm:text-xl font-black font-mono text-white">
                                            <span className="text-rose-400">{themeStats.upCount} 상승</span>
                                            <span className="text-zinc-500 text-xs"> / </span>
                                            <span className="text-sky-400">{themeStats.downCount} 하락</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 mt-1 block">상승 우위 수급 확산도</span>

                                        {activeTooltip === "upDown" && (
                                            <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-60 sm:w-64 p-3.5 rounded-2xl bg-zinc-900 border border-emerald-500/50 shadow-2xl text-left z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="text-xs font-black text-emerald-400 mb-1 flex items-center gap-1">
                                                    <span>⚖️ 수급 확산 강도</span>
                                                </div>
                                                <p className="text-xs text-zinc-300 leading-relaxed">
                                                    테마 내 상승 종목 수가 압도적일수록 테마의 연속성과 폭발력이 길게 유지됩니다.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 지표 3: 1대장 리딩 종목 */}
                                    <div 
                                        onClick={() => setActiveTooltip(activeTooltip === "leader" ? null : "leader")}
                                        onMouseEnter={() => setActiveTooltip("leader")}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="p-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-yellow-500/50 backdrop-blur-md relative cursor-pointer group transition-all shadow-lg"
                                    >
                                        <div className="text-xs text-zinc-400 font-bold flex items-center justify-between gap-1 mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Award className="w-4 h-4 text-yellow-400" /> 
                                                <span>1대장 리딩 종목</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded-full font-mono group-hover:text-yellow-400 group-hover:bg-yellow-500/20 transition-colors">?</span>
                                        </div>
                                        <div className="text-base sm:text-lg font-black text-white truncate flex items-center justify-between" title={themeStats.leader1?.name || '-'}>
                                            <span className="truncate">{themeStats.leader1?.name || '-'}</span>
                                            {themeStats.leader1?.change && (
                                                <span className={`text-xs font-mono font-bold shrink-0 ml-1 ${
                                                    String(themeStats.leader1.change).includes('+') ? 'text-rose-400' : 'text-sky-400'
                                                }`}>
                                                    {themeStats.leader1.change}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-zinc-500 mt-1 block">시장 대장주 견인력</span>

                                        {activeTooltip === "leader" && (
                                            <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-60 sm:w-64 p-3.5 rounded-2xl bg-zinc-900 border border-yellow-500/50 shadow-2xl text-left z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="text-xs font-black text-yellow-400 mb-1 flex items-center gap-1">
                                                    <span>👑 1대장 리딩 종목</span>
                                                </div>
                                                <p className="text-xs text-zinc-300 leading-relaxed">
                                                    테마의 자금과 거래량을 가장 먼저 선도하는 대장주입니다. 1대장이 무너지면 테마 전체가 꺾이므로 항상 1대장의 호가를 먼저 살펴야 합니다.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 지표 4: 실수혜 검증 비율 */}
                                    <div 
                                        onClick={() => setActiveTooltip(activeTooltip === "real" ? null : "real")}
                                        onMouseEnter={() => setActiveTooltip("real")}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="p-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-blue-500/50 backdrop-blur-md relative cursor-pointer group transition-all shadow-lg"
                                    >
                                        <div className="text-xs text-zinc-400 font-bold flex items-center justify-between gap-1 mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <ShieldCheck className="w-4 h-4 text-blue-400" /> 
                                                <span>실수혜 검증 비율</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded-full font-mono group-hover:text-blue-400 group-hover:bg-blue-500/20 transition-colors">?</span>
                                        </div>
                                        <div className="text-lg sm:text-xl font-black font-mono text-white">
                                            <span className="text-yellow-400">{themeStats.realCount}</span>
                                            <span className="text-zinc-500 text-xs"> / </span>
                                            <span className="text-zinc-300">{themeStats.totalCount} 종목</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 mt-1 block">실제 사업 연관성 검증</span>

                                        {activeTooltip === "real" && (
                                            <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-60 sm:w-64 p-3.5 rounded-2xl bg-zinc-900 border border-blue-500/50 shadow-2xl text-left z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="text-xs font-black text-blue-400 mb-1 flex items-center gap-1">
                                                    <span>🛡️ 찐수혜 검증 비율</span>
                                                </div>
                                                <p className="text-xs text-zinc-300 leading-relaxed">
                                                    단순 루머나 사명 변경으로 편승한 무늬만 테마주를 제외하고, 공시/사업보고서 상 실제 매출 및 특허가 존재하는 진짜 수혜 기업의 비율입니다.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 핵심 리스크 분석 (Key Risk Factor) */}
                            {result.risk_factor && (
                                <div className="flex items-start gap-3.5 bg-rose-950/40 p-5 rounded-2xl border border-rose-500/40 relative z-10 shadow-lg">
                                    <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
                                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-rose-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                                            <span>핵심 리스크 진단 (KEY RISK FACTOR)</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
                                            {result.risk_factor}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* [신규 디테일 추가] 테마 실전 매매 3대 핵심 대응 수칙 */}
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-950/80 to-purple-500/10 border border-amber-500/30 space-y-3 relative z-10">
                                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    <span>AI 테마 매매 실전 전략 가이드</span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                                        <strong className="text-white block font-bold">1. 1~2대장주 집중 원칙</strong>
                                        <p className="text-zinc-400 leading-relaxed">테마 순환매 시 후발 잡주는 반등폭이 적고 하락폭이 큽니다. 반드시 거래대금이 풍부한 상위 대장주 위주로 공략하세요.</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                                        <strong className="text-white block font-bold">2. 찐수혜 팩트체크 필수</strong>
                                        <p className="text-zinc-400 leading-relaxed">[실수혜 검증] 뱃지를 확인하여 실제 사업보고서에 관련 제품/매출이 반영되는 진짜 기업인지 검토하세요.</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                                        <strong className="text-white block font-bold">3. 재료 소멸 시 칼손절</strong>
                                        <p className="text-zinc-400 leading-relaxed">정책 발표나 이벤트 일정이 끝나면 급격한 차익 실현 매물이 쏟아지므로 사전에 정해둔 손절 라인을 철저히 지키세요.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. 테마 라이프사이클 레이더 (Lifecycle Clock) */}
                        <div className="p-6 sm:p-8 md:p-10 rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 backdrop-blur-2xl relative overflow-hidden space-y-7 shadow-2xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
                                <div className="space-y-1">
                                    <h4 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-orange-400" />
                                        <span>테마 라이프사이클 레이더 (Lifecycle Clock)</span>
                                    </h4>
                                    <p className="text-xs text-zinc-400">
                                        AI가 시장의 관심도와 거래대금 사이클을 종합 분석하여 테마의 진입 단계를 진단합니다.
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-2xl text-xs font-mono font-black text-white shrink-0">
                                    <span className="text-zinc-400">진단 시점:</span>
                                    <span className="text-orange-400 font-bold">{result.lifecycle?.time || "09:00 ~ 15:30"}</span>
                                </div>
                            </div>

                            {/* 4단계 프로그레스 바 카드 그리드 */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                                {[
                                    {
                                        id: 'Morning',
                                        title: '01. 태동기',
                                        sub: '🌱 초기 재료 / 잠재력',
                                        desc: '새로운 정책·연구 이슈가 부각되며 시장에 처음 등장하는 단계',
                                    },
                                    {
                                        id: 'Noon',
                                        title: '02. 급등·과열기',
                                        sub: '🔥 수급 폭발 / 변동성',
                                        desc: '시장의 모든 관심이 쏠리며 주가가 급등하는 중심 모멘텀 구간',
                                    },
                                    {
                                        id: 'Evening',
                                        title: '03. 성숙기',
                                        sub: '📊 대장주 압축 / 안정화',
                                        desc: '상승 탄력이 둔화되고 실적주 위주로 압축되는 차별화 단계',
                                    },
                                    {
                                        id: 'Night',
                                        title: '04. 쇠퇴기',
                                        sub: '❄️ 재료 소멸 / 관망 권고',
                                        desc: '모멘텀이 소멸되고 거래량이 줄어들며 횡보/조정하는 구간',
                                    }
                                ].map((stage) => {
                                    const isActive = (result.lifecycle?.phase || 'Morning').toLowerCase() === stage.id.toLowerCase();
                                    return (
                                        <div 
                                            key={stage.id}
                                            className={`p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                                                isActive 
                                                    ? 'bg-gradient-to-br from-orange-500/20 via-zinc-900/90 to-amber-500/20 border-orange-500/80 shadow-[0_0_30px_rgba(249,115,22,0.25)] scale-[1.02] ring-1 ring-orange-400' 
                                                    : 'bg-zinc-950/60 border-white/5 opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                            {isActive && (
                                                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-black text-[10px] font-black shadow-md animate-pulse">
                                                    현재 단계
                                                </div>
                                            )}
                                            <div className="space-y-1.5">
                                                <div className={`text-xs font-black ${isActive ? 'text-orange-400' : 'text-zinc-400'}`}>
                                                    {stage.title}
                                                </div>
                                                <div className="text-sm font-bold text-white">
                                                    {stage.sub}
                                                </div>
                                                <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                                                    {stage.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Phase AI Strategy Callout */}
                            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                                <div className="space-y-1">
                                    <div className="text-xs font-black text-orange-400 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>AI 테마 전략 코멘트</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed">
                                        {result.lifecycle?.comment 
                                            ? `"${result.lifecycle.comment}"`
                                            : "현재 테마의 수급 흐름과 대장주의 캔들 지지선을 복합적으로 검토하여 분할 매매로 대응하시기 바랍니다."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. Leaders & Followers Hub with View Toggle */}
                        <div className="space-y-6">
                            {/* View Mode & Filter Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg">
                                <div>
                                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-orange-400" />
                                        <span>테마 수혜 종목 인텔리전스 매트릭스</span>
                                    </h4>
                                    <p className="text-xs text-zinc-400">
                                        실제 사업 매출이 발생하는 '진짜 수혜주'와 단순 테마 '동조주'를 명확하게 구분합니다.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Sort Dropdown / Buttons */}
                                    <div className="flex p-1 bg-black/60 rounded-xl border border-white/10 text-xs font-bold">
                                        <button
                                            onClick={() => setSortBy("default")}
                                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                sortBy === "default" ? "bg-orange-500 text-white shadow-md" : "text-zinc-400 hover:text-white"
                                            }`}
                                        >
                                            대장주순
                                        </button>
                                        <button
                                            onClick={() => setSortBy("change")}
                                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                sortBy === "change" ? "bg-orange-500 text-white shadow-md" : "text-zinc-400 hover:text-white"
                                            }`}
                                        >
                                            등락률순
                                        </button>
                                        <button
                                            onClick={() => setSortBy("real")}
                                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                sortBy === "real" ? "bg-orange-500 text-white shadow-md" : "text-zinc-400 hover:text-white"
                                            }`}
                                        >
                                            실수혜 우선
                                        </button>
                                    </div>

                                    {/* View Mode Switcher */}
                                    <div className="flex p-1 bg-black/60 rounded-xl border border-white/10 text-xs font-bold">
                                        <button
                                            onClick={() => setViewMode("card")}
                                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                                viewMode === "card" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
                                            }`}
                                            title="카드 뷰"
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode("table")}
                                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                                viewMode === "table" ? "bg-white/20 text-white" : "text-zinc-400 hover:text-white"
                                            }`}
                                            title="테이블 뷰"
                                        >
                                            <Table className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* View Mode 1: Cards */}
                            {viewMode === "card" && (
                                <div className="space-y-4">
                                    {/* Active Filter Description Banner */}
                                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            {sortBy === "default" && (
                                                <span className="text-orange-400 font-bold flex items-center gap-1.5">
                                                    <Award className="w-4 h-4" /> <strong>대장주 분류 기준</strong>: 1~3대장주와 후발 주변주를 구분하여 표시합니다.
                                                </span>
                                            )}
                                            {sortBy === "change" && (
                                                <span className="text-rose-400 font-bold flex items-center gap-1.5">
                                                    <TrendingUp className="w-4 h-4" /> <strong>실시간 등락률 순 정렬</strong>: 당일 상승률이 가장 높은 종목부터 순서대로 전체 정렬되었습니다.
                                                </span>
                                            )}
                                            {sortBy === "real" && (
                                                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                                    <ShieldCheck className="w-4 h-4" /> <strong>실수혜 검증 우선 정렬</strong>: 공시 및 실적이 확인된 '진짜 수혜 기업'이 최상단에 우선 배치되었습니다.
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-zinc-500 font-mono text-[11px]">
                                            총 {processedStocks.allSorted.length}개 종목
                                        </span>
                                    </div>

                                    {/* Default View: 2 Columns (Leaders vs Followers) */}
                                    {sortBy === "default" ? (
                                        <div className="grid lg:grid-cols-2 gap-6">
                                            {/* Primary Leaders Column */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
                                                            <Award className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-white font-black text-base">
                                                            핵심 대장주 (Primary Leaders)
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-orange-400 font-bold bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                                                        {processedStocks.leaders.length}개사 분석
                                                    </span>
                                                </div>

                                                <div className="space-y-3.5">
                                                    {processedStocks.leaders.map((stock: any, idx: number) => (
                                                        <StockCardItem key={stock.symbol} stock={stock} idx={idx} router={router} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Secondary Followers Column */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                                                            <Zap className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-white font-black text-base">
                                                            주변 연관 기업 (Secondary Followers)
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                                                        {processedStocks.followers.length}개사 분석
                                                    </span>
                                                </div>

                                                <div className="space-y-3.5">
                                                    {processedStocks.followers.map((stock: any, idx: number) => (
                                                        <StockCardItem key={stock.symbol} stock={stock} idx={idx} router={router} isFollower />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Sorted View: Unified 2-Column Grid of All Stocks Sorted by Selected Criteria */
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {processedStocks.allSorted.map((stock: any, idx: number) => (
                                                <StockCardItem 
                                                    key={stock.symbol} 
                                                    stock={stock} 
                                                    idx={idx} 
                                                    router={router} 
                                                    unifiedRank={idx + 1}
                                                    isUnifiedSort 
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* View Mode 2: Table */}
                            {viewMode === "table" && (
                                <div className="rounded-3xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-2xl backdrop-blur-xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-white/10 bg-white/5 text-xs font-black text-zinc-400 uppercase tracking-wider">
                                                    <th className="py-4 px-5">구분</th>
                                                    <th className="py-4 px-5">종목명 (코드)</th>
                                                    <th className="py-4 px-5 text-right">현재가</th>
                                                    <th className="py-4 px-5 text-right">등락률</th>
                                                    <th className="py-4 px-5 text-center">수혜 검증</th>
                                                    <th className="py-4 px-5">핵심 연관 팩트 &amp; 이유</th>
                                                    <th className="py-4 px-5 text-center">차트/분석</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-xs">
                                                {processedStocks.allSorted.map((stock: any) => (
                                                    <tr key={stock.symbol} className="hover:bg-white/[0.04] transition-colors">
                                                        <td className="py-4 px-5 font-bold">
                                                            {stock.isLeader ? (
                                                                <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[11px] font-black">
                                                                    👑 대장주
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[11px] font-bold">
                                                                    ⚡ 후발주
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-5 font-bold text-white">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-black">{stock.name}</span>
                                                                <span className="text-[10px] font-mono text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded">
                                                                    {stock.symbol}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-5 text-right font-mono font-black text-white text-sm">
                                                            {stock.price !== '-' ? `${stock.price}원` : '-'}
                                                        </td>
                                                        <td className={`py-4 px-5 text-right font-black font-mono text-sm ${
                                                            stock.isPositive ? 'text-rose-400' : stock.isNegative ? 'text-sky-400' : 'text-zinc-400'
                                                        }`}>
                                                            {stock.change}
                                                        </td>
                                                        <td className="py-4 px-5 text-center">
                                                            {stock.is_real ? (
                                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                                                                    🛡️ 찐수혜
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                                                    ⚠️ 편승주의
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-5 text-zinc-300 max-w-xs leading-relaxed">
                                                            {stock.reason || "-"}
                                                        </td>
                                                        <td className="py-4 px-5 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    onClick={() => router.push(`/discovery?q=${stock.symbol}`)}
                                                                    className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                                                                >
                                                                    차트
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/stock/${stock.symbol}`)}
                                                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                                                                >
                                                                    상세
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. Disclaimer Footer */}
                        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex items-start gap-3.5 text-left">
                            <div className="bg-rose-500/20 p-2.5 rounded-2xl shrink-0 text-rose-400">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h5 className="text-rose-400 font-bold text-xs sm:text-sm">면책 조항 (투자 권유 아님)</h5>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    본 테마 분석은 뉴스, 검색어 등 공개 데이터를 기계적으로 취합한 결과일 뿐, 특정 종목에 대한 매수/매도 등 <strong>투자 권유나 자문이 아닙니다.</strong> 
                                    찐수혜/주의 뱃지 역시 객관적 사실(매출 비중, 사업 보고서)을 단순 분류한 것이며, 모든 투자 판단과 책임은 투자자 본인에게 있습니다.
                                </p>
                            </div>
                        </div>

                    </div>
                )}

                {/* 하단 세로 배너 광고 (320x480) */}
                <div className="mt-8 flex justify-center">
                    <KakaoAdFit adUnit="DAN-b946L75vYgFilyWy" adWidth="320" adHeight="480" />
                </div>

                <div className="mt-8">
                    <SeoContentBlock />
                </div>
            </div>
        </div>
    );
}

export default function ThemePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
            <ThemePageContent />
        </Suspense>
    );
}
