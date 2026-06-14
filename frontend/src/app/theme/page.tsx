"use client";
// Last Updated: 2026-05-03 06:47 AM (KST) - UI Clean up check

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, Loader2, ArrowRight, TrendingUp, AlertTriangle, Layers, Sparkles, Info, X } from "lucide-react";
import CleanStockList from "@/components/CleanStockList";
import { useAuth } from "@/context/AuthContext";
import KakaoShareButton from "@/components/KakaoShareButton";

// [Cache System] Ultra-fast navigation for Themes
const THEME_CACHE: Record<string, { data: any, timestamp: number, quotes?: Record<string, any> }> = {};
const CACHE_DURATION = 60 * 1000 * 5; // 5 minute cache

export default function ThemePage() {
    const router = useRouter();
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const [quotes, setQuotes] = useState<Record<string, any>>({});
    const [showHelp, setShowHelp] = useState(false);

    const handleAnalyze = async (overrideKeyword?: any) => {
        const searchKeyword = typeof overrideKeyword === 'string' ? overrideKeyword : keyword;
        if (!searchKeyword) return;
        
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


    const [trendingThemes, setTrendingThemes] = useState<any[]>([]);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                // [Fix] 실시간 테마 및 인기 검색 키워드 수집 (상세 데이터 포함)
                const res = await fetch(`${API_BASE_URL}/api/market/rank/themes`);
                const json = await res.json();
                if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
                    setTrendingThemes(json.data); 
                }
            } catch (err) {
                console.error("Failed to fetch trending themes:", err);
            }
        };
        fetchTrending();
        
        // 1분마다 실시간 인기 검색어 갱신
        const interval = setInterval(fetchTrending, 60000);
        return () => clearInterval(interval);
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


    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleAnalyze();
    };

    return (
        <div className="min-h-screen pb-20 text-white bg-zinc-950">
            <Header title="이슈 테마 분석 (v2.6)" subtitle="Find the Next Big Thing with AI." />

            <div className="max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Search Hero */}
                <div className="text-center space-y-6 py-10">
                    <div className="flex items-center justify-center gap-2">
                        <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-orange-400 to-red-400">
                            What's Trending Now? (v2.6)
                        </h2>
                        <button 
                            onClick={() => setShowHelp(true)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            title="화면 설명 보기"
                        >
                            <Info className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-gray-400 text-lg">
                        관심있는 테마 키워드를 입력하면<br className="md:hidden" /> AI가 대장주와 리스크를 분석해드립니다.
                    </p>

                    <div className="relative max-w-2xl mx-auto">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-6 w-6 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="예: 비만치료제, 온디바이스AI..."
                            className="w-full pl-14 pr-6 py-5 bg-white/10 border border-white/20 rounded-2xl text-xl font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all text-white placeholder-gray-500 shadow-2xl"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="absolute right-3 top-3 bottom-3 bg-orange-500 hover:bg-orange-600 px-6 rounded-xl font-bold transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                        </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 text-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <span className="text-gray-500 font-medium flex items-center gap-1.5 mr-2">
                            <Sparkles className="w-4 h-4 text-orange-500/70" />
                            인기 검색:
                        </span>
                        {trendingThemes.slice(0, 10).map((t, idx) => (
                            <button
                                key={idx}
                                onMouseEnter={() => {
                                    const name = typeof t === 'string' ? t : t.name;
                                    prefetchTheme(name);
                                }}
                                onClick={() => { 
                                    const name = typeof t === 'string' ? t : t.name;
                                    setKeyword(name); 
                                    handleAnalyze(name); 
                                }}
                                className="group px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 transition-all hover:-translate-y-0.5 text-gray-400 hover:text-white flex items-center gap-3 text-left"
                            >
                                <span className="text-xs font-black text-gray-600 group-hover:text-orange-500/50 transition-colors shrink-0">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-200 group-hover:text-white">{typeof t === 'string' ? t : t.name}</span>
                                        {typeof t !== 'string' && t.change && (
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-sm bg-white/5 ${(t.change.includes('+') || !t.change.includes('-')) && t.change !== '0.00%' ? 'text-red-400' : 'text-blue-400'}`}>
                                                {t.change}
                                            </span>
                                        )}
                                    </div>
                                    {typeof t !== 'string' && t.desc && (
                                        <span className="text-[10px] text-gray-500 group-hover:text-orange-200/70 mt-0.5">
                                            {t.desc}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
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

                {/* Analysis Result */}
                {result && (
                    <div className="space-y-8 animate-in zoom-in-95 duration-500">
                        {/* Summary Card & Clock */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Left: Theme Info */}
                            <div className="md:col-span-2 bg-gradient-to-br from-orange-900/20 to-black border border-orange-500/30 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Layers className="w-64 h-64 text-orange-400 -rotate-12 transform translate-x-12 -translate-y-12" />
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <h3 className="text-2xl md:text-4xl font-black text-white flex items-center gap-3">
                                        <span className="text-orange-500">#</span> {result.theme}
                                    </h3>
                                    <KakaoShareButton 
                                        title={`[테마 분석] ${result.theme}`}
                                        description={result.description || "AI가 분석한 이 테마의 핵심 기업과 전망을 확인해보세요."}
                                        url={`https://stock-trend-program.co.kr/theme?q=${result.theme}`}
                                        className="bg-[#FEE500] hover:bg-[#FEE500]/90 text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full md:w-auto shadow-lg shadow-[#FEE500]/10"
                                        buttonText="테마 분석 보기"
                                    />
                                </div>
                                <p className="text-lg text-gray-300 leading-relaxed border-l-4 border-orange-500 pl-4 py-1">
                                    {result.description}
                                </p>

                                <div className="mt-6 flex items-start gap-3 bg-red-900/20 p-4 rounded-xl border border-red-500/20 relative z-10">
                                    <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <div className="text-red-400 font-bold text-sm mb-1">핵심 리스크 (Risk Factor)</div>
                                        <p className="text-gray-300 text-sm">{result.risk_factor}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Theme Clock */}
                            <div className="bg-black/40 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                <h4 className="text-gray-400 text-sm font-bold mb-4 uppercase tracking-wider">Theme Lifecycle Clock</h4>

                                {/* Clock Visual */}
                                <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                                    {/* Clock Face */}
                                    <div className="absolute inset-0 rounded-full border-4 border-white/10 bg-white/5" />

                                    {/* Sectors */}
                                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500/30 rotate-[-45deg]" /> {/* Morning */}
                                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-r-red-500/30 rotate-[-45deg]" /> {/* Noon */}
                                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-orange-500/30 rotate-[-45deg]" /> {/* Evening */}
                                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-l-gray-500/30 rotate-[-45deg]" /> {/* Night */}

                                    {/* Hand */}
                                    <div
                                        className="absolute w-1 h-14 bg-gradient-to-t from-orange-500 to-yellow-300 rounded-full origin-bottom bottom-1/2 left-1/2 -translate-x-1/2 shadow-[0_0_15px_rgba(249,115,22,0.8)] transition-transform duration-1000 ease-out"
                                        style={{
                                            transform: `translateX(-50%) rotate(${result.lifecycle?.phase === 'Morning' ? '45deg' :
                                                result.lifecycle?.phase === 'Noon' ? '135deg' :
                                                    result.lifecycle?.phase === 'Evening' ? '225deg' : '315deg'
                                                })`
                                        }}
                                    />
                                    <div className="absolute w-3 h-3 bg-white rounded-full z-10 shadow-lg" />

                                    {/* Labels */}
                                    <span className="absolute top-2 text-[10px] text-blue-400 font-bold">오전(태동)</span>
                                    <span className="absolute right-2 text-[10px] text-red-500 font-bold">점심(급등)</span>
                                    <span className="absolute bottom-2 text-[10px] text-orange-400 font-bold">저녁(성숙)</span>
                                    <span className="absolute left-2 text-[10px] text-gray-500 font-bold">밤(쇠퇴)</span>
                                </div>

                                <div className="z-10 w-full">
                                    <div className="text-2xl font-black text-white mb-1">
                                        {result.lifecycle?.time || "12:00"}
                                    </div>
                                    <div className={`text-sm font-bold px-3 py-1 rounded-full inline-block mb-3 ${result.lifecycle?.phase === 'Morning' ? 'bg-blue-500/20 text-blue-400' :
                                        result.lifecycle?.phase === 'Noon' ? 'bg-red-500/20 text-red-400' :
                                            result.lifecycle?.phase === 'Evening' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {result.lifecycle?.phase === 'Morning' ? '태동기 (Morning)' :
                                            result.lifecycle?.phase === 'Noon' ? '성장기 (Noon)' :
                                                result.lifecycle?.phase === 'Evening' ? '성숙기 (Evening)' : '쇠퇴기 (Night)'}
                                    </div>

                                    {/* Investment Guide by Phase */}
                                    <div className={`w-full rounded-xl p-3 mt-1 text-left ${result.lifecycle?.phase === 'Morning' ? 'bg-blue-500/10 border border-blue-500/20' :
                                        result.lifecycle?.phase === 'Noon' ? 'bg-red-500/10 border border-red-500/20' :
                                            result.lifecycle?.phase === 'Evening' ? 'bg-orange-500/10 border border-orange-500/20' :
                                                'bg-gray-500/10 border border-gray-500/20'
                                        }`}>
                                        {result.lifecycle?.phase === 'Morning' && (
                                            <>
                                                <div className="text-blue-400 font-bold text-xs mb-1">ℹ️ 테마 초기 단계</div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                                    아직 많은 사람이 주목하지 않는 초기 단계입니다. 테마가 실현될지는 <strong className="text-yellow-400">불확실성이 높은</strong> 구간이며, 충분한 조사가 필요합니다.
                                                </p>
                                            </>
                                        )}
                                        {result.lifecycle?.phase === 'Noon' && (
                                            <>
                                                <div className="text-red-400 font-bold text-xs mb-1">⚠️ 과열 구간 주의</div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                                    모두가 주목하는 과열 구간입니다. 이미 가격이 많이 올랐을 가능성이 높아 <strong className="text-red-300">변동성이 큰 구간</strong>입니다. 투자 판단 전 충분한 분석이 필요합니다.
                                                </p>
                                            </>
                                        )}
                                        {result.lifecycle?.phase === 'Evening' && (
                                            <>
                                                <div className="text-orange-400 font-bold text-xs mb-1">📉 성숙 단계 진입</div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                                    테마의 열기가 식어가는 단계입니다. <strong className="text-orange-300">변동성이 줄어드는</strong> 시기이며, 향후 방향성에 대한 충분한 분석이 필요합니다.
                                                </p>
                                            </>
                                        )}
                                        {result.lifecycle?.phase === 'Night' && (
                                            <>
                                                <div className="text-gray-400 font-bold text-xs mb-1">💤 쇠퇴기 진입</div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                                    테마가 시장의 관심에서 벗어난 쇠퇴기입니다. <strong className="text-gray-300">거래량과 관심도가 감소</strong>하는 시기이며, 다음 사이클이 올 때까지 <strong className="text-yellow-400">관망</strong>이 필요한 구간입니다.
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {result.lifecycle?.comment && (
                                        <p className="text-[11px] text-gray-500 leading-tight mt-2 italic">
                                            "{result.lifecycle.comment}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Leaders & Followers */}
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Leaders */}
                            <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <div className="bg-gradient-to-r from-orange-500/20 to-transparent p-6 border-b border-white/10 flex justify-between items-center">
                                    <h4 className="text-xl font-black text-white flex items-center gap-2">
                                        <TrendingUp className="w-6 h-6 text-orange-400" />
                                        핵심 연관 기업 (Primary) <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded ml-2">v2.6</span>
                                    </h4>
                                </div>
                                <CleanStockList
                                    items={(result.leaders || []).map((stock: any) => {
                                        const quote = quotes[stock.symbol];
                                        return {
                                            symbol: stock.symbol,
                                            name: stock.name,
                                            price: stock.price || quote?.price || "-",
                                            change: stock.change || quote?.change || "-",
                                            // [New] Real/Fake Badge Logic
                                            badge: stock.is_real ?
                                                { label: "찐수혜", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: "🥇", reason: stock.reason } :
                                                { label: "주의", color: "bg-gray-500/20 text-gray-400 border-gray-500/50", icon: "💩", reason: stock.reason }
                                        };
                                    })}
                                    onItemClick={(sym) => router.push(`/discovery?q=${sym}`)}
                                    hideLabels={true}
                                />
                            </div>

                            {/* Followers */}
                            <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                <div className="bg-gradient-to-r from-blue-500/20 to-transparent p-6 border-b border-white/10 flex justify-between items-center">
                                    <h4 className="text-xl font-black text-white flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                        </div>
                                        주변 연관 기업 (Secondary) <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded ml-2">v2.6</span>
                                    </h4>
                                </div>
                                <CleanStockList
                                    items={(result.followers || []).map((stock: any) => {
                                        const quote = quotes[stock.symbol];
                                        return {
                                            symbol: stock.symbol,
                                            name: stock.name,
                                            price: stock.price || quote?.price || "-",
                                            change: stock.change || quote?.change || "-",
                                            // [New] Real/Fake Badge Logic
                                            badge: stock.is_real ?
                                                { label: "찐수혜", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: "🥇", reason: stock.reason } :
                                                { label: "주의", color: "bg-gray-500/20 text-gray-400 border-gray-500/50", icon: "💩", reason: stock.reason }
                                        };
                                    })}
                                    onItemClick={(sym) => router.push(`/discovery?q=${sym}`)}
                                    hideLabels={true}
                                />
                            </div>
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
            </div>
        </div>
    );
}
