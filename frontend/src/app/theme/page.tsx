"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, Loader2, ArrowRight, TrendingUp, AlertTriangle, Layers } from "lucide-react";
import CleanStockList from "@/components/CleanStockList";

export default function ThemePage() {
    const router = useRouter();
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const [quotes, setQuotes] = useState<Record<string, any>>({});

    const handleAnalyze = async () => {
        if (!keyword) return;
        setLoading(true);
        setError("");

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            const res = await fetch(`${API_BASE_URL}/api/theme/${keyword}`, {
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
                setResult(json.data);
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

    // Fetch quote data when result changes
    useEffect(() => {
        if (!result) return;

        const fetchQuotes = async () => {
            const allSymbols = [
                ...(result.leaders || []).map((s: any) => s.symbol),
                ...(result.followers || []).map((s: any) => s.symbol)
            ];

            const newQuotes: Record<string, any> = {};

            for (const symbol of allSymbols) {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/quote/${symbol}`);
                    const json = await res.json();
                    if (json.status === "success" && json.data) {
                        newQuotes[symbol] = json.data;
                    }
                } catch (e) {
                    console.error(`Failed to fetch quote for ${symbol}:`, e);
                }
            }

            setQuotes(newQuotes);
        };

        fetchQuotes();
    }, [result]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleAnalyze();
    };

    const suggestedThemes = ["비만치료제", "온디바이스 AI", "저PBR", "초전도체", "우주항공", "로봇"];

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="이슈 테마 분석" subtitle="Find the Next Big Thing." />

            <div className="max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Search Hero */}
                <div className="text-center space-y-6 py-10">
                    <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-orange-400 to-red-400">
                        What is Trending Now?
                    </h2>
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

                    <div className="flex flex-wrap justify-center gap-2 text-sm">
                        <span className="text-gray-500 mr-2">인기 검색:</span>
                        {suggestedThemes.map(t => (
                            <button
                                key={t}
                                onClick={() => { setKeyword(t); requestAnimationFrame(() => handleAnalyze()); }}
                                className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-300"
                            >
                                #{t}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-200 text-center">
                        {error}
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
                                <h3 className="text-3xl font-bold text-orange-100 mb-4 flex items-center gap-3 relative z-10">
                                    <span className="text-orange-500">#</span> {result.theme}
                                </h3>
                                <p className="text-xl text-gray-200 leading-relaxed font-medium relative z-10">
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
                                                <div className="text-blue-400 font-bold text-xs mb-1">✅ 초기 진입 기회</div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                                    아직 많은 사람이 주목하지 않는 초기 단계입니다. <strong className="text-blue-300">선점 투자에 유리</strong>하지만, 테마가 실패할 위험도 있으므로 <strong className="text-yellow-400">소액 분할매수</strong>를 추천합니다.
                                                </p>
                                            </>
                                        )}
                                        {result.lifecycle?.phase === 'Noon' && (
                                            <>
                                                <div className="text-red-400 font-bold text-xs mb-1">⚠️ 고점 매수 주의</div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                                    모두가 주목하는 과열 구간입니다. 이미 가격이 많이 올랐을 가능성이 높아 <strong className="text-red-300">지금 진입하면 고점에 물릴 위험</strong>이 큽니다. 기존 보유자는 <strong className="text-yellow-400">일부 익절</strong>을 고려하세요.
                                                </p>
                                            </>
                                        )}
                                        {result.lifecycle?.phase === 'Evening' && (
                                            <>
                                                <div className="text-orange-400 font-bold text-xs mb-1">📉 수익 실현 타이밍</div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                                    테마의 열기가 식어가는 단계입니다. <strong className="text-red-300">신규 진입은 비추천</strong>합니다. 보유 중이라면 <strong className="text-yellow-400">단계적으로 매도</strong>하여 수익을 확보하세요.
                                                </p>
                                            </>
                                        )}
                                        {result.lifecycle?.phase === 'Night' && (
                                            <>
                                                <div className="text-gray-400 font-bold text-xs mb-1">🚫 투자 비추천</div>
                                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                                    테마가 시장의 관심에서 벗어난 쇠퇴기입니다. <strong className="text-red-400">신규 투자는 피하세요.</strong> 다음 사이클이 올 때까지 <strong className="text-yellow-400">관망</strong>을 추천합니다.
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

                        {/* Stocks Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Leaders */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-0 md:p-6">
                                <div className="p-4 md:p-0 pb-0 flex items-center gap-2 mb-2 md:mb-6">
                                    <TrendingUp className="text-red-400 w-5 h-5" />
                                    <h4 className="text-xl font-bold text-white">대장주 (Leaders)</h4>
                                </div>
                                <CleanStockList
                                    items={result.leaders.map((stock: any) => {
                                        const quote = quotes[stock.symbol];
                                        return {
                                            symbol: stock.symbol,
                                            name: stock.name,
                                            price: quote?.price || "-",
                                            change: quote?.change || "-",
                                            // [New] Real/Fake Badge Logic
                                            badge: stock.is_real ?
                                                { label: "찐수혜", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: "🥇", reason: stock.reason } :
                                                { label: "주의", color: "bg-gray-500/20 text-gray-400 border-gray-500/50", icon: "💩", reason: stock.reason }
                                        };
                                    })}
                                    onItemClick={(sym) => router.push(`/discovery?q=${sym}`)}
                                />
                            </div>

                            {/* Followers */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-0 md:p-6">
                                <div className="p-4 md:p-0 pb-0 flex items-center gap-2 mb-2 md:mb-6">
                                    <Layers className="text-blue-400 w-5 h-5" />
                                    <h4 className="text-xl font-bold text-white">관련주 (Followers)</h4>
                                </div>
                                <CleanStockList
                                    items={result.followers.map((stock: any) => {
                                        const quote = quotes[stock.symbol];
                                        return {
                                            symbol: stock.symbol,
                                            name: stock.name,
                                            price: quote?.price || "-",
                                            change: quote?.change || "-",
                                            // [New] Real/Fake Badge Logic
                                            badge: stock.is_real ?
                                                { label: "찐수혜", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: "🥇", reason: stock.reason } :
                                                { label: "주의", color: "bg-gray-500/20 text-gray-400 border-gray-500/50", icon: "💩", reason: stock.reason }
                                        };
                                    })}
                                    onItemClick={(sym) => router.push(`/discovery?q=${sym}`)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
