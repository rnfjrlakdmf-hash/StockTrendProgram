"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, Volume2, TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

export default function EarningsPage() {
    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSearch = async () => {
        if (!searchInput) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/earnings/${searchInput.toUpperCase()}`);
            const json = await res.json();
            if (json.status === "success") {
                setResult(json.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pb-10">
            <Header />

            <div className="p-6 max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-white flex items-center justify-center gap-3">
                        <Volume2 className="w-10 h-10 text-pink-500" />
                        Earnings Whisper
                    </h1>
                    <p className="text-gray-400 text-lg">
                        실적 발표의 행간을 읽어드립니다. CEO의 목소리 톤과 숨겨진 의미를 파악하세요.
                    </p>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="티커 입력 (예: TSLA, NVDA)..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-lg focus:outline-none focus:border-pink-500/50 transition-colors"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6" />
                    <button
                        onClick={handleSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    >
                        분석
                    </button>
                </div>

                {loading && (
                    <div className="text-center py-20 text-pink-500">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                        <p className="animate-pulse text-lg">최신 뉴스 분석 및 행간 해석 중...</p>
                    </div>
                )}

                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        {/* Overall Verdict Card */}
                        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-pink-900/20 to-black p-8 backdrop-blur-md relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                {result.tone === 'Confident' || result.tone === 'Euphoric' ? (
                                    <TrendingUp className="w-40 h-40 text-pink-500" />
                                ) : (
                                    <TrendingDown className="w-40 h-40 text-gray-500" />
                                )}
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">CEO Tone</span>
                                </div>
                                <h2 className={`text-4xl font-black mb-6 ${result.tone === 'Confident' || result.tone === 'Euphoric' ? 'text-pink-400' :
                                        result.tone === 'Cautious' ? 'text-yellow-400' : 'text-gray-400'
                                    }`}>
                                    {result.tone}
                                </h2>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <h3 className="font-bold text-gray-200 mb-2 flex items-center gap-2">
                                        <Volume2 className="w-4 h-4 text-pink-500" /> Whisper Summary
                                    </h3>
                                    <p className="text-lg leading-relaxed text-gray-100">
                                        {result.summary}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Pros & Cons Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-white/5 bg-black/40 p-6">
                                <h3 className="text-green-400 font-bold text-xl mb-4 flex items-center gap-2">
                                    <ThumbsUp className="w-5 h-5" /> Positive Shouts
                                </h3>
                                <ul className="space-y-3">
                                    {result.pros.map((item: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 text-gray-300">
                                            <span className="text-green-500 mt-1.5">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-black/40 p-6">
                                <h3 className="text-red-400 font-bold text-xl mb-4 flex items-center gap-2">
                                    <ThumbsDown className="w-5 h-5" /> Negative Whispers
                                </h3>
                                <ul className="space-y-3">
                                    {result.cons.map((item: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 text-gray-300">
                                            <span className="text-red-500 mt-1.5">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
