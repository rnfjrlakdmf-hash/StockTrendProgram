"use client";

import { useState, useEffect } from "react";
import { BROKER_LIST, BrokerInfo, getPreferredBroker, setPreferredBroker, launchMtsApp, getStoreDownloadUrl } from "@/lib/brokerLinks";
import { Smartphone, CheckCircle2, Zap, Download, Sparkles, ShieldCheck, Globe } from "lucide-react";
import { toast } from "sonner";

export default function BrokerMtsSection() {
    const [selectedBroker, setSelectedBroker] = useState<BrokerInfo>(BROKER_LIST[0]);
    const [isMobile, setIsMobile] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setSelectedBroker(getPreferredBroker());

            const ua = navigator.userAgent.toLowerCase();
            const mobile = /android|iphone|ipad|ipod/.test(ua);
            setIsMobile(mobile);

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
        toast.info(`📱 ${broker.name} (${broker.appTitle}) 앱 실행을 시도합니다...`);
        launchMtsApp(broker.id);
    };

    const handleOpenStore = (broker: BrokerInfo, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const storeUrl = getStoreDownloadUrl(broker);
        window.open(storeUrl, "_blank", "noopener,noreferrer");
    };

    const handleOpenWeb = (broker: BrokerInfo, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        window.open(broker.webTradeUrl, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-blue-500/20 rounded-3xl p-5 md:p-8 shadow-2xl space-y-6 backdrop-blur-md">
            {/* 1. 섹션 헤더 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white font-bold shrink-0">
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg md:text-xl font-black text-white">
                                모바일 MTS / HTS 빠른 실행 연동
                            </h3>
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                딥링크 1초 연결
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            스마트폰에 설치된 증권사 앱을 1초 만에 바로 열고 주식 주문을 진행할 수 있습니다.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowInstallGuide(!showInstallGuide)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all shrink-0 cursor-pointer border border-white/10 whitespace-nowrap"
                >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>홈화면 앱 설치 가이드</span>
                </button>
            </div>

            {/* 홈화면 앱 설치 가이드 (토글 드롭다운) */}
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

            {/* 2. 현재 선택된 주거래 증권사 실행 메인 카드 (깔끔한 2열 레이아웃) */}
            <div className="p-5 md:p-6 bg-gradient-to-br from-blue-950/60 via-zinc-900/90 to-zinc-950 border border-blue-500/30 rounded-3xl shadow-xl space-y-5">
                {/* 상단: 증권사 정보 */}
                <div className="flex items-center gap-3.5">
                    <span className="text-3xl sm:text-4xl p-2.5 bg-white/5 rounded-2xl border border-white/10 shrink-0">
                        {selectedBroker.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                CURRENT PRIMARY MTS
                            </span>
                        </div>
                        <h4 className="text-lg sm:text-xl font-black text-white mt-1 truncate">
                            {selectedBroker.name} <span className="text-sm sm:text-base font-semibold text-gray-300">({selectedBroker.appTitle})</span>
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {selectedBroker.tagline}
                        </p>
                    </div>
                </div>

                {/* 하단: 3개 액션 버튼 (균형잡힌 그리드) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-white/10">
                    {/* 1. 앱 즉시 열기 */}
                    <button
                        onClick={() => handleLaunch(selectedBroker)}
                        className={`py-3.5 px-4 rounded-2xl bg-gradient-to-r ${selectedBroker.bgColor} hover:brightness-110 text-white font-black text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer`}
                        title="스마트폰에 앱이 설치되어 있는 경우 1초 만에 실행"
                    >
                        <Zap className="w-4 h-4 fill-current animate-pulse shrink-0" />
                        <span>⚡ 앱 바로 열기</span>
                    </button>

                    {/* 2. 스토어 다운로드 */}
                    <button
                        onClick={(e) => handleOpenStore(selectedBroker, e)}
                        className="py-3.5 px-4 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-gray-200 hover:text-white font-bold text-sm border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                        title="앱이 아직 없는 경우 플레이스토어/앱스토어에서 다운로드"
                    >
                        <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>📥 앱 설치/다운로드</span>
                    </button>

                    {/* 3. 웹 트레이딩 */}
                    <button
                        onClick={(e) => handleOpenWeb(selectedBroker, e)}
                        className="py-3.5 px-4 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-gray-200 hover:text-white font-bold text-sm border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                        title="웹 브라우저에서 바로 주식 매매"
                    >
                        <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>🌐 웹 거래소(WTS)</span>
                    </button>
                </div>
            </div>

            {/* 3. 9대 주요 증권사 선택 그리드 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        주거래 증권사 선택 (카드 터치 시 주거래로 설정)
                    </h4>
                    <span className="text-[11px] text-gray-500 font-mono">
                        9개 증권사 지원
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
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-2xl shrink-0">{broker.emoji}</span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-black text-white truncate">
                                                        {broker.name}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-blue-500/30 shrink-0">
                                                            주거래
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-gray-400 font-medium truncate block">
                                                    {broker.appTitle}
                                                </span>
                                            </div>
                                        </div>

                                        {isCurrent && (
                                            <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                                        )}
                                    </div>

                                    <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-1 mb-3">
                                        {broker.tagline}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-2.5 border-t border-white/5 gap-1.5">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLaunch(broker);
                                        }}
                                        className="flex-1 py-1.5 px-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
                                        title="앱 즉시 열기"
                                    >
                                        <Zap className="w-3 h-3 text-blue-400 shrink-0" />
                                        <span>앱 열기</span>
                                    </button>

                                    <button
                                        onClick={(e) => handleOpenStore(broker, e)}
                                        className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium text-[11px] flex items-center justify-center gap-1 transition-all"
                                        title="스토어에서 앱 다운로드"
                                    >
                                        <Download className="w-3 h-3 text-emerald-400 shrink-0" />
                                        <span>설치</span>
                                    </button>

                                    <button
                                        onClick={(e) => handleOpenWeb(broker, e)}
                                        className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium text-[11px] flex items-center justify-center gap-1 transition-all"
                                        title="웹 트레이딩(WTS)"
                                    >
                                        <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                                        <span>웹</span>
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
                    앱이 스마트폰에 설치되어 있으면 [앱 열기]로 즉시 켜지며, 미설치 시 [설치] 버튼으로 스토어에서 1초 만에 무료 다운로드하실 수 있습니다.
                </span>
            </div>
        </div>
    );
}
