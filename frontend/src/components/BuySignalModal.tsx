"use client";

import React from "react";
import { X, TrendingUp, DollarSign, ArrowRight } from "lucide-react";

interface BuySignalModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        stockName: string;
        stockCode: string;
        targetPrice: string;
        qty: string;
    } | null;
}

export default function BuySignalModal({ isOpen, onClose, data }: BuySignalModalProps) {
    if (!isOpen || !data) return null;

    const price = parseInt(data.targetPrice).toLocaleString();
    const amount = (parseInt(data.targetPrice) * parseInt(data.qty)).toLocaleString();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative bg-[#1a1b1e] border border-red-500/50 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl shadow-red-900/20">
                {/* Header Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-600/20 to-transparent" />

                <div className="p-6 relative">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold mb-6 animate-pulse">
                        <TrendingUp size={12} />
                        STRONG BUY SIGNAL
                    </div>

                    {/* Stock Info */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-white mb-1">{data.stockName}</h2>
                        <p className="text-gray-500 text-sm tracking-widest">{data.stockCode}</p>
                    </div>

                    {/* Price Details */}
                    <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-sm">목표 매수가</span>
                            <span className="text-white font-bold text-lg">{price}원</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-sm">추천 수량</span>
                            <span className="text-yellow-400 font-bold">{data.qty}주</span>
                        </div>
                        <div className="w-full h-px bg-white/10 my-3" />
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">총 예상 체결액</span>
                            <span className="text-red-400 font-bold text-lg">{amount}원</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <BrokerButton
                            name="토스증권"
                            color="bg-blue-600 hover:bg-blue-500"
                            onClick={() => {
                                navigator.clipboard.writeText(data.stockCode);
                                alert(`종목코드(${data.stockCode})가 복사되었습니다.\n토스증권 검색창에 붙여넣으세요!`);
                                window.location.href = "supertoss://";
                            }}
                        />
                        <BrokerButton
                            name="KB M-able"
                            color="bg-yellow-500 hover:bg-yellow-400 text-black"
                            onClick={() => {
                                navigator.clipboard.writeText(data.stockCode);
                                alert(`종목코드(${data.stockCode})가 복사되었습니다.\nKB증권으로 이동합니다.`);
                                window.location.href = "kb-mable://";
                            }}
                        />
                        <BrokerButton
                            name="미래에셋 m.Stock"
                            color="bg-orange-600 hover:bg-orange-500"
                            onClick={() => {
                                navigator.clipboard.writeText(data.stockCode);
                                alert(`종목코드(${data.stockCode})가 복사되었습니다.\n미래에셋으로 이동합니다.`);
                                window.location.href = "miraeasset-mstock://";
                            }}
                        />
                        <BrokerButton
                            name="NH 나무증권"
                            color="bg-green-600 hover:bg-green-500"
                            onClick={() => {
                                navigator.clipboard.writeText(data.stockCode);
                                alert(`종목코드(${data.stockCode})가 복사되었습니다.\n나무증권으로 이동합니다.`);
                                window.location.href = "nh-namuh://";
                            }}
                        />
                    </div>

                    <p className="text-center text-[10px] text-gray-600 mt-4">
                        * 종목코드가 자동 복사됩니다. 앱 실행 후 붙여넣으세요.
                    </p>
                </div>
            </div>
        </div>
    );
}

function BrokerButton({ name, color, onClick }: { name: string, color: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full py-3 rounded-xl font-bold text-white text-md transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 ${color}`}
        >
            {name} 실행 <ArrowRight size={16} />
        </button>
    );
}
