"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { Search, Loader2, ArrowRight, TrendingUp, AlertTriangle, Layers } from "lucide-react";

export default function ThemePage() {
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const handleAnalyze = async () => {
        if (!keyword) return;
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE_URL}/api/theme/${keyword}`);
            const json = await res.json();

            if (json.status === "success" && json.data) {
                setResult(json.data);
            } else {
                setError("분석 정보를 불러오지 못했습니다. 키워드를 변경해보세요.");
            }
        } catch (err) {
            console.error(err);
            setError("서버 연결에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

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
                        {/* Summary Card */}
                        <div className="bg-gradient-to-br from-orange-900/20 to-black border border-orange-500/30 rounded-3xl p-8 relative overflow-hidden">
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

                        {/* Stocks Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Leaders */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <TrendingUp className="text-red-400" /> 대장주 (Leaders)
                                </h4>
                                <div className="space-y-4">
                                    {result.leaders.map((stock: any, i: number) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-red-500/30 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center font-bold text-red-400">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg text-white">{stock.symbol} <span className="text-sm font-normal text-gray-400">{stock.name}</span></div>
                                                <p className="text-sm text-gray-400 mt-1">{stock.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Followers */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Layers className="text-blue-400" /> 관련주 (Followers)
                                </h4>
                                <div className="space-y-4">
                                    {result.followers.map((stock: any, i: number) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-blue-500/30 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-400">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg text-white">{stock.symbol} <span className="text-sm font-normal text-gray-400">{stock.name}</span></div>
                                                <p className="text-sm text-gray-400 mt-1">{stock.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
