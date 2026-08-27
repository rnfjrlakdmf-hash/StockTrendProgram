"use client";

import { useState, useEffect } from "react";
import { BROKER_LIST, BrokerInfo, getPreferredBroker, setPreferredBroker, launchMtsApp } from "@/lib/brokerLinks";
import { Smartphone, CheckCircle2, ExternalLink, Zap, Download, Sparkles, ShieldCheck, ArrowUpRight, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export default function BrokerMtsSection() {
    const [selectedBroker, setSelectedBroker] = useState<BrokerInfo>(BROKER_LIST[0]);
    const [isMobile, setIsMobile] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setSelectedBroker(getPreferredBroker());

            const ua = navigator.userAgent.toLowerCase();
            const mobile = /android|iphone|ipad|ipod/.test(ua);
            setIsMobile(mobile);
            setIsIOS(/iphone|ipad|ipod/.test(ua));

            const handleBrokerChange = (e: any) => {
                const found = BROKER_LIST.find(b => b.id === e.detail);
                if (found) setSelectedBroker(found);
            };

            window.addEventListener("preferred_broker_changed", handleBrokerChange);
            return () => window.removeEventListener("preferred_broker_changed", handleBrokerChange);
        }
    }, []);

    const handleSelect = (broker: BrokerInfo) => {
        setSelectedBroker(broker);
        setPreferredBroker(broker.id);
        toast.success(`주거래 증권사가 [${broker.name}]으로 설정되었습니다!`);
    };

    const handleLaunch = (broker: BrokerInfo) => {
        toast.info(`📱 ${broker.name} (${broker.appTitle}) 실행을 시도합니다...`);
        launchMtsApp(broker.id);
    };

    return (
        <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-blue-500/20 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-md">
            {/* 헤더 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white font-bold">
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                            모바일 MTS / HTS 빠른 실행 연동
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                딥링크 1초 연결
                            </span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            스마트폰에 설치된 증권사 앱을 1초 만에 바로 열고 종목 주문을 진행할 수 있습니다.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowInstallGuide(!showInstallGuide)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all shrink-0 cursor-pointer border border-white/5"
                >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>홈화면 앱 설치 가이드</span>
                </button>
            </div>

            {/* 홈화면 앱 설치 가이드 (토글) */}
            {showInstallGuide && (
                <div className="p-5 bg-blue-950/30 border border-blue-500/30 rounded-2xl space-y-3 animate-in fade-in duration-200">
                    <h4 className="text-xs font-bold text-blue-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        스톡트렌드 웹사이트를 스마트폰 앱처럼 설치하는 법 (1초 완료)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-300">
                        <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-white/5">
                            <p className="font-bold text-white mb-1">🍎 아이폰 (Safari 브라우저)</p>
                            <p className="leading-relaxed text-gray-400">
                                하단 중앙의 <strong className="text-blue-300">[공유 버튼(네모+화살표)]</strong> 터치 → 아래로 스크롤하여 <strong className="text-blue-300">[홈 화면에 추가]</strong> 터치
                            </p>
                        </div>
                        <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-white/5">
                            <p className="font-bold text-white mb-1">🤖 갤럭시 / 안드로이드 (Chrome/Samsung)</p>
                            <p className="leading-relaxed text-gray-400">
                                우측 상단 <strong className="text-blue-300">[메뉴(점 3개)]</strong> 터치 → <strong className="text-blue-300">[앱 설치]</strong> 또는 <strong className="text-blue-300">[홈 화면에 추가]</strong> 터치
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 현재 선택된 주거래 증권사 실행 배너 */}
            <div className="p-5 md:p-6 bg-gradient-to-r from-blue-950/50 via-indigo-950/30 to-zinc-950 border border-blue-500/40 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1.5 z-10">
                    <span className="text-[11px] font-mono font-bold text-blue-400 uppercase tracking-widest block">
                        CURRENT PRIMARY MTS
                    </span>
                    <h4 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                        <span className="text-2xl">{selectedBroker.emoji}</span>
                        {selectedBroker.name} ({selectedBroker.appTitle})
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed max-w-lg">
                        {selectedBroker.tagline}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 z-10">
                    <button
                        onClick={() => handleLaunch(selectedBroker)}
                        className={`flex-1 md:flex-initial px-6 py-3.5 rounded-2xl bg-gradient-to-r ${selectedBroker.bgColor} hover:brightness-110 text-white font-black text-sm md:text-base shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer`}
                    >
                        <Zap className="w-4 h-4 fill-current animate-pulse" />
                        {isMobile ? `⚡ ${selectedBroker.name} 앱 열기` : `⚡ ${selectedBroker.name} WTS 열기`}
                    </button>
                </div>
            </div>

            {/* 9대 주요 증권사 선택 그리드 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        주거래 증권사 선택 (터치하여 설정)
                    </h4>
                    <span className="text-[11px] text-gray-500 font-mono">
                        9개 증권사 딥링크 지원
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {BROKER_LIST.map((broker) => {
                        const isCurrent = selectedBroker.id === broker.id;
                        return (
                            <div
                                key={broker.id}
                                onClick={() => handleSelect(broker)}
                                className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group relative ${
                                    isCurrent
                                        ? "bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10"
                                        : "bg-zinc-950/60 hover:bg-zinc-900 border-white/5 hover:border-white/20"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-2xl">{broker.emoji}</span>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-black text-white">
                                                    {broker.name}
                                                </span>
                                                {isCurrent && (
                                                    <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-blue-500/30">
                                                        주거래
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-gray-400 font-medium">
                                                {broker.appTitle}
                                            </span>
                                        </div>
                                    </div>

                                    {isCurrent ? (
                                        <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLaunch(broker);
                                            }}
                                            title="앱 실행하기"
                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
                                        >
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-1 mb-3">
                                    {broker.tagline}
                                </p>

                                <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                                    <span className="text-[10px] text-gray-500 font-mono">
                                        {isCurrent ? "선택됨" : "터치하여 설정"}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLaunch(broker);
                                        }}
                                        className="text-[11px] font-bold text-gray-300 hover:text-blue-400 flex items-center gap-1 transition-colors"
                                    >
                                        실행 <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 안내 풋터 */}
            <div className="p-4 bg-zinc-950/80 rounded-2xl border border-white/5 text-[11px] text-gray-400 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-gray-300">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                    본 연동은 스마트폰 공식 딥링크 프로토콜(App Scheme)을 사용하며, 사용자의 계좌 비밀번호나 금융 정보를 일절 수집하거나 저장하지 않습니다.
                </span>
            </div>
        </div>
    );
}
