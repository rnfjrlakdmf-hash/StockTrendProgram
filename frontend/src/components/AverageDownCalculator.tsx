"use client";

import { useState } from "react";
import { Calculator, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, DollarSign, BarChart3 } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface CalculationResult {
    current: {
        shares: number;
        avg_price: number;
        market_price: number;
        investment: number;
        value: number;
        loss: number;
        loss_rate: number;
    };
    additional: {
        amount: number;
        shares: number;
        ratio: number;
    };
    result: {
        new_avg_price: number;
        total_shares: number;
        total_investment: number;
        breakeven_price: number;
        breakeven_rate: number;
        avg_price_reduction: number;
        avg_price_reduction_rate: number;
    };
    message: string;
}

interface Scenario {
    name: string;
    additional_amount: number;
    result: CalculationResult["result"];
    risk_level: string;
    recommendation: string;
}

export default function AverageDownCalculator() {
    const [currentShares, setCurrentShares] = useState<string>("100");
    const [currentAvgPrice, setCurrentAvgPrice] = useState<string>("10000");
    const [currentPrice, setCurrentPrice] = useState<string>("8000");
    const [additionalAmount, setAdditionalAmount] = useState<string>("5000000");

    const [result, setResult] = useState<CalculationResult | null>(null);
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"basic" | "scenarios">("basic");

    const handleCalculate = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/calculator/average-down`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    current_shares: parseInt(currentShares),
                    current_avg_price: parseFloat(currentAvgPrice),
                    current_price: parseFloat(currentPrice),
                    additional_amount: parseFloat(additionalAmount)
                })
            });

            const data = await res.json();

            if (data.status === "success") {
                setResult(data.data);
            } else {
                setError(data.message || "계산 중 오류가 발생했습니다.");
            }
        } catch (e) {
            setError("서버 연결에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleCalculateScenarios = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/calculator/scenarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    current_shares: parseInt(currentShares),
                    current_avg_price: parseFloat(currentAvgPrice),
                    current_price: parseFloat(currentPrice),
                    max_budget: parseFloat(additionalAmount),
                    num_scenarios: 5
                })
            });

            const data = await res.json();

            if (data.status === "success") {
                setScenarios(data.data);
            } else {
                setError(data.message || "계산 중 오류가 발생했습니다.");
            }
        } catch (e) {
            setError("서버 연결에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (riskLevel: string) => {
        const colors: Record<string, string> = {
            "안전": "text-green-400 bg-green-500/20",
            "보통": "text-blue-400 bg-blue-500/20",
            "주의": "text-yellow-400 bg-yellow-500/20",
            "위험": "text-orange-400 bg-orange-500/20",
            "매우 위험": "text-red-400 bg-red-500/20"
        };
        return colors[riskLevel] || "text-gray-400 bg-gray-500/20";
    };

    return (
        <div className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-6">
                <Calculator className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">💧 물타기 계산기</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10">
                <button
                    onClick={() => setActiveTab("basic")}
                    className={`px-4 py-2 font-bold transition-all ${activeTab === "basic"
                            ? "text-white border-b-2 border-blue-400"
                            : "text-gray-400 hover:text-white"
                        }`}
                >
                    기본 계산
                </button>
                <button
                    onClick={() => setActiveTab("scenarios")}
                    className={`px-4 py-2 font-bold transition-all ${activeTab === "scenarios"
                            ? "text-white border-b-2 border-blue-400"
                            : "text-gray-400 hover:text-white"
                        }`}
                >
                    시나리오 비교
                </button>
            </div>

            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm text-gray-400 mb-2">현재 보유 주식 수</label>
                    <input
                        type="number"
                        value={currentShares}
                        onChange={(e) => setCurrentShares(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                        placeholder="100"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-2">현재 평단가 (원)</label>
                    <input
                        type="number"
                        value={currentAvgPrice}
                        onChange={(e) => setCurrentAvgPrice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                        placeholder="10000"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-2">현재 시장가 (원)</label>
                    <input
                        type="number"
                        value={currentPrice}
                        onChange={(e) => setCurrentPrice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                        placeholder="8000"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-2">
                        {activeTab === "basic" ? "추가 투자 금액 (원)" : "최대 예산 (원)"}
                    </label>
                    <input
                        type="number"
                        value={additionalAmount}
                        onChange={(e) => setAdditionalAmount(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
                        placeholder="5000000"
                    />
                </div>
            </div>

            {/* Calculate Button */}
            <button
                onClick={activeTab === "basic" ? handleCalculate : handleCalculateScenarios}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        계산 중...
                    </>
                ) : (
                    <>
                        <Calculator className="w-5 h-5" />
                        {activeTab === "basic" ? "계산하기" : "시나리오 비교하기"}
                    </>
                )}
            </button>

            {/* Error Message */}
            {error && (
                <div className="mt-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
                    <AlertTriangle className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* Results - Basic */}
            {activeTab === "basic" && result && (
                <div className="mt-6 space-y-4">
                    {/* Message */}
                    <div className={`p-4 rounded-xl border ${result.result.breakeven_rate < 3
                            ? "bg-green-500/20 border-green-500/50 text-green-400"
                            : result.result.breakeven_rate < 10
                                ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                                : "bg-red-500/20 border-red-500/50 text-red-400"
                        }`}>
                        <p className="font-bold text-lg">{result.message}</p>
                    </div>

                    {/* Current Status */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-400" />
                            현재 상황
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-400">보유 주식:</span>
                                <span className="text-white font-mono ml-2">{result.current.shares}주</span>
                            </div>
                            <div>
                                <span className="text-gray-400">평단가:</span>
                                <span className="text-white font-mono ml-2">{result.current.avg_price.toLocaleString()}원</span>
                            </div>
                            <div>
                                <span className="text-gray-400">현재가:</span>
                                <span className="text-white font-mono ml-2">{result.current.market_price.toLocaleString()}원</span>
                            </div>
                            <div>
                                <span className="text-gray-400">손실률:</span>
                                <span className="text-red-400 font-mono ml-2">{result.current.loss_rate.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Result */}
                    <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-500/30">
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            계산 결과
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300">새로운 평단가:</span>
                                <span className="text-white font-bold font-mono text-xl">
                                    {result.result.new_avg_price.toLocaleString()}원
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">평단가 하락:</span>
                                <span className="text-green-400 font-mono">
                                    ↓ {result.result.avg_price_reduction.toLocaleString()}원 ({result.result.avg_price_reduction_rate.toFixed(2)}%)
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">추가 매수:</span>
                                <span className="text-white font-mono">{result.additional.shares}주</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">총 보유:</span>
                                <span className="text-white font-mono">{result.result.total_shares}주</span>
                            </div>
                            <div className="border-t border-white/10 pt-3 mt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">손익분기점:</span>
                                    <span className="text-yellow-400 font-bold font-mono">
                                        {result.result.breakeven_price.toLocaleString()}원 (+{result.result.breakeven_rate.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results - Scenarios */}
            {activeTab === "scenarios" && scenarios.length > 0 && (
                <div className="mt-6 space-y-3">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-400" />
                        시나리오 비교
                    </h3>
                    {scenarios.map((scenario, idx) => (
                        <div
                            key={idx}
                            className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="text-white font-bold">{scenario.name}</h4>
                                    <p className="text-sm text-gray-400">
                                        추가 투자: {scenario.additional_amount.toLocaleString()}원
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskColor(scenario.risk_level)}`}>
                                    {scenario.risk_level}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-400">새 평단가:</span>
                                    <span className="text-white font-mono ml-2">
                                        {scenario.result.new_avg_price.toLocaleString()}원
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400">손익분기:</span>
                                    <span className="text-yellow-400 font-mono ml-2">
                                        +{scenario.result.breakeven_rate.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{scenario.recommendation}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
