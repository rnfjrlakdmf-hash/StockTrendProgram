"use client";

import { useState } from "react";
import { Shield, TrendingDown, TrendingUp, Target, Bell, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface PriceAlertSetupProps {
    symbol: string;
    currentPrice: number;
    buyPrice?: number;
    quantity?: number;
}

export default function PriceAlertSetup({ symbol, currentPrice, buyPrice, quantity }: PriceAlertSetupProps) {
    const [mode, setMode] = useState<'shield' | 'price'>('shield');
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
        if (!stopLossEnabled && !takeProfitEnabled && !targetPriceEnabled) {
            setMessage("최소 하나의 알림을 활성화해주세요.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const userId = localStorage.getItem("user_id") || "guest";
            const alerts = [];

            // 손절 알림
            if (stopLossEnabled) {
                let threshold = stopLossThreshold;
                if (mode === 'price' && manualStopLoss > 0 && currentPrice > 0) {
                    // Convert Price to Drop % (Approx) for record, or use threshold as logic
                    // Backend expects 'threshold' for stop_loss as percentage drop?
                    // Let's check backend: "threshold: 3 (3% hard drop)"
                    // If we want absolute price, maybe we need to support it or convert?
                    // Conversion: (1 - manual / current) * 100
                    threshold = ((currentPrice - manualStopLoss) / currentPrice) * 100;
                }

                alerts.push({
                    symbol,
                    type: "stop_loss",
                    buy_price: buyPrice || currentPrice, // If manual, base on current if no buy price
                    threshold: parseFloat(threshold.toFixed(2)),
                    quantity
                });
            }

            // 익절 알림
            if (takeProfitEnabled) {
                let threshold = takeProfitThreshold;
                if (mode === 'price' && manualTakeProfit > 0 && currentPrice > 0) {
                    // Conversion: (manual / current - 1) * 100
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

            // API 호출
            for (const alert of alerts) {
                const res = await fetch(`${API_BASE_URL}/api/alerts/price`, {
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
                        {mode === 'shield' ? '🛡️ 회의 중 방어막' : '🔔 가격 지정 알림'}
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
                </div>
            </div>

            <p className="text-sm text-gray-400 mb-6">
                {mode === 'shield'
                    ? <><span className="text-yellow-400 font-bold">퍼센트(%)</span> 로 감시 조건을 설정합니다.</>
                    : <><span className="text-yellow-400 font-bold">특정 가격</span> 도달 시 알림을 받습니다.</>
                }
            </p>

            {/* 손절 설정 */}
            <div className="mb-6">
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
                                <div className="flex justify-between text-xs text-gray-400 mt-2">
                                    <span>1%</span>
                                    <span className="text-red-400 font-bold">{stopLossThreshold}%</span>
                                    <span>10%</span>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs text-red-300">알림 받을 가격 (원)</label>
                                <input
                                    type="number"
                                    value={manualStopLoss}
                                    onChange={(e) => setManualStopLoss(Number(e.target.value))}
                                    placeholder={currentPrice.toString()}
                                    className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white font-mono focus:border-red-500 outline-none"
                                />
                                {manualStopLoss > 0 && currentPrice > 0 && (
                                    <p className="text-xs text-gray-400 text-right">
                                        현재가 대비 <span className="text-red-400">{((manualStopLoss - currentPrice) / currentPrice * 100).toFixed(2)}%</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {mode === 'shield' && !buyPrice && stopLossEnabled && (
                    <p className="ml-8 text-xs text-yellow-400">기준가 정보가 필요합니다 (지정가 모드 사용 권장)</p>
                )}
            </div>

            {/* 익절 설정 */}
            <div className="mb-6">
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
                                <div className="flex justify-between text-xs text-gray-400 mt-2">
                                    <span>3%</span>
                                    <span className="text-green-400 font-bold">{takeProfitThreshold}%</span>
                                    <span>20%</span>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs text-green-300">알림 받을 가격 (원)</label>
                                <input
                                    type="number"
                                    value={manualTakeProfit}
                                    onChange={(e) => setManualTakeProfit(Number(e.target.value))}
                                    placeholder={currentPrice.toString()}
                                    className="w-full bg-black/40 border border-green-500/30 rounded-lg px-3 py-2 text-white font-mono focus:border-green-500 outline-none"
                                />
                                {manualTakeProfit > 0 && currentPrice > 0 && (
                                    <p className="text-xs text-gray-400 text-right">
                                        현재가 대비 <span className="text-green-400">+{((manualTakeProfit - currentPrice) / currentPrice * 100).toFixed(2)}%</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {mode === 'shield' && !buyPrice && takeProfitEnabled && (
                    <p className="ml-8 text-xs text-yellow-400">기준가 정보가 필요합니다 (지정가 모드 사용 권장)</p>
                )}
            </div>

            {/* 목표가 설정 (Common) */}
            <div className="mb-6">
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
                        <p className="text-blue-400 mb-3 text-sm">
                            🎯 목표가 도달 시 알림
                        </p>
                        <input
                            type="number"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(Number(e.target.value))}
                            className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2 text-white font-mono"
                            placeholder="목표가 입력"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            현재가 대비 {((targetPrice / currentPrice - 1) * 100).toFixed(1)}%
                        </p>
                    </div>
                )}
            </div>

            {/* 메시지 */}
            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('✅')
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {message}
                </div>
            )}

            {/* 활성화 버튼 */}
            <button
                onClick={handleActivate}
                disabled={loading || (!stopLossEnabled && !takeProfitEnabled && !targetPriceEnabled)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        설정 중...
                    </>
                ) : (
                    <>
                        <Bell className="w-5 h-5" />
                        {mode === 'shield' ? '방어막 가동하기' : '알림 등록하기'}
                    </>
                )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
                💡 알림은 앱 내 알림센터에서 확인할 수 있습니다
            </p>
        </div>
    );
}
