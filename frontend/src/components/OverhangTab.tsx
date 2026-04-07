import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Building2, ExternalLink, Loader2, Info, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface OverhangData {
    title: string;
    link: string;
    date: string;
    type: string;
}

interface OverhangTabProps {
    symbol: string;
    stockName: string;
}

export default function OverhangTab({ symbol, stockName }: OverhangTabProps) {
    const [overhangs, setOverhangs] = useState<OverhangData[]>([]);
    const [investments, setInvestments] = useState<OverhangData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (isManual = false) => {
        if (!symbol) return;
        
        if (isManual) setIsRefreshing(true);
        else setLoading(true);
        
        setError(null);

        try {
            // t parameter to bypass cache
            const res = await fetch(`${API_BASE_URL}/api/stock/${symbol}/dart_overhang?t=${Date.now()}`);
            const data = await res.json();
            
            if (data.status === 'success' && data.data) {
                setOverhangs(Array.isArray(data.data.overhang) ? data.data.overhang : []);
                setInvestments(Array.isArray(data.data.investments) ? data.data.investments : []);
            } else {
                setError('데이터를 불러오지 못했습니다.');
            }
        } catch (err) {
            console.error("Overhang API Error:", err);
            setError('통신 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [symbol]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-gray-400 font-bold"><span>{stockName}</span><span>의 DART 공시 기록을 스캔 중입니다...</span></p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center gap-4 py-8">
                <div className="text-center py-4 px-6 text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
                    {error}
                </div>
                <button 
                    onClick={() => fetchData(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> 다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Guide Message */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex gap-3 text-sm text-gray-300">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                        <span>본 데이터는 DART 공시 원문의 과거 이력을 기초로 알고리즘이 특정 키워드를 필터링한 </span><strong><span>객관적 사실</span></strong><span> 자료입니다. 주관적 가치 판단을 완전히 배배제하고 오직 팩트 체크용으로만 제공됩니다.</span>
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button 
                        onClick={() => fetchData(true)}
                        disabled={isRefreshing}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            isRefreshing 
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-300 cursor-not-allowed" 
                            : "bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30"
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? "스캔 중..." : "실시간 재추출"}</span>
                    </button>
                    <a 
                        href={`https://finance.naver.com/item/news_notice.naver?code=${symbol.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> 원문 전체보기
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. 오버행(잠재물량) 트래커 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg">
                    <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <AlertTriangle className="text-yellow-400 w-6 h-6" /> 오버행 공시 이력
                    </h4>
                    <p className="text-xs text-gray-500 mb-4 pb-4 border-b border-white/10">
                        <span><span>전환사채(CB), 신주인수권부사채(BW), 제3자배정 유상증자 등 잠재적 주식 수 증가(희석) 여지가 있는 공시 내역입니다.</span></span>
                    </p>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {overhangs.length > 0 ? (
                            overhangs.map((item, idx) => (
                                <a
                                    key={`oh-${idx}`}
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block p-3 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/40">
                                            <span>{item.type}</span>
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono"><span>{item.date}</span></span>
                                    </div>
                                    <h5 className="text-sm font-bold text-gray-200 group-hover:text-yellow-400 transition-colors leading-tight">
                                        <span>{item.title}</span>
                                    </h5>
                                </a>
                            ))
                        ) : (
                            <div className="py-12 text-center">
                                <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3 opacity-20" />
                                <p className="text-gray-500 text-sm font-medium">
                                    <span className="text-blue-400 font-bold"><span>{stockName}</span></span><span>의 최근 관련 공시 이력이 없습니다.</span>
                                </p>
                                <p className="text-[10px] text-gray-600 mt-1"><span>최근 약 100건의 공시 목록을 스캔한 결과입니다.</span></p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. 타법인출자 트래커 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg">
                    <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <Building2 className="text-blue-400 w-6 h-6" /> 타법인·자산 취득 이력
                    </h4>
                    <p className="text-xs text-gray-500 mb-4 pb-4 border-b border-white/10">
                        타법인 주식 및 지분 취득 결정, 대규모 유형자산 양수도 등 외부 투자 및 자산 구조 진단용 공시 내역입니다.
                    </p>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {investments.length > 0 ? (
                            investments.map((item, idx) => (
                                <a
                                    key={`inv-${idx}`}
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block p-3 rounded-xl bg-black/40 hover:bg-black/60 border border-white/5 transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40">
                                            <span>{item.type}</span>
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono"><span>{item.date}</span></span>
                                    </div>
                                    <h5 className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors leading-tight">
                                        <span>{item.title}</span>
                                    </h5>
                                </a>
                            ))
                        ) : (
                            <div className="py-12 text-center">
                                <Building2 className="w-8 h-8 text-gray-600 mx-auto mb-3 opacity-20" />
                                <p className="text-gray-500 text-sm font-medium">
                                    <span className="text-blue-400 font-bold"><span>{stockName}</span></span><span>의 최근 관련 투자 이력이 없습니다.</span>
                                </p>
                                <p className="text-[10px] text-gray-600 mt-1"><span>기업의 전략적 투자 공시가 발생하면 이곳에 표시됩니다.</span></p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
