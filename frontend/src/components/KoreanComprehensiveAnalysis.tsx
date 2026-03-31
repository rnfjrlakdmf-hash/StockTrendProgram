"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import { Loader2, Building2, BarChart2, TrendingUp, Layers, PieChart, Users, ChevronUp, ChevronDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from "recharts";
import InvestorTrendTab from "./InvestorTrendTab";
import OverhangTab from "./OverhangTab";
import FinancialsTable from "./FinancialsTable";

interface Props {
    stock: any;
}

type SubTab = 'overview' | 'financial' | 'consensus' | 'industry' | 'sector' | 'ownership';

export default function KoreanComprehensiveAnalysis({ stock }: Props) {
    const [subTab, setSubTab] = useState<SubTab>('overview');
    const [consensus, setConsensus] = useState<any>(null);
    const [sectorData, setSectorData] = useState<any>(null);
    const [ownership, setOwnership] = useState<any>(null);
    const [financialData, setFinancialData] = useState<any>(null);
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const sym = encodeURIComponent(stock.symbol);

    const load = async (tab: SubTab) => {
        if (tab === 'financial' && !financialData) {
            setLoading(p => ({ ...p, financial: true }));
            try {
                const r = await fetch(`${API_BASE_URL}/api/stock/${sym}/financials`);
                const j = await r.json();
                if (j.status === 'success') setFinancialData(j.data);
            } catch (e) { } finally { setLoading(p => ({ ...p, financial: false })); }
        }
        if (tab === 'consensus' && !consensus) {
            setLoading(p => ({ ...p, consensus: true }));
            try {
                const r = await fetch(`${API_BASE_URL}/api/stock/${sym}/consensus`);
                const j = await r.json();
                setConsensus(j.data);
            } catch (e) { } finally { setLoading(p => ({ ...p, consensus: false })); }
        }
        if ((tab === 'industry' || tab === 'sector') && !sectorData) {
            setLoading(p => ({ ...p, sector: true }));
            try {
                const r = await fetch(`${API_BASE_URL}/api/stock/${sym}/sector-analysis`);
                const j = await r.json();
                setSectorData(j.data);
            } catch (e) { } finally { setLoading(p => ({ ...p, sector: false })); }
        }
        if (tab === 'ownership' && !ownership) {
            setLoading(p => ({ ...p, ownership: true }));
            try {
                const r = await fetch(`${API_BASE_URL}/api/stock/${sym}/ownership`);
                const j = await r.json();
                setOwnership(j.data);
            } catch (e) { } finally { setLoading(p => ({ ...p, ownership: false })); }
        }
    };

    const handleTab = (tab: SubTab) => {
        setSubTab(tab);
        load(tab);
    };

    const TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
        { key: 'overview',   label: '기업개요',  icon: <Building2 className="w-3.5 h-3.5" /> },
        { key: 'financial',  label: '재무분석',  icon: <BarChart2 className="w-3.5 h-3.5" /> },
        { key: 'consensus',  label: '컨센서스',  icon: <TrendingUp className="w-3.5 h-3.5" /> },
        { key: 'industry',   label: '업종분석',  icon: <Layers className="w-3.5 h-3.5" /> },
        { key: 'sector',     label: '섹터분석',  icon: <PieChart className="w-3.5 h-3.5" /> },
        { key: 'ownership',  label: '지분현황',  icon: <Users className="w-3.5 h-3.5" /> },
    ];

    const d = stock.details;

    return (
        <div className="mt-4">
            {/* Sub-tab Nav */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 mb-5">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => handleTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0
                            ${subTab === t.key
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                            }`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ── 기업개요 ── */}
            {subTab === 'overview' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                    {/* 기본 정보 헤더 */}
                    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/20 rounded-2xl border border-white/10 p-5">
                        <div className="flex flex-wrap items-start gap-4 mb-4">
                            <div>
                                <p className="text-2xl font-black text-white">{stock.name}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full font-bold border border-blue-500/30">{stock.symbol}</span>
                                    {stock.market_type && <span className="text-xs px-2 py-0.5 bg-white/10 text-gray-300 rounded-full font-bold">{stock.market_type}</span>}
                                    {stock.sector && <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-bold border border-purple-500/30">{stock.sector}</span>}
                                </div>
                            </div>
                        </div>
                        {/* Key Metrics Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {[
                                { label: 'EPS', value: d?.eps ? `₩${Math.round(d.eps).toLocaleString()}` : '-' },
                                { label: 'BPS', value: d?.bps ? `₩${Math.round(d.bps).toLocaleString()}` : '-' },
                                { label: 'PER', value: d?.pe_ratio ? `${d.pe_ratio.toFixed(2)}배` : '-' },
                                { label: 'PBR', value: d?.pbr ? `${d.pbr.toFixed(2)}배` : '-' },
                                { label: '배당수익률', value: d?.dividend_yield ? `${d.dividend_yield.toFixed(2)}%` : '-' },
                                { label: '시가총액', value: d?.market_cap || '-' },
                            ].map(m => (
                                <div key={m.label} className="bg-black/30 rounded-xl p-3 border border-white/5">
                                    <p className="text-[10px] text-gray-500 font-bold mb-1">{m.label}</p>
                                    <p className="text-sm font-black text-white">{m.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 기업 설명 */}
                    {stock.description && (
                        <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                            <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5" /> 사업 개요
                            </h4>
                            <p className="text-gray-300 text-sm leading-relaxed">{stock.description}</p>
                        </div>
                    )}

                    {/* 가격 현황 */}
                    {d && (
                        <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">가격 현황</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: '전일종가', value: `₩${Math.round(d.prev_close || 0).toLocaleString()}` },
                                    { label: '시가', value: `₩${Math.round(d.open || 0).toLocaleString()}` },
                                    { label: '고가', value: `₩${Math.round(d.day_high || 0).toLocaleString()}`, color: 'text-red-400' },
                                    { label: '저가', value: `₩${Math.round(d.day_low || 0).toLocaleString()}`, color: 'text-blue-400' },
                                    { label: '52주 최고', value: `₩${Math.round(d.year_high || 0).toLocaleString()}`, color: 'text-red-300' },
                                    { label: '52주 최저', value: `₩${Math.round(d.year_low || 0).toLocaleString()}`, color: 'text-blue-300' },
                                    { label: '거래량', value: (d.volume || 0).toLocaleString() },
                                    { label: '추정 PER', value: d.forward_pe ? `${d.forward_pe.toFixed(2)}배` : '-' },
                                ].map(m => (
                                    <div key={m.label} className="bg-black/30 rounded-xl p-3 border border-white/5">
                                        <p className="text-[10px] text-gray-500 font-bold mb-1">{m.label}</p>
                                        <p className={`text-sm font-black ${m.color || 'text-white'}`}>{m.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── 재무분석 ── */}
            {subTab === 'financial' && (
                <div className="animate-in fade-in duration-300">
                    {loading.financial ? (
                        <div className="py-20 flex flex-col items-center gap-3 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p className="text-sm">재무 데이터 수집 중...</p>
                        </div>
                    ) : (
                        <FinancialsTable data={financialData} />
                    )}
                </div>
            )}

            {/* ── 컨센서스 ── */}
            {subTab === 'consensus' && (
                <div className="animate-in fade-in duration-300 space-y-5">
                    {loading.consensus ? (
                        <div className="py-20 flex flex-col items-center gap-3 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p className="text-sm">컨센서스 데이터 수집 중...</p>
                        </div>
                    ) : !consensus ? (
                        <EmptyState message="컨센서스 데이터를 불러올 수 없습니다." />
                    ) : (
                        <>
                            {/* 투자의견 카드 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1 bg-gradient-to-br from-blue-900/40 to-purple-900/30 rounded-2xl border border-blue-500/20 p-6 flex flex-col items-center justify-center text-center">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">투자 의견</p>
                                    <div className={`text-3xl font-black mb-1 ${
                                        consensus.opinion_score >= 4 ? 'text-red-400' :
                                        consensus.opinion_score <= 2 ? 'text-blue-400' : 'text-gray-300'
                                    }`}>
                                        {consensus.opinion || '-'}
                                    </div>
                                    {consensus.analyst_count && (
                                        <p className="text-xs text-gray-500 mt-1">{consensus.analyst_count}개 증권사 기준</p>
                                    )}
                                    {/* Opinion bar */}
                                    <div className="w-full mt-4 flex gap-1 h-2">
                                        {[1,2,3,4,5].map(n => (
                                            <div key={n} className={`flex-1 rounded-full ${n <= (consensus.opinion_score || 3) ? 'bg-blue-500' : 'bg-white/10'}`} />
                                        ))}
                                    </div>
                                    <div className="flex justify-between w-full mt-1 text-[9px] text-gray-600">
                                        <span>강력매도</span><span>강력매수</span>
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-white/5 rounded-2xl border border-white/10 p-6">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">목표주가 분석</p>
                                    {consensus.target_price ? (
                                        <>
                                            <div className="flex items-end gap-3 mb-4">
                                                <p className="text-4xl font-black text-white">₩{Math.round(consensus.target_price).toLocaleString()}</p>
                                                {stock.price && (() => {
                                                    const curr = parseFloat(String(stock.price).replace(/,/g,''));
                                                    const diff = ((consensus.target_price - curr) / curr * 100);
                                                    return (
                                                        <span className={`text-lg font-black flex items-center gap-1 ${diff > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                            {diff > 0 ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                                                            {Math.abs(diff).toFixed(1)}%
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="bg-black/30 rounded-xl p-3">
                                                    <p className="text-xs text-gray-500 mb-1">현재가</p>
                                                    <p className="font-black text-white">₩{parseFloat(String(stock.price).replace(/,/g,'')).toLocaleString()}</p>
                                                </div>
                                                <div className="bg-black/30 rounded-xl p-3">
                                                    <p className="text-xs text-gray-500 mb-1">목표가 대비</p>
                                                    {(() => {
                                                        const curr = parseFloat(String(stock.price).replace(/,/g,''));
                                                        const diff = consensus.target_price - curr;
                                                        return <p className={`font-black ${diff > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                            {diff > 0 ? '+' : ''}₩{Math.round(diff).toLocaleString()}
                                                        </p>;
                                                    })()}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-gray-500 text-sm">목표주가 데이터가 없습니다.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── 업종분석 ── */}
            {subTab === 'industry' && (
                <div className="animate-in fade-in duration-300 space-y-5">
                    {loading.sector ? (
                        <div className="py-20 flex flex-col items-center gap-3 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p>업종 데이터 수집 중...</p>
                        </div>
                    ) : (
                        <>
                            {/* 업종 정보 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3">업종 정보</p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-400">업종명</span>
                                            <span className="text-sm font-bold text-white">{sectorData?.sector_name || stock.sector || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-400">업종 PER</span>
                                            <span className="text-sm font-bold text-white">{sectorData?.sector_per ? `${sectorData.sector_per.toFixed(2)}배` : (stock.details?.pe_ratio ? `${stock.details.pe_ratio.toFixed(2)}배 (종목)` : '-')}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-400">종목 PER</span>
                                            <span className="text-sm font-bold text-emerald-400">{stock.details?.pe_ratio ? `${stock.details.pe_ratio.toFixed(2)}배` : '-'}</span>
                                        </div>
                                        {sectorData?.sector_per && stock.details?.pe_ratio && (
                                            <div className="mt-2 pt-2 border-t border-white/5">
                                                <p className="text-xs text-gray-500">
                                                    업종 평균 대비 {stock.details.pe_ratio < sectorData.sector_per
                                                        ? <span className="text-emerald-400 font-bold">저평가 ({((sectorData.sector_per - stock.details.pe_ratio) / sectorData.sector_per * 100).toFixed(1)}% 낮음)</span>
                                                        : <span className="text-rose-400 font-bold">고평가 ({((stock.details.pe_ratio - sectorData.sector_per) / sectorData.sector_per * 100).toFixed(1)}% 높음)</span>}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* 관련주 비교 */}
                                <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3">관련 종목 비교</p>
                                    {(stock.related_stocks || []).slice(0,5).length > 0 ? (
                                        <div className="space-y-2">
                                            {(stock.related_stocks || []).slice(0,5).map((s: any) => (
                                                <div key={s.symbol} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{s.name}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono">{s.symbol}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        {s.price && <p className="text-sm font-bold text-white">₩{parseFloat(String(s.price).replace(/,/g,'')).toLocaleString()}</p>}
                                                        {s.change && <p className="text-xs font-bold text-gray-400">{s.change}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <EmptyState message="관련 종목 데이터가 없습니다." />}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── 섹터분석 ── */}
            {subTab === 'sector' && (
                <div className="animate-in fade-in duration-300 space-y-5">
                    {loading.sector ? (
                        <div className="py-20 flex flex-col items-center gap-3 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">섹터 지표 비교</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { label: '섹터', value: sectorData?.sector_name || stock.sector || '-' },
                                        { label: '섹터 PER', value: sectorData?.sector_per ? `${sectorData.sector_per.toFixed(2)}배` : '-' },
                                        { label: '종목 PER', value: stock.details?.pe_ratio ? `${stock.details.pe_ratio.toFixed(2)}배` : '-' },
                                        { label: '종목 PBR', value: stock.details?.pbr ? `${stock.details.pbr.toFixed(2)}배` : '-' },
                                        { label: 'ROE (추정)', value: '-' },
                                        { label: '배당수익률', value: stock.details?.dividend_yield ? `${stock.details.dividend_yield.toFixed(2)}%` : '-' },
                                    ].map(m => (
                                        <div key={m.label} className="bg-black/30 rounded-xl p-3 border border-white/5">
                                            <p className="text-[10px] text-gray-500 font-bold mb-1">{m.label}</p>
                                            <p className="text-sm font-black text-white">{m.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Related stocks bar chart */}
                            {(stock.related_stocks || []).length > 0 && (
                                <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">동종 섹터 PBR 비교</p>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={[
                                            { name: stock.name.slice(0,6), value: stock.details?.pbr || 0, isSelf: true },
                                            ...(stock.related_stocks || []).slice(0,4).map((s: any) => ({
                                                name: s.name.slice(0,6), value: 0, isSelf: false
                                            }))
                                        ]}>
                                            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                            <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8 }} />
                                            <Bar dataKey="value" radius={[4,4,0,0]}>
                                                {[stock, ...(stock.related_stocks||[]).slice(0,4)].map((_: any, i: number) => (
                                                    <Cell key={i} fill={i === 0 ? '#3b82f6' : '#374151'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── 지분현황 (투자자 동향 + 오버행 통합) ── */}
            {subTab === 'ownership' && (
                <div className="animate-in fade-in duration-300 space-y-6">
                    {/* 지분율 원형 그래프 */}
                    {loading.ownership ? (
                        <div className="py-10 flex flex-col items-center gap-3 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : ownership && (
                        <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">주요 지분 비중</p>
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                {[
                                    { name: '외국인', value: ownership.foreign_pct || 0, color: '#3b82f6' },
                                    { name: '기관', value: ownership.institution_pct || 0, color: '#10b981' },
                                    { name: '개인', value: ownership.individual_pct || 0, color: '#f59e0b' },
                                ].filter(d => d.value > 0).length > 0 ? (
                                    <>
                                        <RePieChart width={180} height={180}>
                                            <Pie
                                                data={[
                                                    { name: '외국인', value: ownership.foreign_pct || 0 },
                                                    { name: '기관', value: ownership.institution_pct || 0 },
                                                    { name: '개인', value: ownership.individual_pct || 0 },
                                                ].filter(d => d.value > 0)}
                                                cx={85} cy={85} outerRadius={70} dataKey="value" paddingAngle={3}
                                            >
                                                {['#3b82f6', '#10b981', '#f59e0b'].map((c, i) => <Cell key={i} fill={c} />)}
                                            </Pie>
                                            <Legend />
                                        </RePieChart>
                                        <div className="space-y-3 flex-1">
                                            {ownership.major_holder && (
                                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                                                    <p className="text-xs text-blue-400 font-bold mb-1">최대주주</p>
                                                    <p className="font-black text-white">{ownership.major_holder}</p>
                                                    {ownership.major_holder_pct && <p className="text-sm text-blue-300">{ownership.major_holder_pct.toFixed(2)}%</p>}
                                                </div>
                                            )}
                                            {[
                                                { label: '외국인', value: ownership.foreign_pct, color: 'text-blue-400', bg: 'bg-blue-500' },
                                                { label: '기관', value: ownership.institution_pct, color: 'text-emerald-400', bg: 'bg-emerald-500' },
                                                { label: '개인', value: ownership.individual_pct, color: 'text-amber-400', bg: 'bg-amber-500' },
                                            ].map(m => m.value && (
                                                <div key={m.label}>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-xs text-gray-400">{m.label}</span>
                                                        <span className={`text-xs font-bold ${m.color}`}>{m.value.toFixed(2)}%</span>
                                                    </div>
                                                    <div className="w-full bg-white/5 rounded-full h-2">
                                                        <div className={`${m.bg} h-2 rounded-full`} style={{ width: `${Math.min(m.value, 100)}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : <EmptyState message="지분 비중 데이터를 불러올 수 없습니다." />}
                            </div>
                        </div>
                    )}
                    {/* 투자자 동향 + 오버행 */}
                    <InvestorTrendTab symbol={stock.symbol} stockName={stock.name} />
                    <div className="mt-4">
                        <OverhangTab symbol={stock.symbol} stockName={stock.name} />
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-12 text-center text-gray-500">
            <Minus className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{message}</p>
        </div>
    );
}
