'use client';

import { useMemo, useState, useEffect } from 'react';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell 
} from 'recharts';
import { 
    Shield, TrendingUp, Zap, Activity, AlertTriangle, CheckCircle2, 
    ArrowUpRight, ArrowDownRight, Info, Loader2, RefreshCw, BarChart3, 
    Users, Briefcase, Globe
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface ProSummaryReportProps {
    symbol: string;
}

export default function ProSummaryReport({ symbol }: ProSummaryReportProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pro/summary/${encodeURIComponent(symbol)}`);
            const json = await res.json();
            if (json.status === "success") {
                setData(json.data);
            } else {
                setError(json.message || "데이터를 불러오는데 실패했습니다.");
            }
        } catch (err) {
            setError("서버 연결에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (symbol) fetchData();
    }, [symbol]);

    const radarData = useMemo(() => {
        if (!data?.quant?.factors) return [];
        const factors = data.quant.factors;
        return [
            { subject: '가치', A: factors.value?.score || 0, fullMark: 100 },
            { subject: '성장', A: factors.growth?.score || 0, fullMark: 100 },
            { subject: '모멘텀', A: factors.momentum?.score || 0, fullMark: 100 },
            { subject: '수익성', A: factors.quality?.score || 0, fullMark: 100 },
            { subject: '안정성', A: factors.stability?.score || 0, fullMark: 100 },
        ];
    }, [data]);

    const investorSummary = useMemo(() => {
        if (!data?.investor?.trend || data.investor.trend.length === 0) return null;
        const trend = data.investor.trend;
        const latest = trend[trend.length - 1];
        
        // 최근 5일 합산
        const recent5 = trend.slice(-5);
        const sums = recent5.reduce((acc: any, curr: any) => ({
            inst: acc.inst + (curr.institution || 0),
            frgn: acc.frgn + (curr.foreigner || 0),
            retail: acc.retail + (curr.retail || 0)
        }), { inst: 0, frgn: 0, retail: 0 });

        return { latest, sums };
    }, [data]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-sm font-medium animate-pulse">TurboQuant 엔진이 통합 분석 리포트를 생성 중입니다...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-red-500/5 border border-red-500/10 rounded-3xl m-4">
                <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
                <p className="text-red-400 font-bold mb-2">{error || "데이터가 없습니다."}</p>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-all text-xs font-bold">
                    <RefreshCw className="w-3 h-3" /> 다시 시도
                </button>
            </div>
        );
    }

    const { quant, health, stock_info } = data;

    return (
        <div className="space-y-6 pt-4 notranslate animate-in fade-in duration-500" translate="no">
            {/* 상단 요약 헤더 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard 
                    title="종합 점수" 
                    value={`${quant?.total_score || 0}점`} 
                    subValue={`Grade ${quant?.grade || 'N/A'}`}
                    icon={<Zap className="w-5 h-5 text-yellow-400" />}
                    color="from-yellow-500/20 to-orange-500/20"
                />
                <SummaryCard 
                    title="재무 건전성" 
                    value={health?.grade || 'N/A'} 
                    subValue={health?.z_score?.zone || '알수없음'}
                    icon={<Shield className={`w-5 h-5 ${health?.grade === 'S' || health?.grade === 'A' ? 'text-emerald-400' : 'text-red-400'}`} />}
                    color={health?.grade === 'S' || health?.grade === 'A' ? "from-emerald-500/20 to-teal-500/20" : "from-red-500/20 to-orange-500/20"}
                />
                <SummaryCard 
                    title="기관 수급 (5일)" 
                    value={investorSummary ? (investorSummary.sums.inst > 0 ? `+${(investorSummary.sums.inst/1000).toFixed(0)}k` : `${(investorSummary.sums.inst/1000).toFixed(0)}k`) : "N/A"} 
                    subValue="최근 5거래일 합산"
                    icon={<Briefcase className="w-5 h-5 text-blue-400" />}
                    color="from-blue-500/20 to-indigo-500/20"
                    isPositive={investorSummary ? investorSummary.sums.inst > 0 : false}
                    isNegative={investorSummary ? investorSummary.sums.inst < 0 : false}
                />
                <SummaryCard 
                    title="외인 수급 (5일)" 
                    value={investorSummary ? (investorSummary.sums.frgn > 0 ? `+${(investorSummary.sums.frgn/1000).toFixed(0)}k` : `${(investorSummary.sums.frgn/1000).toFixed(0)}k`) : "N/A"} 
                    subValue="최근 5거래일 합산"
                    icon={<Globe className="w-5 h-5 text-purple-400" />}
                    color="from-purple-500/20 to-fuchsia-500/20"
                    isPositive={investorSummary ? investorSummary.sums.frgn > 0 : false}
                    isNegative={investorSummary ? investorSummary.sums.frgn < 0 : false}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 왼쪽: 퀀트 분석 (Radar) */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/30 transition-all shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Activity className="w-32 h-32 text-indigo-400" />
                    </div>
                    <div className="flex items-center gap-3 mb-6 relative">
                        <div className="p-2 bg-indigo-500/20 rounded-xl">
                            <BarChart3 className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-black text-white tracking-tight">퀀트 팩터 분석 (5축)</h3>
                    </div>
                    
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Factor Score"
                                    dataKey="A"
                                    stroke="#6366f1"
                                    fill="#6366f1"
                                    fillOpacity={0.3}
                                    strokeWidth={3}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 grid grid-cols-5 gap-2">
                        {radarData.map((d: any) => (
                            <div key={d.subject} className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
                                <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-tighter">{d.subject}</div>
                                <div className={`text-sm font-black ${d.A >= 70 ? 'text-indigo-400' : d.A >= 40 ? 'text-slate-300' : 'text-slate-500'}`}>{d.A}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 오른쪽: 재무 건전성 & AI 소견 */}
                <div className="space-y-6">
                    {/* 재무 건전성 리포트 */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/20 rounded-xl">
                                    <Shield className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-black text-white tracking-tight">재무 리스크 스캐닝</h3>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${health?.z_score?.color === 'green' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {health?.z_score?.zone} ZONE
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div>
                                    <div className="text-xs text-slate-400 font-bold mb-1">Altman Z-Score (파산 위험도)</div>
                                    <div className="text-2xl font-black text-white">{health?.z_score?.value}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-widest">Threshold</div>
                                    <div className="text-xs text-slate-400">1.8(Care) / 3.0(Safe)</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-xs text-slate-400 font-bold mb-1">Piotroski F-Score</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-white">{health?.f_score?.value}</span>
                                        <span className="text-xs text-slate-500">/ 9</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-xs text-slate-400 font-bold mb-1">부채비율</div>
                                    <div className="text-2xl font-black text-white">{health?.ratios?.['부채비율'] || '0%'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI 종합 소견 */}
                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 opacity-10">
                            <Zap className="w-24 h-24 text-indigo-400" />
                        </div>
                        <h4 className="text-sm font-black text-indigo-300 flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4" /> AI Unified Insight
                        </h4>
                        <div className="text-sm text-slate-300 leading-relaxed font-medium">
                            <p className="mb-2">
                                {quant?.total_score >= 70 ? '🚀 우수한 퀀트 팩터를 보유하고 있습니다.' : '📊 중립적인 퀀트 팩터가 관찰됩니다.'}
                                {' '}
                                {health?.health_score >= 70 ? '재무적으로 매우 탄탄한 구조를 가지고 있으며 파산 리스크가 극히 낮습니다.' : '재무 지표가 다소 불안정하므로 현금 흐름 추이를 면밀히 살펴야 합니다.'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-4">
                                {health?.f_score?.value >= 7 && <Badge text="수익성 우수" color="bg-emerald-500/20 text-emerald-400" />}
                                {quant?.factors?.value?.score >= 70 && <Badge text="저평가 매력" color="bg-indigo-500/20 text-indigo-400" />}
                                {investorSummary && investorSummary.sums.inst > 0 && <Badge text="기관 매집중" color="bg-blue-500/20 text-blue-400" />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* 하단 면책 조항 */}
            <div className="flex items-center gap-2 justify-center p-4 bg-slate-900/20 rounded-2xl border border-slate-800 text-[10px] text-slate-600">
                <Info className="w-3 h-3" />
                <span>TurboQuant Pro 통합 리포트는 실시간 데이터와 백테스트 알고리즘을 기반으로 생성된 참고 자료입니다. 최종 투자 결정은 투자자 본인의 책임하에 이루어져야 합니다.</span>
            </div>
        </div>
    );
}

function SummaryCard({ title, value, subValue, icon, color, isPositive, isNegative }: any) {
    return (
        <div className={`bg-gradient-to-br ${color} border border-white/5 rounded-3xl p-5 shadow-lg group hover:scale-[1.02] transition-all`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{title}</span>
                <div className="opacity-70 group-hover:opacity-100 transition-opacity">{icon}</div>
            </div>
            <div className={`text-2xl font-black text-white flex items-center gap-1 ${isPositive ? 'text-red-400' : isNegative ? 'text-blue-400' : ''}`}>
                {value}
                {isPositive && <ArrowUpRight className="w-4 h-4" />}
                {isNegative && <ArrowDownRight className="w-4 h-4" />}
            </div>
            <div className="text-[10px] text-white/40 font-bold mt-1 uppercase">{subValue}</div>
        </div>
    );
}

function Badge({ text, color }: { text: string, color: string }) {
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${color} border border-current opacity-80`}>
            {text}
        </span>
    );
}
