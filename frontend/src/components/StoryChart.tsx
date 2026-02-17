"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Calendar, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Label } from "recharts";
import { API_BASE_URL } from "@/lib/config";

interface StoryPoint {
    date: string;
    price: number;
    icon: string;
    title: string;
    description: string;
    impact: "positive" | "negative" | "neutral";
    change: number;
    type: string;
    news?: {
        title: string;
        link: string;
        publisher?: string;
    };
    disclosure?: {
        title: string;
        link: string;
        submitter?: string;
    };
}

interface ChartData {
    date: string;
    price: number;
    volume: number;
}

interface StoryChartProps {
    symbol: string;
    period?: string;
}

export default function StoryChart({ symbol, period = "1y" }: StoryChartProps) {
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [stories, setStories] = useState<StoryPoint[]>([]);
    const [selectedStory, setSelectedStory] = useState<StoryPoint | null>(null);
    const [hoveredStory, setHoveredStory] = useState<StoryPoint | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        loadStoryData();
    }, [symbol, period]);

    const loadStoryData = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/chart/story/${symbol}?period=${period}`);
            const data = await res.json();

            if (data.status === "success") {
                setChartData(data.data.price_data);
                setStories(data.data.stories);
            } else {
                setError(data.message || "스토리 로드 실패");
            }
        } catch (e) {
            setError("서버 연결 실패");
        } finally {
            setLoading(false);
        }
    };

    const getImpactColor = (impact: string) => {
        if (impact === "positive") return "#10b981";
        if (impact === "negative") return "#ef4444";
        return "#6b7280";
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="bg-black/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">역사를 불러오는 중...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/20 border border-red-500/50 rounded-3xl p-8 text-center">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-black/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">📖 주식 위인전</h2>
                </div>
                <div className="text-sm text-gray-400">
                    총 {stories.length}개의 역사적 순간
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white/5 rounded-2xl p-6 mb-6">
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis
                            dataKey="date"
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                            formatter={(value: any) => [`₩${value.toLocaleString()}`, '가격']}
                            labelFormatter={(label) => formatDate(label)}
                        />
                        <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                        />

                        {/* Story Points */}
                        {stories.map((story, idx) => (
                            <ReferenceDot
                                key={idx}
                                x={story.date}
                                y={story.price}
                                r={8}
                                fill={getImpactColor(story.impact)}
                                stroke="#fff"
                                strokeWidth={2}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelectedStory(story)}
                                onMouseEnter={() => setHoveredStory(story)}
                                onMouseLeave={() => setHoveredStory(null)}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Story Timeline */}
            <div className="space-y-3">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    타임라인
                </h3>

                <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                    {stories.map((story, idx) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedStory(story)}
                            className={`
                                bg-white/5 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all
                                border-l-4 ${story.impact === 'positive'
                                    ? 'border-green-500'
                                    : story.impact === 'negative'
                                        ? 'border-red-500'
                                        : 'border-gray-500'
                                }
                                ${selectedStory?.date === story.date ? 'ring-2 ring-blue-500' : ''}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="text-3xl">{story.icon}</div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-white font-bold">{story.title}</h4>
                                        {story.change !== 0 && (
                                            <span className={`text-sm font-mono ${story.change > 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {story.change > 0 ? '+' : ''}{story.change.toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400 mb-2">{story.description}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(story.date)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Selected Story Modal */}
            {selectedStory && isMounted && typeof window !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedStory(null)}
                >
                    <div
                        className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl max-w-2xl w-full p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Icon */}
                        <div className="text-8xl text-center mb-6 animate-bounce">
                            {selectedStory.icon}
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl font-bold text-white text-center mb-4">
                            {selectedStory.title}
                        </h2>

                        {/* Date & Change */}
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Calendar className="w-4 h-4" />
                                {formatDate(selectedStory.date)}
                            </div>
                            {selectedStory.change !== 0 && (
                                <div className={`flex items-center gap-2 font-bold ${selectedStory.change > 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {selectedStory.change > 0 ? (
                                        <TrendingUp className="w-4 h-4" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4" />
                                    )}
                                    {selectedStory.change > 0 ? '+' : ''}{selectedStory.change.toFixed(1)}%
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <p className="text-gray-300 text-lg text-center leading-relaxed mb-6">
                            {selectedStory.description}
                        </p>

                        {/* News Link (if exists) */}
                        {selectedStory.news && selectedStory.news.title && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">📰</div>
                                    <div className="flex-1">
                                        <p className="text-sm text-blue-400 font-bold mb-1">관련 뉴스</p>
                                        <a
                                            href={selectedStory.news.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-white hover:text-blue-300 transition-colors line-clamp-2"
                                        >
                                            {selectedStory.news.title}
                                        </a>
                                        {selectedStory.news.publisher && (
                                            <p className="text-xs text-gray-500 mt-1">{selectedStory.news.publisher}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Disclosure Link (if exists) */}
                        {selectedStory.disclosure && selectedStory.disclosure.title && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">📝</div>
                                    <div className="flex-1">
                                        <p className="text-sm text-yellow-400 font-bold mb-1">관련 공시</p>
                                        <a
                                            href={selectedStory.disclosure.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-white hover:text-yellow-300 transition-colors line-clamp-2"
                                        >
                                            {selectedStory.disclosure.title}
                                        </a>
                                        {selectedStory.disclosure.submitter && (
                                            <p className="text-xs text-gray-500 mt-1">{selectedStory.disclosure.submitter}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Price */}
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-400 mb-1">당시 주가</p>
                            <p className="text-2xl font-bold text-white font-mono">
                                ₩{selectedStory.price.toLocaleString()}
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedStory(null)}
                            className="mt-6 w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            닫기
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
