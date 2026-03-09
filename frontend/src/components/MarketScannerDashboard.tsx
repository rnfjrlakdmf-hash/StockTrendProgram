import React, { useState, useEffect } from 'react';
import { Activity, Radio, AlertCircle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface MarketStats {
    up: number;
    same: number;
    down: number;
}

interface MarketScannerData {
    stats: {
        kospi: MarketStats;
        kosdaq: MarketStats;
    };
    disclosures: Array<{
        title: string;
        link: string;
        press: string;
        date: string;
    }>;
}

export default function MarketScannerDashboard() {
    const [data, setData] = useState<MarketScannerData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        fetch(`${API_BASE_URL}/api/market/scanner`)
            .then(res => res.json())
            .then(resData => {
                if (isMounted && resData.status === 'success') {
                    setData(resData.data);
                }
            })
            .catch(err => console.error("Market scanner fetch error", err))
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-10 opacity-50">
                <div className="animate-pulse flex items-center gap-2 text-gray-400">
                    <Activity className="w-5 h-5" /> 시장 데이터 스캐닝 중...
                </div>
            </div>
        );
    }

    if (!data) return null;

    const renderStatsBar = (stats: MarketStats, name: string) => {
        const total = stats.up + stats.same + stats.down || 1;
        const upPct = (stats.up / total) * 100;
        const downPct = (stats.down / total) * 100;
        const samePct = (stats.same / total) * 100;

        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-gray-300">{name}</span>
                    <span className="text-gray-500 text-xs font-mono">총 {total.toLocaleString()}종목</span>
                </div>
                <div className="h-3 w-full flex rounded-full overflow-hidden bg-white/5 border border-white/10">
                    <div style={{ width: `${upPct}%` }} className="bg-red-500/80 transition-all duration-500" />
                    <div style={{ width: `${samePct}%` }} className="bg-gray-500/50 transition-all duration-500" />
                    <div style={{ width: `${downPct}%` }} className="bg-blue-500/80 transition-all duration-500" />
                </div>
                <div className="flex justify-between text-xs font-mono">
                    <span className="text-red-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> {stats.up}</span>
                    <span className="text-gray-500 flex items-center gap-1"><Minus className="w-3 h-3" /> {stats.same}</span>
                    <span className="text-blue-400 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" /> {stats.down}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* 증시 스캐너 (상승/하락 비율) */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" /> Today&apos;s 증시 스캐너
                </h3>
                <p className="text-xs text-gray-400 mb-6 drop-shadow-md">
                    현재 증시의 상승/하락 비율입니다. 빨간색(상승) 면적이 넓을수록 투심이 좋은 장이며, 파란색(하락) 면적이 압도적일 때는 <strong>현금 비중 확대</strong>를 고려해야 합니다.
                </p>
                <div className="space-y-6">
                    {renderStatsBar(data.stats.kospi, "KOSPI (코스피)")}
                    {renderStatsBar(data.stats.kosdaq, "KOSDAQ (코스닥)")}
                </div>
            </div>

            {/* LIVE 공시 속보 전광판 */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col h-[300px]">
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2 shrink-0">
                    <Radio className="w-5 h-5 text-red-500 animate-pulse" /> LIVE 특이 공시 속보
                </h3>
                <p className="text-xs text-gray-400 mb-4 drop-shadow-md shrink-0 border-b border-white/10 pb-3">
                    호재/악재성 키워드(유상증자, 단일판매 등)가 포함된 최근 1시간 이내 실시간 공시입니다. 관심 종목을 위에서 검색해 보세요.
                </p>

                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-3">
                    {data.disclosures && data.disclosures.length > 0 ? (
                        data.disclosures.map((item, idx) => (
                            <a
                                key={idx}
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group"
                            >
                                <div className="flex justify-between text-[10px] text-gray-500 font-mono mb-1">
                                    <span className="text-red-400/80 font-bold px-1.5 py-0.5 bg-red-400/10 rounded">{item.press}</span>
                                    <span>{item.date}</span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-200 group-hover:text-amber-300 leading-tight transition-colors">
                                    {item.title}
                                </h4>
                            </a>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm space-y-2 opacity-70">
                            <AlertCircle className="w-8 h-8 opacity-50" />
                            <p>현재 포착된 특이 공시가 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
