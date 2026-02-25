"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Search, RefreshCw, Shield, BarChart3, Users, TrendingUp, TrendingDown,
    Activity, Zap, AlertTriangle, ChevronRight, X
} from "lucide-react";

export default function AnalysisPage() {
    const [symbol, setSymbol] = useState("");
    const [activeTab, setActiveTab] = useState<"quant" | "health" | "peer">("quant");

    // Quant State
    const [quantData, setQuantData] = useState<any>(null);
    const [quantLoading, setQuantLoading] = useState(false);

    // Health State
    const [healthData, setHealthData] = useState<any>(null);
    const [healthLoading, setHealthLoading] = useState(false);

    // Peer State
    const [peerSymbols, setPeerSymbols] = useState("005930,000660,035420");
    const [peerData, setPeerData] = useState<any>(null);
    const [peerLoading, setPeerLoading] = useState(false);

    const fetchQuant = async (sym: string) => {
        if (!sym) return;
        setQuantLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quant/${sym}`);
            const json = await res.json();
            if (json.status === "success") setQuantData(json.data);
        } catch (err) { console.error(err); }
        finally { setQuantLoading(false); }
    };

    const fetchHealth = async (sym: string) => {
        if (!sym) return;
        setHealthLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/financial-health/${sym}`);
            const json = await res.json();
            if (json.status === "success") setHealthData(json.data);
        } catch (err) { console.error(err); }
        finally { setHealthLoading(false); }
    };

    const fetchPeer = async () => {
        if (!peerSymbols) return;
        setPeerLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/peer-compare?symbols=${encodeURIComponent(peerSymbols)}`);
            const json = await res.json();
            if (json.status === "success") setPeerData(json);
        } catch (err) { console.error(err); }
        finally { setPeerLoading(false); }
    };

    const handleSearch = () => {
        if (!symbol) return;
        if (activeTab === "quant") fetchQuant(symbol);
        else if (activeTab === "health") fetchHealth(symbol);
    };

    const getGradeStyle = (grade: string) => {
        switch (grade) {
            case "S": return "from-yellow-400 to-amber-500 text-black";
            case "A": return "from-green-500 to-emerald-500 text-white";
            case "B": return "from-blue-500 to-indigo-500 text-white";
            case "C": return "from-orange-500 to-amber-600 text-white";
            case "D": return "from-red-500 to-rose-600 text-white";
            default: return "from-gray-500 to-gray-600 text-white";
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-blue-400";
        if (score >= 40) return "text-yellow-400";
        return "text-red-400";
    };

    // SVG Radar Chart
    const RadarChart = ({ factors }: { factors: any }) => {
        const keys = ["value", "growth", "momentum", "quality", "stability"];
        const labels = ["가치", "성장", "모멘텀", "수익성", "안정성"];
        const cx = 150, cy = 150, r = 110;

        const getPoint = (index: number, score: number) => {
            const angle = (Math.PI * 2 * index / 5) - Math.PI / 2;
            const dist = (score / 100) * r;
            return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
        };

        const gridLevels = [20, 40, 60, 80, 100];

        return (
            <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
                {/* Grid */}
                {gridLevels.map(level => (
                    <polygon key={level}
                        points={keys.map((_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}`; }).join(" ")}
                        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"
                    />
                ))}
                {/* Axes */}
                {keys.map((_, i) => {
                    const p = getPoint(i, 100);
                    return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
                })}
                {/* Data */}
                <polygon
                    points={keys.map((k, i) => { const p = getPoint(i, factors[k]?.score || 0); return `${p.x},${p.y}`; }).join(" ")}
                    fill="rgba(99,102,241,0.3)" stroke="rgb(99,102,241)" strokeWidth="2"
                />
                {/* Points */}
                {keys.map((k, i) => {
                    const p = getPoint(i, factors[k]?.score || 0);
                    return <circle key={k} cx={p.x} cy={p.y} r="4" fill="rgb(129,140,248)" />;
                })}
                {/* Labels */}
                {keys.map((k, i) => {
                    const p = getPoint(i, 120);
                    return (
                        <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                            fill="white" fontSize="11" fontWeight="bold">
                            {labels[i]}
                        </text>
                    );
                })}
            </svg>
        );
    };

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="프로 분석" subtitle="퀀트 · 재무 건전성 · 동종비교" />

            <div className="max-w-5xl mx-auto p-4 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
                    <button onClick={() => setActiveTab("quant")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "quant" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg" : "text-gray-400"}`}>
                        <Activity className="w-4 h-4" /> 퀀트 스코어
                    </button>
                    <button onClick={() => setActiveTab("health")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "health" ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg" : "text-gray-400"}`}>
                        <Shield className="w-4 h-4" /> 재무 건전성
                    </button>
                    <button onClick={() => setActiveTab("peer")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "peer" ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg" : "text-gray-400"}`}>
                        <Users className="w-4 h-4" /> 동종비교
                    </button>
                </div>

                {/* Search (Quant & Health) */}
                {(activeTab === "quant" || activeTab === "health") && (
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input type="text" placeholder="종목코드 입력 (예: 005930, AAPL)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
                                value={symbol} onChange={e => setSymbol(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                            />
                        </div>
                        <button onClick={handleSearch}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm">
                            분석
                        </button>
                    </div>
                )}

                {/* ===== QUANT TAB ===== */}
                {activeTab === "quant" && (
                    <div className="space-y-6">
                        {quantLoading ? (
                            <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-3" /><p className="text-gray-500">퀀트 분석 중...</p></div>
                        ) : quantData ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {/* Grade Card */}
                                <div className="bg-gradient-to-br from-indigo-900/30 to-black border border-indigo-500/30 rounded-3xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black">{quantData.name}</h2>
                                            <p className="text-gray-400 text-sm">{quantData.symbol}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getGradeStyle(quantData.grade)} flex items-center justify-center text-3xl font-black shadow-xl`}>
                                                {quantData.grade}
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-4xl font-black ${getScoreColor(quantData.total_score)}`}>{quantData.total_score}</span>
                                                <p className="text-xs text-gray-500">종합 점수</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Radar Chart */}
                                    <RadarChart factors={quantData.factors} />
                                </div>

                                {/* Factor Detail Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    {Object.entries(quantData.factors || {}).map(([key, f]: any) => (
                                        <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                            <h4 className="text-xs text-gray-400 mb-1">{f.label}</h4>
                                            <span className={`text-2xl font-black ${getScoreColor(f.score)}`}>{f.score}</span>
                                            <div className="mt-2 space-y-1">
                                                {Object.entries(f.metrics || {}).map(([mk, mv]: any) => (
                                                    <div key={mk} className="text-[10px] text-gray-500">
                                                        {mk}: <span className="text-gray-300 font-bold">{mv}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <Activity className="w-12 h-12 text-indigo-400/30 mx-auto mb-4" />
                                <p className="text-gray-500">종목코드를 입력하면 5축 퀀트 분석을 시작합니다</p>
                                <p className="text-xs text-gray-600 mt-2">가치 · 성장 · 모멘텀 · 수익성 · 안정성</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== HEALTH TAB ===== */}
                {activeTab === "health" && (
                    <div className="space-y-6">
                        {healthLoading ? (
                            <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-emerald-400 mb-3" /><p className="text-gray-500">재무 건전성 분석 중...</p></div>
                        ) : healthData ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {/* Health Overview */}
                                <div className="bg-gradient-to-br from-emerald-900/30 to-black border border-emerald-500/30 rounded-3xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black">{healthData.name}</h2>
                                            <p className="text-gray-400 text-sm">{healthData.symbol} · 재무 건전성 리포트</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getGradeStyle(healthData.grade)} flex items-center justify-center text-3xl font-black shadow-xl`}>
                                                {healthData.grade}
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-4xl font-black ${getScoreColor(healthData.health_score)}`}>{healthData.health_score}</span>
                                                <p className="text-xs text-gray-500">건전성 점수</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Z-Score & F-Score */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                                            <h4 className="text-sm font-bold text-gray-400 mb-2">📐 Altman Z-Score</h4>
                                            <div className="flex items-end gap-3">
                                                <span className="text-3xl font-black">{healthData.z_score?.value}</span>
                                                <span className={`text-sm font-bold pb-1 ${healthData.z_score?.color === "green" ? "text-green-400" : healthData.z_score?.color === "yellow" ? "text-yellow-400" : "text-red-400"}`}>
                                                    {healthData.z_score?.zone}
                                                </span>
                                            </div>
                                            <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${healthData.z_score?.color === "green" ? "bg-green-500" : healthData.z_score?.color === "yellow" ? "bg-yellow-500" : "bg-red-500"}`}
                                                    style={{ width: `${Math.min((healthData.z_score?.value || 0) / 5 * 100, 100)}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                                                <span>위험 (&lt;1.8)</span>
                                                <span>주의</span>
                                                <span>안전 (&gt;3.0)</span>
                                            </div>
                                        </div>

                                        <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                                            <h4 className="text-sm font-bold text-gray-400 mb-2">🏋️ Piotroski F-Score</h4>
                                            <div className="flex items-end gap-3">
                                                <span className="text-3xl font-black">{healthData.f_score?.value}</span>
                                                <span className="text-sm text-gray-500 pb-1">/ {healthData.f_score?.max}</span>
                                            </div>
                                            <div className="flex gap-1 mt-2">
                                                {Array.from({ length: 9 }, (_, i) => (
                                                    <div key={i} className={`h-3 flex-1 rounded-full ${i < (healthData.f_score?.value || 0) ? "bg-emerald-500" : "bg-gray-700"}`} />
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-gray-500 mt-1">0-3: 약함 | 4-6: 보통 | 7-9: 강함</p>
                                        </div>
                                    </div>
                                </div>

                                {/* F-Score Details */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <h4 className="font-bold text-sm text-gray-400 mb-3">F-Score 세부 항목</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                                        {(healthData.f_score?.details || []).map((d: string, i: number) => (
                                            <div key={i} className="text-xs py-1.5 px-2 bg-black/30 rounded-lg">{d}</div>
                                        ))}
                                    </div>
                                </div>

                                {/* Key Ratios */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <h4 className="font-bold text-sm text-gray-400 mb-3">핵심 재무 비율</h4>
                                    <div className="grid grid-cols-4 gap-3">
                                        {Object.entries(healthData.ratios || {}).map(([k, v]: any) => (
                                            <div key={k} className="text-center bg-black/30 rounded-xl p-3">
                                                <p className="text-[10px] text-gray-500">{k}</p>
                                                <p className="text-sm font-black text-white mt-0.5">{v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <Shield className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" />
                                <p className="text-gray-500">종목코드를 입력하면 재무 건강검진을 시작합니다</p>
                                <p className="text-xs text-gray-600 mt-2">Altman Z-Score · Piotroski F-Score · 핵심 비율</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== PEER TAB ===== */}
                {activeTab === "peer" && (
                    <div className="space-y-6">
                        <div className="flex gap-2">
                            <input type="text" placeholder="종목코드 쉼표로 구분 (예: 005930,000660,035420)"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500 uppercase font-mono"
                                value={peerSymbols} onChange={e => setPeerSymbols(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") fetchPeer(); }}
                            />
                            <button onClick={fetchPeer} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-sm">
                                비교 분석
                            </button>
                        </div>

                        {peerLoading ? (
                            <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-orange-400 mb-3" /><p className="text-gray-500">동종업계 비교 분석 중...</p></div>
                        ) : peerData?.data && peerData.data.length > 0 ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                {/* Comparison Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left py-3 px-2 text-gray-500 text-xs font-bold">지표</th>
                                                {peerData.data.map((s: any) => (
                                                    <th key={s.symbol} className="py-3 px-2 text-center">
                                                        <div className="font-black text-white">{s.name}</div>
                                                        <div className="text-[10px] text-gray-500">{s.symbol}</div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { key: "market_cap_display", label: "시가총액" },
                                                { key: "per", label: "PER (배)" },
                                                { key: "pbr", label: "PBR (배)" },
                                                { key: "roe", label: "ROE (%)" },
                                                { key: "operating_margin", label: "영업이익률 (%)" },
                                                { key: "revenue_growth", label: "매출성장률 (%)" },
                                                { key: "dividend_yield", label: "배당수익률 (%)" },
                                                { key: "debt_to_equity", label: "부채비율 (%)" },
                                                { key: "beta", label: "베타" },
                                                { key: "change_3m", label: "3개월 수익률 (%)" },
                                            ].map(metric => {
                                                const values = peerData.data.map((s: any) => parseFloat(s[metric.key]) || 0);
                                                const maxIdx = values.indexOf(Math.max(...values));
                                                const minIdx = values.indexOf(Math.min(...values));
                                                const isHigherBetter = !["per", "debt_to_equity", "beta"].includes(metric.key);

                                                return (
                                                    <tr key={metric.key} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="py-3 px-2 text-gray-400 text-xs font-bold whitespace-nowrap">{metric.label}</td>
                                                        {peerData.data.map((s: any, i: number) => {
                                                            const val = s[metric.key];
                                                            const isBest = isHigherBetter ? i === maxIdx : i === minIdx;
                                                            return (
                                                                <td key={s.symbol} className={`py-3 px-2 text-center font-mono ${isBest ? "text-green-400 font-black" : "text-gray-300"}`}>
                                                                    {val ?? "N/A"}
                                                                    {isBest && <span className="ml-1 text-[8px]">👑</span>}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Visual Bars */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {["roe", "operating_margin", "change_3m"].map(metric => {
                                        const label = peerData.metrics_labels?.[metric] || metric;
                                        const maxVal = Math.max(...peerData.data.map((s: any) => Math.abs(parseFloat(s[metric]) || 0)), 1);
                                        return (
                                            <div key={metric} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                                <h4 className="text-xs text-gray-500 font-bold mb-3">{label}</h4>
                                                {peerData.data.map((s: any) => {
                                                    const val = parseFloat(s[metric]) || 0;
                                                    const w = Math.abs(val) / maxVal * 100;
                                                    return (
                                                        <div key={s.symbol} className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs text-gray-400 w-16 truncate">{s.name?.slice(0, 4)}</span>
                                                            <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${val >= 0 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${w}%` }} />
                                                            </div>
                                                            <span className={`text-xs font-bold w-12 text-right ${val >= 0 ? "text-green-400" : "text-red-400"}`}>{val}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : !peerLoading && (
                            <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <Users className="w-12 h-12 text-orange-400/30 mx-auto mb-4" />
                                <p className="text-gray-500">종목코드를 입력하면 나란히 비교 분석합니다</p>
                                <p className="text-xs text-gray-600 mt-2">최대 5개 종목 · PER/PBR/ROE/성장률 등</p>
                            </div>
                        )}
                    </div>
                )}

                <p className="text-center text-[10px] text-gray-600 mt-6">
                    * 본 정보는 투자 참고용 데이터이며, 특정 종목의 매수·매도를 권유하지 않습니다.<br />
                    퀀트 점수는 과거 데이터 기반이며, 미래 수익을 보장하지 않습니다.
                </p>
            </div>
        </div>
    );
}
