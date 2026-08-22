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

        const leaders = (result.leaders || []).map((s: any, i: number) => formatStock(s, true, i + 1));
        const followers = (result.followers || []).map((s: any, i: number) => formatStock(s, false, i + 1));
        const all = [...leaders, ...followers];

        if (sortBy === "change") {
            all.sort((a, b) => b.changeNum - a.changeNum);
        } else if (sortBy === "real") {
            all.sort((a, b) => (b.is_real ? 1 : 0) - (a.is_real ? 1 : 0));
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
                {/* Search Hero */}
                <div className="text-center space-y-7 py-8 relative">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

                    <div className="flex items-center justify-center gap-3">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 tracking-tight drop-shadow-lg flex items-center justify-center gap-2 flex-wrap">
                            <span>🔥 실시간 주도 테마 레이더</span>
                            <span className="text-xl md:text-2xl text-orange-400 font-bold align-middle">(테마 발굴)</span>
                        </h2>
                        <button 
                            onClick={() => setShowHelp(true)}
                            className="p-2 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-orange-400/50 rounded-full transition-all text-gray-400 hover:text-orange-300 shadow-lg"
                            title="화면 설명 보기"
                        >
                            <Info className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-gray-300 text-base md:text-lg font-medium tracking-wide">
                        관심있는 테마 키워드를 입력하면 <span className="text-orange-400 font-bold">대장주와 핵심 리스크</span>를 즉각적으로 분석합니다.
                    </p>

                    <div className="relative max-w-2xl mx-auto group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20 rounded-3xl blur opacity-30 group-hover:opacity-70 transition duration-500"></div>
                        <div className="relative flex items-center">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                <Search className="h-6 w-6 text-orange-400/80" />
                            </div>
                            <input
                                type="text"
                                placeholder="예: 비만치료제, 온디바이스AI, 전력기기..."
                                className="w-full h-16 pl-16 pr-28 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl text-lg md:text-xl font-bold outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all text-white placeholder-gray-500 shadow-2xl"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="absolute right-2.5 top-2.5 bottom-2.5 px-6 flex items-center justify-center bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] disabled:opacity-50 disabled:shadow-none cursor-pointer active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin text-white w-6 h-6" /> : <ArrowRight className="text-white w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    {/* 최근 검색어 칩 */}
                    {recentSearches.length > 0 && (
                        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs text-gray-400 px-1 flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-500">최근 검색:</span>
                                {recentSearches.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setKeyword(s);
                                            handleAnalyze(s);
                                        }}
                                        className="px-2 py-0.5 bg-white/5 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors"
                                    >
                                        #{s}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={clearRecentSearches}
                                className="text-gray-500 hover:text-gray-300 underline text-[11px]"
                            >
                                기록 지우기
                            </button>
                        </div>
                    )}

                    {/* TOP 10 실시간 인기 테마 섹션 */}
                    <div className="pt-6 w-full max-w-5xl mx-auto">
                        <div className="flex items-center justify-between gap-2 mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                                <span className="text-white font-bold text-sm tracking-wider">
                                    실시간 인기 테마 TOP 10
                                </span>
                            </div>
                            <span className="text-[11px] text-gray-400 font-medium">
                                🔄 1분 주기 실시간 자동 갱신
                            </span>
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
                                const isTop3 = idx < 3;
                                
                                return (
                                    <button
                                        key={idx}
                                        onMouseEnter={() => prefetchTheme(rawName)}
                                        onClick={() => { 
                                            setKeyword(rawName); 
                                            handleAnalyze(rawName); 
                                        }}
                                        className={`group relative p-3.5 rounded-2xl bg-black/50 backdrop-blur-md border ${isTop3 ? 'border-orange-500/30 hover:border-orange-400/70 shadow-[0_4px_20px_rgba(249,115,22,0.1)]' : 'border-white/10 hover:border-white/30'} hover:bg-orange-950/20 transition-all hover:-translate-y-1 text-left overflow-hidden flex flex-col justify-between h-full min-h-[92px] active:scale-95`}
                                    >
                                        <div className="flex justify-between items-center mb-1.5 z-10 w-full">
                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                                idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                                                idx === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40' :
                                                idx === 2 ? 'bg-amber-700/20 text-amber-200 border border-amber-700/40' :
                                                'bg-white/5 text-gray-400 border border-white/5 group-hover:text-gray-200'
                                            }`}>
                                                {idx === 0 ? '🥇 1위' : idx === 1 ? '🥈 2위' : idx === 2 ? '🥉 3위' : `${String(idx + 1).padStart(2, '0')}`}
                                            </span>
                                            {typeof t !== 'string' && t.change && (
                                                <span className={`text-[12px] font-black tracking-tight ${
                                                    (t.change.includes('+') || !t.change.includes('-')) && t.change !== '0.00%' 
                                                        ? 'text-red-400' 
                                                        : 'text-blue-400'
                                                }`}>
                                                    {t.change}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="z-10 flex flex-col w-full">
                                            <span className="font-bold text-gray-100 group-hover:text-orange-300 text-sm transition-colors truncate w-full" title={rawName}>
                                                {cleanName}
                                            </span>
                                            {typeof t !== 'string' && t.desc && (
                                                <span className="text-[11px] text-gray-400 group-hover:text-gray-300 mt-1 line-clamp-1 transition-colors w-full">
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

                {/* Analysis Result */}
                {result && !loading && (
                    <div className="space-y-8 animate-in zoom-in-95 duration-500">
                        {/* 1. Top Hero Intelligence Banner & Stats */}
                        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-orange-950/40 via-black to-zinc-950 border border-orange-500/30 relative overflow-hidden shadow-2xl space-y-6">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <Layers className="w-80 h-80 text-orange-400 -rotate-12 transform translate-x-16 -translate-y-16" />
                            </div>

                            {/* Header Row: Title & Kakao Share */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider mb-2">
                                        <Flame className="w-3.5 h-3.5 animate-pulse" />
                                        실시간 주도 테마 심층 분석
                                    </div>
                                    <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                                        <span className="text-orange-500">#</span> {result.theme}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => handleAnalyze(result.theme)}
                                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        실시간 시세 갱신
                                    </button>
                                    <KakaoShareButton 
                                        title={`[주도 테마 분석] ${result.theme}`}
                                        description={result.description || "AI가 분석한 이 테마의 대장주와 핵심 리스크를 확인해보세요."}
                                        url={`https://stock-trend-program.co.kr/theme?q=${result.theme}`}
                                        className="bg-[#FEE500] hover:bg-[#FEE500]/90 text-black px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-[#FEE500]/10 cursor-pointer active:scale-95"
                                        buttonText="테마 분석 공유"
                                    />
                                </div>
                            </div>

                            {/* Theme Description */}
                            <p className="text-sm md:text-base text-gray-200 leading-relaxed border-l-4 border-orange-500 pl-4 py-1 relative z-10 font-medium">
                                {result.description}
                            </p>
                            {/* 4-Stat Live Matrix Bar with Interactive Tooltips */}
                            {themeStats && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-20 pt-2">
                                    {/* Stat 1: Avg Change */}
                                    <div 
                                        onClick={() => setActiveTooltip(activeTooltip === "avgChange" ? null : "avgChange")}
                                        onMouseEnter={() => setActiveTooltip("avgChange")}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md relative cursor-pointer group transition-all"
                                    >
                                        <div className="text-[11px] text-gray-400 font-bold flex items-center justify-between gap-1 mb-1">
                                            <div className="flex items-center gap-1">
                                                <Activity className="w-3.5 h-3.5 text-orange-400" /> 
                                                <span>테마 평균 등락률</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 bg-white/10 px-1 py-0.2 rounded-full font-mono group-hover:text-orange-400 group-hover:bg-orange-500/20 transition-colors">?</span>
                                        </div>
                                        <div className={`text-lg md:text-xl font-black ${
                                            themeStats.avgChangeVal > 0 ? 'text-red-400' : themeStats.avgChangeVal < 0 ? 'text-blue-400' : 'text-gray-200'
                                        }`}>
                                            {themeStats.avgChangeStr}
                                        </div>

                                        {/* Tooltip Popup */}
                                        {activeTooltip === "avgChange" && (
                                            <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-56 sm:w-64 p-3 rounded-xl bg-zinc-900 border border-orange-500/40 shadow-2xl text-left z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="text-xs font-black text-orange-400 mb-1 flex items-center gap-1">
                                                    <span>📉 테마 평균 등락률</span>
                                                </div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                                    이 테마에 속한 전체 종목들의 <strong>실시간 평균 등락률</strong>입니다. 테마 전반의 상승 열기와 시장 분위기를 한눈에 보여줍니다.
                                                </p>
                                                <div className="absolute left-6 sm:left-1/2 sm:-translate-x-1/2 top-full w-2 h-2 bg-zinc-900 border-r border-b border-orange-500/40 rotate-45 -mt-1"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stat 2: Supply & Demand Ratio */}
                                    <div 
                                        onClick={() => setActiveTooltip(activeTooltip === "upDown" ? null : "upDown")}
                                        onMouseEnter={() => setActiveTooltip("upDown")}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md relative cursor-pointer group transition-all"
                                    >
                                        <div className="text-[11px] text-gray-400 font-bold flex items-center justify-between gap-1 mb-1">
                                            <div className="flex items-center gap-1">
                                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> 
                                                <span>수급 상승/하락</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 bg-white/10 px-1 py-0.2 rounded-full font-mono group-hover:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">?</span>
                                        </div>
                                        <div className="text-lg md:text-xl font-black text-white">
                                            <span className="text-red-400">{themeStats.upCount}</span>
                                            <span className="text-gray-500 text-sm"> 상승 / </span>
                                            <span className="text-blue-400">{themeStats.downCount}</span>
                                            <span className="text-gray-500 text-sm"> 하락</span>
                                        </div>

                                        {/* Tooltip Popup */}
                                        {activeTooltip === "upDown" && (
                                            <div className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-56 sm:w-64 p-3 rounded-xl bg-zinc-900 border border-emerald-500/40 shadow-2xl text-left z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="text-xs font-black text-emerald-400 mb-1 flex items-center gap-1">
                                                    <span>⚖️ 수급 상승/하락 비율</span>
                                                </div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                                    테마 내 종목 중 <strong>몇 개가 오르고 내리는지</strong>를 나타냅니다. 상승 종목이 많을수록 테마 전반으로 매수세가 확산된 강력한 테마입니다.
                                                </p>
                                                <div className="absolute left-6 sm:left-1/2 sm:-translate-x-1/2 top-full w-2 h-2 bg-zinc-900 border-r border-b border-emerald-500/40 rotate-45 -mt-1"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stat 3: Leader 1 Stock */}
                                    <div 
                                        onClick={() => setActiveTooltip(activeTooltip === "leader" ? null : "leader")}
                                        onMouseEnter={() => setActiveTooltip("leader")}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md relative cursor-pointer group transition-all"
                                    >
                                        <div className="text-[11px] text-gray-400 font-bold flex items-center justify-between gap-1 mb-1">
                                            <div className="flex items-center gap-1">
                                                <Award className="w-3.5 h-3.5 text-yellow-400" /> 
                                                <span>1대장 리딩 종목</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 bg-white/10 px-1 py-0.2 rounded-full font-mono group-hover:text-yellow-400 group-hover:bg-yellow-500/20 transition-colors">?</span>
                                        </div>
                                        <div className="text-base md:text-lg font-black text-white truncate" title={themeStats.leader1?.name || '-'}>
                                            {themeStats.leader1?.name || '-'}
                                            {themeStats.leader1?.change && (
                                                <span className={`text-xs font-bold ml-1.5 ${
                                                    String(themeStats.leader1.change).includes('+') ? 'text-red-400' : 'text-blue-400'
                                                }`}>
                                                    {themeStats.leader1.change}
                                                </span>
                                            )}
                                        </div>

                                        {/* Tooltip Popup */}
                                        {activeTooltip === "leader" && (
                                            <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-56 sm:w-64 p-3 rounded-xl bg-zinc-900 border border-yellow-500/40 shadow-2xl text-left z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="text-xs font-black text-yellow-400 mb-1 flex items-center gap-1">
                                                    <span>👑 1대장 리딩 종목</span>
                                                </div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                                    테마의 가격과 수급을 <strong>맨 앞에서 이끄는 핵심 대장주</strong>입니다. 1대장이 강하게 버텨주어야 후발 종목들도 뒤따라 상승할 수 있습니다.
                                                </p>
                                                <div className="absolute right-6 sm:left-1/2 sm:-translate-x-1/2 top-full w-2 h-2 bg-zinc-900 border-r border-b border-yellow-500/40 rotate-45 -mt-1"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stat 4: Real Beneficiary Count */}
                                    <div 
                                        onClick={() => setActiveTooltip(activeTooltip === "real" ? null : "real")}
                                        onMouseEnter={() => setActiveTooltip("real")}
                                        onMouseLeave={() => setActiveTooltip(null)}
                                        className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md relative cursor-pointer group transition-all"
                                    >
                                        <div className="text-[11px] text-gray-400 font-bold flex items-center justify-between gap-1 mb-1">
                                            <div className="flex items-center gap-1">
                                                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> 
                                                <span>실수혜 검증</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 bg-white/10 px-1 py-0.2 rounded-full font-mono group-hover:text-blue-400 group-hover:bg-blue-500/20 transition-colors">?</span>
                                        </div>
                                        <div className="text-lg md:text-xl font-black text-white">
                                            <span className="text-yellow-400">{themeStats.realCount}</span>
                                            <span className="text-gray-400 text-sm"> / {themeStats.totalCount} 종목</span>
                                        </div>

                                        {/* Tooltip Popup */}
                                        {activeTooltip === "real" && (
                                            <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-56 sm:w-64 p-3 rounded-xl bg-zinc-900 border border-blue-500/40 shadow-2xl text-left z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                                <div className="text-xs font-black text-blue-400 mb-1 flex items-center gap-1">
                                                    <span>🛡️ 실수혜 검증 비율</span>
                                                </div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                                    단순 소문/루머로 엮인 종목을 거르고, <strong>실제 관련 사업을 하거나 매출이 발생하는 진짜 수혜 기업</strong>의 비율입니다.
                                                </p>
                                                <div className="absolute right-6 sm:left-1/2 sm:-translate-x-1/2 top-full w-2 h-2 bg-zinc-900 border-r border-b border-blue-500/40 rotate-45 -mt-1"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Risk Factor Warning Card */}
                            {result.risk_factor && (
                                <div className="flex items-start gap-3 bg-red-950/30 p-4 rounded-2xl border border-red-500/30 relative z-10">
                                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0 animate-bounce" />
                                    <div>
                                        <div className="text-red-400 font-black text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                            <span>핵심 리스크 분석 (Key Risk Factor)</span>
                                        </div>
                                        <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                                            {result.risk_factor}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Theme Lifecycle Progress & Strategy Guide */}
                        <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/70 border border-white/10 backdrop-blur-xl relative overflow-hidden space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                                <div>
                                    <h4 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-orange-400" />
                                        테마 라이프사이클 레이더 (Lifecycle Clock)
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        AI가 시장의 관심도와 수급 사이클을 종합 분석하여 테마의 진입 단계를 진단합니다.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-gray-400 font-bold">진단 시간:</span>
                                    <span className="text-sm font-black px-3 py-1 bg-white/10 border border-white/10 rounded-xl text-white font-mono">
                                        {result.lifecycle?.time || "12:00"}
                                    </span>
                                </div>
                            </div>

                            {/* 4-Stage Visual Flow Progress Bar */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {[
                                    {
                                        id: 'Morning',
                                        title: '01. 태동기',
                                        sub: '🌱 초기 재료 / 잠재력',
                                        desc: '새로운 이슈가 부각되며 시장에 처음 등장하는 단계',
                                        color: 'blue'
                                    },
                                    {
                                        id: 'Noon',
                                        title: '02. 급등·과열기',
                                        sub: '🔥 수급 폭발 / 변동성',
                                        desc: '시장의 모든 관심이 쏠리며 주가가 급등하는 중심 구간',
                                        color: 'red'
                                    },
                                    {
                                        id: 'Evening',
                                        title: '03. 성숙기',
                                        sub: '📊 대장주 압축 / 안정화',
                                        desc: '상승 탄력이 둔화되고 실적주 위주로 압축되는 단계',
                                        color: 'orange'
                                    },
                                    {
                                        id: 'Night',
                                        title: '04. 쇠퇴기',
                                        sub: '❄️ 재료 소멸 / 관망 권고',
                                        desc: '모멘텀이 소멸되고 거래량이 줄어드는 휴식 구간',
                                        color: 'gray'
                                    }
                                ].map((stage) => {
                                    const isActive = (result.lifecycle?.phase || 'Evening').toLowerCase() === stage.id.toLowerCase();
                                    return (
                                        <div 
                                            key={stage.id}
                                            className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                                                isActive 
                                                    ? 'bg-orange-500/15 border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.2)] scale-[1.02]' 
                                                    : 'bg-white/[0.03] border-white/5 opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                            {isActive && (
                                                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black animate-pulse">
                                                    현재 단계
                                                </div>
                                            )}
                                            <div>
                                                <div className={`text-xs font-black mb-1 ${isActive ? 'text-orange-400' : 'text-gray-400'}`}>
                                                    {stage.title}
                                                </div>
                                                <div className="text-sm font-bold text-white mb-1.5">
                                                    {stage.sub}
                                                </div>
                                                <p className="text-[11px] text-gray-400 leading-relaxed">
                                                    {stage.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Phase AI Strategy Callout */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="text-xs font-black text-orange-400 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>AI 테마 전략 코멘트</span>
                                    </div>
                                    <p className="text-xs md:text-sm text-gray-200 font-medium">
                                        {result.lifecycle?.comment 
                                            ? `"${result.lifecycle.comment}"`
                                            : "현재 테마의 수급 흐름과 대장주의 캔들 지지선을 복합적으로 검토하여 대응하시기 바랍니다."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. Leaders & Followers Hub with View Toggle */}
                        <div className="space-y-6">
                            {/* View Mode & Filter Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                <div>
                                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-orange-400" />
                                        테마 수혜 종목 인텔리전스 매트릭스
                                    </h4>
                                    <p className="text-xs text-gray-400">
                                        실제 사업 매출이 발생하는 '진짜 수혜주'와 단순 테마 '동조주'를 명확하게 구분합니다.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Sort Dropdown / Buttons */}
                                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 text-xs font-bold">
                                        <button
                                            onClick={() => setSortBy("default")}
                                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                sortBy === "default" ? "bg-orange-500 text-white shadow-md" : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            대장주순
                                        </button>
                                        <button
                                            onClick={() => setSortBy("change")}
                                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                sortBy === "change" ? "bg-orange-500 text-white shadow-md" : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            등락률순
                                        </button>
                                        <button
                                            onClick={() => setSortBy("real")}
                                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                sortBy === "real" ? "bg-orange-500 text-white shadow-md" : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            실수혜 우선
                                        </button>
                                    </div>

                                    {/* View Mode Switcher */}
                                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 text-xs font-bold">
                                        <button
                                            onClick={() => setViewMode("card")}
                                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                                viewMode === "card" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
                                            }`}
                                            title="카드 뷰"
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode("table")}
                                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                                viewMode === "table" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
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
                                <div className="grid lg:grid-cols-2 gap-6">
                                    {/* Primary Leaders Column */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-orange-500/20 text-orange-400 rounded-lg">
                                                    <Award className="w-4 h-4" />
                                                </div>
                                                <span className="text-white font-black text-base">
                                                    핵심 대장주 (Primary Leaders)
                                                </span>
                                            </div>
                                            <span className="text-xs text-orange-400/80 font-bold">
                                                {processedStocks.leaders.length}개사 분석
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {processedStocks.leaders.map((stock: any, idx: number) => (
                                                <div
                                                    key={stock.symbol}
                                                    className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.04] to-black border border-orange-500/30 hover:border-orange-500/60 transition-all hover:-translate-y-0.5 shadow-lg group flex flex-col justify-between gap-4"
                                                >
                                                    {/* Top Row: Rank Badge, Stock Name, Real Badge & Price */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                                                    idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                                                                    idx === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40' :
                                                                    'bg-amber-700/20 text-amber-200 border border-amber-700/40'
                                                                }`}>
                                                                    {idx === 0 ? '🥇 1대장' : idx === 1 ? '🥈 2대장' : '🥉 3대장'}
                                                                </span>
                                                                
                                                                {stock.is_real ? (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                                        <ShieldCheck className="w-3 h-3" /> 찐수혜 검증
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                                                        <AlertOctagon className="w-3 h-3" /> 테마 편승주의
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 pt-0.5">
                                                                <span className="text-lg md:text-xl font-black text-white group-hover:text-orange-400 transition-colors">
                                                                    {stock.name}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-gray-400 bg-white/10 px-1.5 py-0.5 rounded">
                                                                    {stock.symbol}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Price Block */}
                                                        <div className="text-right shrink-0">
                                                            <div className="text-lg md:text-xl font-black text-white font-mono">
                                                                {stock.price !== '-' ? `${stock.price}원` : '-'}
                                                            </div>
                                                            <div className={`text-xs font-black tracking-tight ${
                                                                stock.isPositive ? 'text-red-400' : stock.isNegative ? 'text-blue-400' : 'text-gray-400'
                                                            }`}>
                                                                {stock.change}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reason Text */}
                                                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-gray-300 leading-relaxed font-medium">
                                                        💡 {stock.reason || "해당 테마와 직접적인 사업 연관성이 확인된 종목입니다."}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                                        <button
                                                            onClick={() => router.push(`/discovery?q=${stock.symbol}`)}
                                                            className="py-2 px-3 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                                        >
                                                            <span>실시간 캔들차트</span>
                                                            <ExternalLink className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`/stock/${stock.symbol}`)}
                                                            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                                        >
                                                            <span>수급·재무 분석</span>
                                                            <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Secondary Followers Column */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <span className="text-white font-black text-base">
                                                    주변 연관 기업 (Secondary Followers)
                                                </span>
                                            </div>
                                            <span className="text-xs text-blue-400/80 font-bold">
                                                {processedStocks.followers.length}개사 분석
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {processedStocks.followers.map((stock: any, idx: number) => (
                                                <div
                                                    key={stock.symbol}
                                                    className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.04] to-black border border-white/10 hover:border-blue-500/40 transition-all hover:-translate-y-0.5 shadow-lg group flex flex-col justify-between gap-4"
                                                >
                                                    {/* Top Row */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                                                    ⚡ 후발/관련주
                                                                </span>
                                                                
                                                                {stock.is_real ? (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                                        <ShieldCheck className="w-3 h-3" /> 실수혜 검증
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-400 border border-gray-500/30">
                                                                        <AlertOctagon className="w-3 h-3" /> 단순 편승주의
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 pt-0.5">
                                                                <span className="text-lg md:text-xl font-black text-white group-hover:text-blue-400 transition-colors">
                                                                    {stock.name}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-gray-400 bg-white/10 px-1.5 py-0.5 rounded">
                                                                    {stock.symbol}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Price Block */}
                                                        <div className="text-right shrink-0">
                                                            <div className="text-lg md:text-xl font-black text-white font-mono">
                                                                {stock.price !== '-' ? `${stock.price}원` : '-'}
                                                            </div>
                                                            <div className={`text-xs font-black tracking-tight ${
                                                                stock.isPositive ? 'text-red-400' : stock.isNegative ? 'text-blue-400' : 'text-gray-400'
                                                            }`}>
                                                                {stock.change}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reason Text */}
                                                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-gray-300 leading-relaxed font-medium">
                                                        📌 {stock.reason || "해당 테마와 간접적인 사업 연관성이 있는 후발 종목입니다."}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                                        <button
                                                            onClick={() => router.push(`/discovery?q=${stock.symbol}`)}
                                                            className="py-2 px-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                                        >
                                                            <span>실시간 캔들차트</span>
                                                            <ExternalLink className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`/stock/${stock.symbol}`)}
                                                            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                                        >
                                                            <span>수급·재무 분석</span>
                                                            <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* View Mode 2: Table */}
                            {viewMode === "table" && (
                                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden shadow-2xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-white/10 bg-white/5 text-xs font-black text-gray-400 uppercase tracking-wider">
                                                    <th className="py-3 px-4">구분</th>
                                                    <th className="py-3 px-4">종목명 (코드)</th>
                                                    <th className="py-3 px-4 text-right">현재가</th>
                                                    <th className="py-3 px-4 text-right">등락률</th>
                                                    <th className="py-3 px-4 text-center">수혜 검증</th>
                                                    <th className="py-3 px-4">핵심 연관 팩트 &amp; 이유</th>
                                                    <th className="py-3 px-4 text-center">차트/분석</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 text-xs">
                                                {processedStocks.allSorted.map((stock: any) => (
                                                    <tr key={stock.symbol} className="hover:bg-white/[0.03] transition-colors">
                                                        <td className="py-3.5 px-4 font-bold">
                                                            {stock.isLeader ? (
                                                                <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[11px] font-black">
                                                                    👑 대장주
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[11px] font-bold">
                                                                    ⚡ 후발주
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-bold text-white">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-sm font-black">{stock.name}</span>
                                                                <span className="text-[10px] font-mono text-gray-400 bg-white/10 px-1 rounded">
                                                                    {stock.symbol}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                                                            {stock.price !== '-' ? `${stock.price}원` : '-'}
                                                        </td>
                                                        <td className={`py-3.5 px-4 text-right font-bold text-sm ${
                                                            stock.isPositive ? 'text-red-400' : stock.isNegative ? 'text-blue-400' : 'text-gray-400'
                                                        }`}>
                                                            {stock.change}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            {stock.is_real ? (
                                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                                                                    🛡️ 찐수혜
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                                                    ⚠️ 편승주의
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-gray-300 max-w-xs leading-relaxed">
                                                            {stock.reason || "-"}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    onClick={() => router.push(`/discovery?q=${stock.symbol}`)}
                                                                    className="px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                                                                >
                                                                    차트
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/stock/${stock.symbol}`)}
                                                                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
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

                        {/* Legal Disclaimer Box */}
                        <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-5 mt-8 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                            <div className="bg-red-500/20 p-3 rounded-full shrink-0">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h5 className="text-red-400 font-bold text-sm mb-1">면책 조항 (투자 권유 아님)</h5>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                    본 테마 분석은 뉴스, 검색어 등 웹상의 공개 데이터를 기계적으로 취합한 결과일 뿐, 특정 종목에 대한 매수/매도 등 <strong>투자 권유나 자문이 아닙니다.</strong> 
                                    찐수혜/주의 뱃지 역시 객관적 사실(매출 비중, 기사 빈도)을 단순 분류한 것이며 맹신하지 마세요. 모든 투자 판단과 책임은 투자자 본인에게 있습니다.
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
