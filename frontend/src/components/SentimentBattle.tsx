"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, User, Bot, Swords } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface SentimentBattleProps {
    symbol: string;
    aiScore: number; // 0-100
}

export default function SentimentBattle({ symbol, aiScore }: SentimentBattleProps) {
    const [voteStats, setVoteStats] = useState<any>(null);
    const [myVote, setMyVote] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, [symbol]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/vote/${symbol}`);
            const json = await res.json();
            if (json.status === "success") {
                setVoteStats(json.data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleVote = async (type: 'UP' | 'DOWN') => {
        if (myVote) return; // Prevent double voting per session

        try {
            await fetch(`${API_BASE_URL}/api/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, vote_type: type })
            });
            setMyVote(type);
            fetchStats(); // Refresh stats
        } catch (e) {
            console.error(e);
        }
    };

    if (!voteStats) return null;

    // AI Prediction: Score > 50 means UP
    const aiPrediction = aiScore >= 50 ? 'UP' : 'DOWN';
    const aiConfidence = Math.abs(aiScore - 50) * 2; // 50->0%, 100->100%

    return (
        <div className="bg-black/40 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Swords className="w-32 h-32 text-gray-500" />
            </div>

            <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                <Swords className="text-purple-400" /> Sentiment Battle
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* AI Side */}
                <div className={`p-4 rounded-2xl border ${aiPrediction === 'UP' ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/10 border-blue-500/30'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-gray-300">AI Prediction</span>
                    </div>
                    <div className="text-3xl font-black mb-1 flex items-center gap-2">
                        {aiPrediction === 'UP' ? <span className="text-red-400">RISING 📈</span> : <span className="text-blue-400">FALLING 📉</span>}
                    </div>
                    <p className="text-sm text-gray-500">Confidence: {aiConfidence}%</p>
                </div>

                {/* Crowd Side */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-gray-700 rounded-lg">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-gray-300">Crowd Wisdom</span>
                    </div>

                    <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden mb-4">
                        <div
                            className="absolute top-0 left-0 h-full bg-red-500 transition-all duration-500"
                            style={{ width: `${voteStats.UP_PERCENT}%` }}
                        />
                        <div
                            className="absolute top-0 right-0 h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${voteStats.DOWN_PERCENT}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <button
                            onClick={() => handleVote('UP')}
                            disabled={!!myVote}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${myVote === 'UP' ? 'bg-red-500 text-white' : 'hover:bg-red-500/20 text-red-400'}`}
                        >
                            <ThumbsUp className="w-4 h-4" /> {voteStats.UP_PERCENT}%
                        </button>
                        <button
                            onClick={() => handleVote('DOWN')}
                            disabled={!!myVote}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${myVote === 'DOWN' ? 'bg-blue-500 text-white' : 'hover:bg-blue-500/20 text-blue-400'}`}
                        >
                            {voteStats.DOWN_PERCENT}% <ThumbsDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
