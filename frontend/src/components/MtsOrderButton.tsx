"use client";

import { useState, useEffect } from "react";
import { BrokerInfo, getPreferredBroker, launchMtsApp, BROKER_LIST, setPreferredBroker, copyTickerToClipboard } from "@/lib/brokerLinks";
import { Zap, ChevronDown, Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface MtsOrderButtonProps {
    symbol?: string;
    stockName?: string;
    className?: string;
}

export default function MtsOrderButton({ symbol, stockName, className = "" }: MtsOrderButtonProps) {
    const [broker, setBroker] = useState<BrokerInfo>(BROKER_LIST[0]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [copiedRecently, setCopiedRecently] = useState(false);

    const cleanTicker = (symbol || "").replace(/\.(KS|KQ)$/i, "").replace(/^A/i, "").trim();

    useEffect(() => {
        if (typeof window !== "undefined") {
            setBroker(getPreferredBroker());

            const handleBrokerChange = (e: any) => {
                const found = BROKER_LIST.find(b => b.id === e.detail);
                if (found) setBroker(found);
            };

            window.addEventListener("preferred_broker_changed", handleBrokerChange);
            return () => window.removeEventListener("preferred_broker_changed", handleBrokerChange);
        }
    }, []);

    const handleLaunch = async () => {
        if (broker.id === "toss") {
            // 토스증권: 앱/웹 종목 화면 100% 직행
            toast.success(`🚀 토스증권으로 이동합니다! (${stockName || cleanTicker})`, {
                duration: 3000,
            });
            launchMtsApp(broker.id, cleanTicker, stockName);
        } else {
            // 전통 증권사 (NH나무, 키움 등): 종목코드 클립보드 자동 복사 + 앱 실행
            if (cleanTicker) {
                await copyTickerToClipboard(cleanTicker);
                setCopiedRecently(true);
                setTimeout(() => setCopiedRecently(false), 3000);

                toast.success(
                    `📋 [${stockName || cleanTicker}] 종목코드(${cleanTicker}) 복사 완료! 앱 검색창에 바로 붙여넣으세요.`,
                    { duration: 4500 }
                );
            } else {
                toast.info(`📱 ${broker.name} (${broker.appTitle}) 앱을 실행합니다...`);
            }

            launchMtsApp(broker.id, cleanTicker, stockName);
        }
    };

    const handleSelectBroker = (newBroker: BrokerInfo) => {
        setBroker(newBroker);
        setPreferredBroker(newBroker.id);
        setIsMenuOpen(false);
        toast.success(`주거래 증권사가 [${newBroker.name}]으로 변경되었습니다!`);
    };

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            {/* 메인 실행 버튼 */}
            <button
                onClick={handleLaunch}
                className={`px-4 py-2.5 rounded-l-2xl bg-gradient-to-r ${broker.bgColor} hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer`}
                title={`${broker.name} MTS 앱 실행 (${cleanTicker ? `종목코드 ${cleanTicker} 자동 복사` : ""})`}
            >
                {copiedRecently ? (
                    <Copy className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
                ) : (
                    <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                )}
                <span>
                    {broker.name}로 {stockName ? `${stockName} ` : ""}주문
                </span>
                {cleanTicker && (
                    <span className="hidden sm:inline-block ml-1 text-[10px] font-mono font-normal opacity-80 bg-black/25 px-1.5 py-0.5 rounded">
                        {cleanTicker}
                    </span>
                )}
            </button>

            {/* 증권사 빠른 선택 드롭다운 버튼 */}
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`px-2 py-2.5 rounded-r-2xl bg-gradient-to-r ${broker.bgColor} hover:brightness-125 border-l border-white/20 text-white transition-all flex items-center justify-center cursor-pointer`}
                title="주거래 증권사 변경"
            >
                <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* 드롭다운 메뉴 */}
            {isMenuOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-white/5 flex items-center justify-between">
                            <span>주거래 증권사 선택</span>
                            <span className="text-blue-400">원클릭 변경</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-0.5">
                            {BROKER_LIST.map((b) => (
                                <button
                                    key={b.id}
                                    onClick={() => handleSelectBroker(b)}
                                    className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                                        broker.id === b.id
                                            ? "bg-blue-600/20 text-blue-300 font-bold"
                                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{b.emoji}</span>
                                        <span>{b.name}</span>
                                    </span>
                                    {broker.id === b.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                </button>
                            ))}
                        </div>

                        {cleanTicker && (
                            <div className="pt-2 mt-1 border-t border-white/10 flex flex-col gap-1">
                                <button
                                    onClick={async () => {
                                        await copyTickerToClipboard(cleanTicker);
                                        toast.success(`📋 종목코드 [${cleanTicker}]가 복사되었습니다!`);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] flex items-center justify-between transition-all cursor-pointer"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Copy className="w-3 h-3 text-emerald-400" />
                                        <span>종목코드만 복사</span>
                                    </span>
                                    <span className="font-mono text-[10px] text-gray-400">{cleanTicker}</span>
                                </button>
                                <a
                                    href={`https://m.stock.naver.com/item/${cleanTicker}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] flex items-center justify-between transition-all"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                                        <span>네이버페이 증권 시세</span>
                                    </span>
                                </a>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
