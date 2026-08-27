"use client";

import { useState, useEffect } from "react";
import { BrokerInfo, getPreferredBroker, launchMtsApp, BROKER_LIST, setPreferredBroker } from "@/lib/brokerLinks";
import { Zap, ChevronDown, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface MtsOrderButtonProps {
    symbol?: string;
    stockName?: string;
    className?: string;
}

export default function MtsOrderButton({ symbol, stockName, className = "" }: MtsOrderButtonProps) {
    const [broker, setBroker] = useState<BrokerInfo>(BROKER_LIST[0]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    const handleLaunch = () => {
        toast.info(`📱 ${broker.name} (${broker.appTitle}) 앱을 실행합니다...`);
        launchMtsApp(broker.id);
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
                title={`${broker.name} MTS 어플 즉시 열기`}
            >
                <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>{broker.name}로 {stockName ? `${stockName} ` : ""}주문</span>
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
                    </div>
                </>
            )}
        </div>
    );
}
