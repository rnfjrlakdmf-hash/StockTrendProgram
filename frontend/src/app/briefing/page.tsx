"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { BookOpen, Globe, TrendingUp, PlayCircle, Loader2, ExternalLink } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import Typewriter from "@/components/Typewriter";

interface BriefingData {
    title: string;
    summary: string;
    sentiment_score: number;
    sentiment_label: string;
    key_term: {
        term: string;
        definition: string;
    };
}

interface NewsItem {
    source: string;
    title: string;
    link: string;
    time: string;
}
interface MarketIndex {
    label: string;
    value: string;
    change: string;
    up: boolean;
}

export default function BriefingPage() {
    const [briefing, setBriefing] = useState<BriefingData | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [today, setToday] = useState("");

    useEffect(() => {
        // 날짜 설정
        const date = new Date();
        setToday(`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`);

        // 데이터 패칭
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/briefing`);
                const json = await res.json();

                if (json.status === "success") {
                    setBriefing(json.data.briefing);
                    setNews(json.data.news);
                    setMarketIndices(json.data.market.indices);
                }
            } catch (err) {
                console.error("Failed to fetch briefing:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Cleanup TTS on unmount
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const playBriefing = () => {
        if (!briefing) return;

        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }

        const text = `
            ${today} AI 투자 브리핑입니다.
            ${briefing.title}.
            ${briefing.summary}
            현재 시장 심리는 ${briefing.sentiment_label} 상태이며, 점수는 ${briefing.sentiment_score}점입니다.
            오늘의 용어는 ${briefing.key_term.term}, ${briefing.key_term.definition} 입니다.
            이상 AI 브리핑이었습니다. 성공적인 투자를 기원합니다.
        `;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => setIsPlaying(false);

        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen text-white flex flex-col">
                <Header title="AI 투자 브리핑" subtitle="시장의 핵심 인사이트를 분석 중입니다..." />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-10 text-white">
            <Header title="AI 투자 브리핑" subtitle="매일 아침 받아보는 시장의 핵심 인사이트" />


            <div className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Market Indices Ticker */}
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {marketIndices.map((idx, index) => (
                        <div key={index} className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl px-6 py-3 min-w-[140px] flex flex-col items-center">
                            <span className="text-xs text-gray-400 font-bold mb-1">{idx.label}</span>
                            <span className="text-lg font-bold text-white mb-1">{idx.value}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${idx.up ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {idx.change}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Hero Section: AI Summary */}
                <div className="rounded-3xl bg-gradient-to-br from-indigo-900/60 to-blue-900/60 border border-white/20 p-8 relative overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="absolute right-0 top-0 p-12 opacity-10">
                        <BookOpen className="w-64 h-64 text-white transform rotate-12" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">AI 일일 요약</span>
                            <span className="text-gray-300 text-sm font-semibold">{today}</span>
                        </div>

                        <h2 className="text-3xl font-bold mb-6 leading-tight drop-shadow-md">
                            {briefing?.title || "시장 데이터를 불러오는 중..."}
                        </h2>

                        <div className="space-y-4 max-w-3xl text-gray-100 leading-relaxed text-lg font-medium">
                            <p>
                                {briefing?.summary ? (
                                    <Typewriter text={briefing.summary} speed={20} />
                                ) : (
                                    "데이터가 없습니다."
                                )}
                            </p>
                        </div>

                        <button
                            onClick={playBriefing}
                            className={`mt-8 flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${isPlaying ? 'bg-red-100' : 'hover:bg-gray-200'}`}
                        >
                            {isPlaying ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> 재생 중... (클릭하여 정지)
                                </>
                            ) : (
                                <>
                                    <PlayCircle className="w-5 h-5" /> 오디오 요약 듣기 (TTS)
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Global News Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                <Globe className="w-5 h-5 text-blue-400" /> 글로벌 주요 뉴스
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {news.length > 0 ? news.map((item, idx) => (
                                <a
                                    key={idx}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block group rounded-2xl bg-black/40 border border-white/20 p-6 hover:bg-white/10 transition-all hover:border-white/30 shadow-lg"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                                            {item.source} • {isNaN(parseInt(item.time)) ? item.time : new Date(parseInt(item.time) * 1000).toLocaleTimeString()}
                                        </span>
                                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                                    </div>
                                    <h4 className="text-xl font-bold group-hover:text-blue-300 transition-colors text-white line-clamp-2">
                                        {item.title}
                                    </h4>
                                </a>
                            )) : (
                                <p className="text-gray-400">관련 뉴스가 없습니다.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Term & Sentiment */}
                    <div className="space-y-6">
                        {/* Term of the Day */}
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                <BookOpen className="w-5 h-5 text-yellow-400" /> 오늘의 용어
                            </h3>
                            <div className="rounded-2xl bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border border-yellow-500/30 p-6 shadow-lg">
                                <h4 className="text-lg font-bold text-yellow-200 mb-2">{briefing?.key_term?.term || "용어"}</h4>
                                <p className="text-sm text-gray-200 font-medium leading-relaxed">
                                    {briefing?.key_term?.definition || "정의를 불러오는 중입니다."}
                                </p>
                            </div>
                        </div>

                        {/* Market Sentiment */}
                        <div className="rounded-2xl bg-black/40 border border-white/20 p-6 shadow-lg">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">현재 시장 심리</h4>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-bold text-lg ${(briefing?.sentiment_score || 50) > 60 ? 'text-green-400' :
                                    (briefing?.sentiment_score || 50) < 40 ? 'text-red-400' : 'text-yellow-400'
                                    }`}>
                                    {briefing?.sentiment_label || "중립 (Neutral)"}
                                </span>
                                <span className="text-3xl font-black text-white">{briefing?.sentiment_score || 50}</span>
                            </div>
                            <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden border border-white/10">
                                <div
                                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-full transition-all duration-1000"
                                    style={{ width: `${briefing?.sentiment_score || 50}%` }}
                                />
                            </div>
                            <p className="text-xs text-center mt-3 text-gray-400">
                                {briefing?.sentiment_score && briefing.sentiment_score > 60 ? "시장이 과열 구간에 진입하고 있습니다." :
                                    briefing?.sentiment_score && briefing.sentiment_score < 40 ? "시장에 공포 심리가 우세합니다." :
                                        "시장이 방향성을 탐색하고 있습니다."}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
