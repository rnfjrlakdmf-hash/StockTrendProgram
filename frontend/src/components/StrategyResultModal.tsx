"use client";

import React from "react";
import { X, Search, TrendingUp, TrendingDown, Target, BarChart3, Coins } from "lucide-react";

interface StockResult {
    symbol: string;
    name: string;
    price: number;
    change: number;
    change_percent: string;
    f_score: number;
    per: number;
    dividend_yield: number;
}

interface StrategyResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: StockResult[];
    strategyName: string;
}

export default function StrategyResultModal({ isOpen, onClose, results, strategyName }: StrategyResultModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-[2rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] flex flex-col">
                
                {/* 상단 장식 그라데이션 */}
                <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent pointer-events-none" />

                {/* 헤더 섹션 */}
                <div className="p-8 pb-4 relative flex items-center justify-between border-b border-white/5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Target className="w-5 h-5 text-blue-400" />
                            <span className="text-blue-400 text-xs font-bold tracking-widest uppercase">Turbo Filter Active</span>
                        </div>
                        <h2 className="text-2xl font-black text-white">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                {strategyName}
                            </span>
                            <span className="ml-2 text-blue-500 text-lg font-bold">포착 결과</span>
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            TurboQuant 엔진이 시장 전체를 분석하여 선별한 {results.length}개의 종목입니다.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all transform hover:rotate-90"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* 결과 리스트 섹션 */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {results.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                            {results.map((stock, index) => (
                                <div 
                                    key={stock.symbol}
                                    className="group relative bg-white/[0.03] border border-white/5 hover:border-blue-500/30 rounded-2xl p-5 transition-all hover:bg-white/[0.06] hover:translate-y-[-2px] shadow-lg"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                                {stock.name}
                                            </h3>
                                            <span className="text-xs text-gray-500 font-mono tracking-tighter bg-white/5 px-2 py-0.5 rounded">
                                                {stock.symbol}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-mono font-bold text-white">
                                                {stock.price.toLocaleString()}
                                            </div>
                                            <div className={`text-xs font-bold flex items-center justify-end gap-1 ${stock.change >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                {stock.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {stock.change_percent}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 지표 그리드 */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <IndicatorBox 
                                            label="F-Score" 
                                            value={`${stock.f_score}점`} 
                                            icon={<Target size={14} className="text-purple-400" />}
                                            color="from-purple-500/20"
                                        />
                                        <IndicatorBox 
                                            label="PER" 
                                            value={`${stock.per.toFixed(1)}배`} 
                                            icon={<BarChart3 size={14} className="text-green-400" />}
                                            color="from-green-500/20"
                                        />
                                        <IndicatorBox 
                                            label="배당률" 
                                            value={`${stock.dividend_yield.toFixed(1)}%`} 
                                            icon={<Coins size={14} className="text-yellow-400" />}
                                            color="from-yellow-500/20"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Search size={64} className="text-gray-700 mb-6 animate-pulse" />
                            <h3 className="text-xl font-bold text-gray-300">검색 결과가 없습니다</h3>
                            <p className="text-gray-500 mt-2 max-w-xs leading-relaxed">
                                필터 조건을 조금 더 완화하여<br />다시 스캔해보시기 바랍니다.
                            </p>
                        </div>
                    )}
                </div>

                {/* 하단 푸터 */}
                <div className="p-6 bg-gradient-to-t from-black to-transparent border-t border-white/5 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 hover:scale-105"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}

function IndicatorBox({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) {
    return (
        <div className={`bg-gradient-to-br ${color} to-transparent border border-white/5 rounded-xl p-2 flex flex-col items-center justify-center`}>
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{label}</span>
            </div>
            <div className="text-sm font-black text-white">{value}</div>
        </div>
    );
}
