"use client";

import { useState } from "react";
import { Shield, TrendingDown, TrendingUp, Target, Bell, X, Crosshair } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface PriceAlertSetupProps {
    symbol: string;
    currentPrice: number;
    buyPrice?: number;
    quantity?: number;
}

export default function PriceAlertSetup({ symbol, currentPrice, buyPrice, quantity }: PriceAlertSetupProps) {
    const [mode, setMode] = useState<'shield' | 'price' | 'sniper'>('shield');
    // Sniper Alert State
    const [sniperType, setSniperType] = useState<string>("RSI_OVERSOLD");
    
    // Manual Input States
    const [manualStopLoss, setManualStopLoss] = useState<number>(0);
    const [manualTakeProfit, setManualTakeProfit] = useState<number>(0);

    const [stopLossEnabled, setStopLossEnabled] = useState(false);
    const [stopLossThreshold, setStopLossThreshold] = useState(3);

    const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
    const [takeProfitThreshold, setTakeProfitThreshold] = useState(5);

    const [targetPriceEnabled, setTargetPriceEnabled] = useState(false);
    const [targetPrice, setTargetPrice] = useState(currentPrice * 1.1);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleActivate = async () => {
        if (mode !== 'sniper' && !stopLossEnabled && !takeProfitEnabled && !targetPriceEnabled) {
            setMessage("최소 하나의 알림을 활성화해주세요.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const userId = localStorage.getItem("user_id") || "guest";
            const alerts = [];

            if (mode === 'sniper') {
                alerts.push({
                    symbol: symbol.toUpperCase(),
                    alert_type: sniperType,
                    target_price: 0,
                    condition: "above",
                    chat_id: localStorage.getItem("telegram_chat_id") || ""
                });
            } else {
                // Price Alerts (Shield/Price modes)
                // 손절 알림
                if (stopLossEnabled) {
                    let threshold = stopLossThreshold;
                    if (mode === 'price' && manualStopLoss > 0 && currentPrice > 0) {
                        threshold = ((currentPrice - manualStopLoss) / currentPrice) * 100;
                    }
                    alerts.push({
                        symbol,
                        type: "stop_loss",
                        buy_price: buyPrice || currentPrice,
                        threshold: parseFloat(threshold.toFixed(2)),
                        quantity
                    });
                }

                // 익절 알림
                if (takeProfitEnabled) {
                    let threshold = takeProfitThreshold;
                    if (mode === 'price' && manualTakeProfit > 0 && currentPrice > 0) {
                        threshold = ((manualTakeProfit - currentPrice) / currentPrice) * 100;
                    }
                    alerts.push({
                        symbol,
                        type: "take_profit",
                        buy_price: buyPrice || currentPrice,
                        threshold: parseFloat(threshold.toFixed(2)),
                        quantity
                    });
                }

                // 목표가 알림
                if (targetPriceEnabled) {
                    alerts.push({
                        symbol,
                        type: "target_price",
                        target_price: targetPrice
                    });
                }
            }

            // API 호출
            for (const alert of alerts) {
                const endpoint = mode === 'sniper' ? `${API_BASE_URL}/api/alerts` : `${API_BASE_URL}/api/alerts/price`;
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User-Id": userId
                    },
                    body: JSON.stringify(alert)
                });

                const data = await res.json();
                if (data.status !== "success") {
                    throw new Error(data.message);
                }
            }

            setMessage("✅ 알림이 설정되었습니다!");
            setTimeout(() => setMessage(""), 3000);
        } catch (e: any) {
            setMessage(`❌ ${e.message || "알림 설정 실패"}`);
        } finally {
            setLoading(false);
        }
    };

    const calculateStopLossPrice = () => {
        const base = buyPrice || currentPrice;
        return base * (1 - stopLossThreshold / 100);
    };

    const calculateTakeProfitPrice = () => {
        const base = buyPrice || currentPrice;
        return base * (1 + takeProfitThreshold / 100);
    };

    return (
        <div className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-blue-400" />
                    <h3 className="text-xl font-bold text-white">
                        {mode === 'shield' ? '🛡️ 회의 중 방어막' : mode === 'price' ? '🔔 가격 지정 알림' : '🎯 시그널 스나이퍼'}
                    </h3>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-white/10 rounded-lg p-1">
                    <button
                        onClick={() => setMode('shield')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'shield' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        방어막 (%)
                    </button>
                    <button
                        onClick={() => setMode('price')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'price' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        지정가 (₩)
                    </button>
                    <button
                        onClick={() => setMode('sniper')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'sniper' ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        스나이퍼
                    </button>
                </div>
            </div>

            <p className="text-sm text-gray-400 mb-6">
                {mode === 'shield'
                    ? <><span className="text-yellow-400 font-bold">퍼센트(%)</span> 로 감시 조건을 설정합니다.</>
                    : mode === 'price'
                        ? <><span className="text-yellow-400 font-bold">특정 가격</span> 도달 시 알림을 받습니다.</>
                        : <><span className="text-purple-400 font-bold">기술적 지표</span> 변화를 실시간 감시합니다.</>
                }
            </p>

            {/* Sniper Options */}
            {mode === 'sniper' && (
                <div className="grid grid-cols-2 gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <button
                        onClick={() => setSniperType("RSI_OVERSOLD")}
                        className={`p-3 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${sniperType === "RSI_OVERSOLD" ? "bg-green-500/20 border-green-500 text-green-300 shadow-lg shadow-green-900/20" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                    >
                        <span className="text-xl">💎</span>
                        RSI 과매도
                    </button>
                    <button
                        onClick={() => setSniperType("GOLDEN_CROSS")}
                        className={`p-3 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${sniperType === "GOLDEN_CROSS" ? "bg-purple-500/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-900/20" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                    >
                        <span className="text-xl">🚀</span>
                        골든크로스
                    </button>
                    <button
                        onClick={() => setSniperType("RSI_OVERBOUGHT")}
                        className={`p-3 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${sniperType === "RSI_OVERBOUGHT" ? "bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-lg shadow-yellow-900/20" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                    >
                        <span className="text-xl">⚠️</span>
                        RSI 과매수
                    </button>
                    <button
                        onClick={() => setSniperType("PRICE_DROP")}
                        className={`p-3 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${sniperType === "PRICE_DROP" ? "bg-red-500/20 border-red-500 text-red-300 shadow-lg shadow-red-900/20" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
                    >
                        <span className="text-xl">📉</span>
                        급락 포착
                    </button>
                </div>
            )}

            {/* Price-based Settings */}
            {mode !== 'sniper' && (
                <div className="space-y-6">
                    {/* 손절 설정 */}
                    <div>
                        <label className="flex items-center gap-3 mb-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={stopLossEnabled}
                                onChange={(e) => setStopLossEnabled(e.target.checked)}
                                className="w-5 h-5 rounded"
                                disabled={mode === 'shield' && !buyPrice}
                            />
                            <div className="flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-red-400" />
                                <span className="text-white font-bold">손절 알림 ({mode === 'shield' ? 'Stop Loss' : 'Price Drop'})</span>
                            </div>
                        </label>

                        {stopLossEnabled && (
                            <div className="ml-8 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                {mode === 'shield' ? (
                                    <>
                                        <p className="text-red-400 mb-3 text-sm">
                                            📉 {stopLossThreshold}% 하락 시 알림 (약 ₩{calculateStopLossPrice().toLocaleString(undefined, { maximumFractionDigits: 0 })})
                                        </p>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={stopLossThreshold}
                                            onChange={(e) => setStopLossThreshold(Number(e.target.value))}
                                            className="w-full accent-red-500"
                                        />
                                    </>
                                ) : (
                                    <input
                                        type="number"
                                        value={manualStopLoss}
                                        onChange={(e) => setManualStopLoss(Number(e.target.value))}
                                        placeholder="손절가 입력"
                                        className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* 익절 설정 */}
                    <div>
                        <label className="flex items-center gap-3 mb-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={takeProfitEnabled}
                                onChange={(e) => setTakeProfitEnabled(e.target.checked)}
                                className="w-5 h-5 rounded"
                                disabled={mode === 'shield' && !buyPrice}
                            />
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                                <span className="text-white font-bold">익절 알림 ({mode === 'shield' ? 'Take Profit' : 'Price Rise'})</span>
                            </div>
                        </label>

                        {takeProfitEnabled && (
                            <div className="ml-8 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                                {mode === 'shield' ? (
                                    <>
                                        <p className="text-green-400 mb-3 text-sm">
                                            📈 {takeProfitThreshold}% 상승 시 알림 (약 ₩{calculateTakeProfitPrice().toLocaleString(undefined, { maximumFractionDigits: 0 })})
                                        </p>
                                        <input
                                            type="range"
                                            min="3"
                                            max="20"
                                            value={takeProfitThreshold}
                                            onChange={(e) => setTakeProfitThreshold(Number(e.target.value))}
                                            className="w-full accent-green-500"
                                        />
                                    </>
                                ) : (
                                    <input
                                        type="number"
                                        value={manualTakeProfit}
                                        onChange={(e) => setManualTakeProfit(Number(e.target.value))}
                                        placeholder="익절가 입력"
                                        className="w-full bg-black/40 border border-green-500/30 rounded-lg px-3 py-2 text-white"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* 목표가 설정 */}
                    <div>
                        <label className="flex items-center gap-3 mb-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={targetPriceEnabled}
                                onChange={(e) => setTargetPriceEnabled(e.target.checked)}
                                className="w-5 h-5 rounded"
                            />
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-blue-400" />
                                <span className="text-white font-bold">최종 목표가 (Target)</span>
                            </div>
                        </label>

                        {targetPriceEnabled && (
                            <div className="ml-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                                <input
                                    type="number"
                                    value={targetPrice}
                                    onChange={(e) => setTargetPrice(Number(e.target.value))}
                                    className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 메시지 */}
            {message && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${message.startsWith('✅')
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {message}
                </div>
            )}

            {/* 활성화 버튼 */}
            <button
                onClick={handleActivate}
                disabled={loading || (mode !== 'sniper' && !stopLossEnabled && !takeProfitEnabled && !targetPriceEnabled)}
                className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Bell className="w-5 h-5" />}
                {mode === 'sniper' ? '스나이퍼 감시 시작' : mode === 'shield' ? '방어막 가동하기' : '알림 등록하기'}
            </button>
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
