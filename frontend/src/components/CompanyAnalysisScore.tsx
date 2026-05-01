"use client";

import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, Shield, Droplet, DollarSign, LineChart } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface AnalysisDetail {
    score: number;
    max: number;
    breakdown: Record<string, any>;
    label: string;
}

interface AnalysisData {
    symbol: string;
    company_name: string;
    score: number;
    grade: string;
    character: string;
    message: string;
    color: string;
    details: {
        profitability: AnalysisDetail;
        stability: AnalysisDetail;
        growth: AnalysisDetail;
        cashflow: AnalysisDetail;
    };
    analyzed_at: string;
}

interface CompanyAnalysisScoreProps {
    symbol: string;
    autoLoad?: boolean;
}

export default function CompanyAnalysisScore({ symbol, autoLoad = true }: CompanyAnalysisScoreProps) {
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (autoLoad && symbol) {
            loadAnalysisScore();
        }
    }, [symbol, autoLoad]);

    const loadAnalysisScore = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/analysis/financial-health/${symbol}`);
            const data = await res.json();

            if (data.status === "success") {
                setAnalysisData(data.data);
            } else {
                setError(data.message || "데이터 분석 실패");
            }
        } catch (e) {
            setError("서버 연결 실패");
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (color: string) => {
        const colors: Record<string, string> = {
            green: "from-green-500 to-emerald-500",
            blue: "from-blue-500 to-cyan-500",
            yellow: "from-yellow-500 to-orange-400",
            orange: "from-orange-500 to-red-400",
            red: "from-red-500 to-pink-500"
        };
        return colors[color] || "from-gray-500 to-gray-600";
    };

    const getScoreBarColor = (score: number, max: number) => {
        const percentage = (score / max) * 100;
        if (percentage >= 80) return "bg-green-500";
        if (percentage >= 60) return "bg-blue-500";
        if (percentage >= 40) return "bg-yellow-500";
        if (percentage >= 20) return "bg-orange-500";
        return "bg-red-500";
    };

    if (loading) {
        return (
            <div className="bg-black/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">데이터 분석 중...</p>
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

    if (!analysisData) return null;

    return (
        <div className="bg-black/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <BarChart2 className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">종목 데이터 분석 점수</h2>
            </div>

            {/* Main Score Display */}
            <div className={`bg-gradient-to-br ${getGradeColor(analysisData.color)} rounded-2xl p-8 mb-6`}>
                <div className="flex items-center justify-between">
                    {/* Character */}
                    <div className="text-8xl animate-bounce">
                        {analysisData.character}
                    </div>

                    {/* Score & Grade */}
                    <div className="text-right">
                        <div className="text-7xl font-bold text-white mb-2">
                            {analysisData.score}
                            <span className="text-3xl opacity-70">점</span>
                        </div>
                        <div className="text-2xl font-bold text-white/90 bg-white/20 px-4 py-2 rounded-lg inline-block">
                            {analysisData.grade}
                        </div>
                    </div>
                </div>

                {/* Message */}
                <p className="text-white text-lg mt-6 font-medium leading-relaxed">
                    {analysisData.message}
                </p>
            </div>

            {/* Detailed Scores */}
            <div className="space-y-4">
                <h3 className="text-white font-bold text-lg mb-4">상세 점수</h3>

                {/* Profitability */}
                <ScoreBar
                    icon={<DollarSign className="w-5 h-5" />}
                    label={analysisData.details.profitability.label}
                    score={analysisData.details.profitability.score}
                    max={analysisData.details.profitability.max}
                    color={getScoreBarColor(
                        analysisData.details.profitability.score,
                        analysisData.details.profitability.max
                    )}
                />

                {/* Stability */}
                <ScoreBar
                    icon={<Shield className="w-5 h-5" />}
                    label={analysisData.details.stability.label}
                    score={analysisData.details.stability.score}
                    max={analysisData.details.stability.max}
                    color={getScoreBarColor(
                        analysisData.details.stability.score,
                        analysisData.details.stability.max
                    )}
                />

                {/* Growth */}
                <ScoreBar
                    icon={<TrendingUp className="w-5 h-5" />}
                    label={analysisData.details.growth.label}
                    score={analysisData.details.growth.score}
                    max={analysisData.details.growth.max}
                    color={getScoreBarColor(
                        analysisData.details.growth.score,
                        analysisData.details.growth.max
                    )}
                />

                {/* Cashflow */}
                <ScoreBar
                    icon={<Droplet className="w-5 h-5" />}
                    label={analysisData.details.cashflow.label}
                    score={analysisData.details.cashflow.score}
                    max={analysisData.details.cashflow.max}
                    color={getScoreBarColor(
                        analysisData.details.cashflow.score,
                        analysisData.details.cashflow.max
                    )}
                />
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-gray-500">
                분석 시각: {new Date(analysisData.analyzed_at).toLocaleString('ko-KR')}
            </div>
        </div>
    );
}

// Score Bar Component
interface ScoreBarProps {
    icon: React.ReactNode;
    label: string;
    score: number;
    max: number;
    color: string;
}

function ScoreBar({ icon, label, score, max, color }: ScoreBarProps) {
    const percentage = (score / max) * 100;

    return (
        <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white">
                    {icon}
                    <span className="font-bold">{label}</span>
                </div>
                <span className="text-white font-mono font-bold">
                    {score}/{max}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-1000 ease-out rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
