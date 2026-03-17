"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Search, RefreshCw, Shield, BarChart3, Users, TrendingUp, TrendingDown,
    Activity, Zap, AlertTriangle, ChevronRight, X, Info, HelpCircle,
    Eye, EyeOff
} from "lucide-react";


// [v1.2.0] Added intuitive metaphors for beginners
export default function AnalysisPage() {

    const [symbol, setSymbol] = useState("");
    const [activeTab, setActiveTab] = useState<"quant" | "financial" | "peer">("quant");

    // Quant State
    const [quantData, setQuantData] = useState<any>(null);
    const [quantLoading, setQuantLoading] = useState(false);

    // Financial Analysis State
    const [financialData, setFinancialData] = useState<any>(null);
    const [financialLoading, setFinancialLoading] = useState(false);

    // Peer State
    const [peerSymbols, setPeerSymbols] = useState("005930,000660,035420");
    const [peerData, setPeerData] = useState<any>(null);
    const [peerLoading, setPeerLoading] = useState(false);
    
    // UI Helpers
    const [showEasy, setShowEasy] = useState(false);


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

    const fetchFinancial = async (sym: string) => {
        if (!sym) return;
        setFinancialLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/financial-health/${sym}`);
            const json = await res.json();
            if (json.status === "success") setFinancialData(json.data);
        } catch (err) { console.error(err); }
        finally { setFinancialLoading(false); }
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
        else if (activeTab === "financial") fetchFinancial(symbol);
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
            <Header title="프로 분석" subtitle="퀀트 · 재무 분석 · 동종비교" />

            <div className="max-w-4xl mx-auto px-4 space-y-6 pt-4">
                {/* Tabs - Centered Horizontal */}
                <div className="flex justify-center">
                    <div className="flex gap-1 bg-white/5 p-1 rounded-2xl w-full max-w-2xl">
                        <button
                            onClick={() => setActiveTab("quant")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "quant" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-400 hover:text-white"}`}
                        >
                            <Zap className="w-4 h-4" /> 퀀트 스코어
                        </button>
                        <button
                            onClick={() => setActiveTab("financial")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "financial" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-400 hover:text-white"}`}
                        >
                            <Shield className="w-4 h-4" /> 재무 분석
                        </button>
                        <button
                            onClick={() => setActiveTab("peer")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "peer" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-gray-400 hover:text-white"}`}
                        >
                            <Users className="w-4 h-4" /> 동종비교
                        </button>
                    </div>
                </div>

                {/* Search Bar - Horizontal Centered */}
                {(activeTab === "quant" || activeTab === "financial") && (
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="flex flex-row items-center gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-4" />
                                <input type="text" placeholder="종목코드 입력 (예: 005930, AAPL)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono transition-all"
                                    value={symbol} onChange={e => setSymbol(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                                />
                            </div>
                            <button onClick={handleSearch}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all whitespace-nowrap">
                                분석
                            </button>
                        </div>
                    </div>
                )}

                {/* Easy Mode Toggle - Positioned BELOW Search/Tabs on right as in screenshot */}
                <div className="flex justify-end">
                    <button 
                        onClick={() => setShowEasy(!showEasy)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showEasy ? "bg-orange-500/20 border-orange-500 text-orange-400" : "bg-white/5 border-white/10 text-gray-500 hover:text-white"}`}
                    >
                        {showEasy ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        초보자를 위한 쉬운 설명 {showEasy ? "끄기" : "켜기"}
                    </button>
                </div>

                {/* ===== QUANT TAB ===== */}
                {activeTab === "quant" && (
                    <div className="space-y-6">

                        {quantLoading ? (
                            <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-3" /><p className="text-gray-500">퀀트 분석 중...</p></div>
                        ) : quantData ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {showEasy && (
                                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2">
                                        <div className="bg-indigo-500/20 p-2 rounded-lg h-fit">
                                            <HelpCircle className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-indigo-400 mb-1">퀀트 스코어 가이드 활성화됨</h4>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                어렵게 느껴지는 5가지 분석 요소를 일상적인 건강 지표로 비유해 드릴게요. 종목의 종합적인 체질을 확인해 보세요!
                                            </p>
                                        </div>
                                    </div>
                                )}
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
                                    {Object.entries(quantData.factors || {}).map(([key, f]: any) => {
                                        const getFactorMetaphor = (label: string) => {
                                            if (label === "가치") return { title: "할인 마트 가격표", desc: "능력 대비 지금 가격이 '착한지' (가성비) 체크" };
                                            if (label === "성장") return { title: "내일은 더 클 아이?", desc: "매출과 이익이 얼마나 쑥쑥 자라는지 (성장성) 연구" };
                                            if (label === "모멘텀") return { title: "요즘 인기 폭발 중?", desc: "요즘 주가 흐름이 얼마나 힘찬지 (기세) 확인" };
                                            if (label === "수익성") return { title: "에너지 효율", desc: "투자 대비 얼마나 알차게 수익을 내나 확인" };
                                            if (label === "안정성") return { title: "뼈대 건강도", desc: "위기에도 쉽게 넘어지지 않는 튼튼한 체격인가" };
                                            return null;
                                        };
                                        const metaphor = getFactorMetaphor(f.label);

                                        return (
                                            <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center transition-all hover:border-indigo-500/30">
                                                <h4 className="text-xs text-gray-400 mb-1 flex flex-col items-center gap-1">
                                                    {f.label}
                                                    {showEasy && metaphor && (
                                                        <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded leading-none">
                                                            {metaphor.title}
                                                        </span>
                                                    )}
                                                </h4>
                                                <span className={`text-2xl font-black ${getScoreColor(f.score)}`}>{f.score}</span>
                                                {showEasy && metaphor && (
                                                    <p className="text-[9px] text-gray-500 mt-1 leading-tight font-medium">
                                                        {metaphor.desc}
                                                    </p>
                                                )}
                                                <div className="mt-2 space-y-1">
                                                    {Object.entries(f.metrics || {}).map(([mk, mv]: any) => {
                                                        const getMetricMetaphor = (mKey: string) => {
                                                            if (mKey === "PER") return "버는 돈 대비 가격표";
                                                            if (mKey === "PBR") return "재산 대비 가격표";
                                                            if (mKey === "매출성장률") return "덩치 커지는 속도";
                                                            if (mKey === "이익성장률") return "남는 돈 느는 속도";
                                                            if (mKey === "3개월수익률") return "최근 3달 달리기 성적";
                                                            if (mKey === "ROE") return "내 돈으로 알차게 벌었나";
                                                            if (mKey === "영업이익률") return "장사 순수 마진";
                                                            if (mKey === "부채비율") return "남의 살(빚) 무게";
                                                            if (mKey === "Beta") return "파도에 출렁이는 정도";
                                                            return null;
                                                        };
                                                        const mMetaphor = getMetricMetaphor(mk);

                                                        return (
                                                            <div key={mk} className="text-[10px] text-gray-500 flex flex-col items-center">
                                                                <div className="flex items-center gap-1">
                                                                    {mk}: <span className="text-gray-300 font-bold">{mv}</span>
                                                                </div>
                                                                {showEasy && mMetaphor && (
                                                                    <span className="text-[8px] text-indigo-400/80 leading-none mt-0.5">
                                                                        ({mMetaphor})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
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

                {/* ===== FINANCIAL TAB ===== */}
                {activeTab === "financial" && (
                    <div className="space-y-6">
                        {financialLoading ? (
                            <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-emerald-400 mb-3" /><p className="text-gray-500">재무 데이터 분석 중...</p></div>
                        ) : financialData ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {showEasy && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2">
                                        <div className="bg-emerald-500/20 p-2 rounded-lg h-fit">
                                            <HelpCircle className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-400 mb-1">초보자 가이드 모드 활성화됨</h4>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                어려운 재무 용어들을 알기 쉽게 풀어 설명해 드릴게요. 각 수치가 의미하는 '건강 상태'를 확인해 보세요!
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Analysis Overview */}
                                <div className="bg-gradient-to-br from-emerald-900/30 to-black border border-emerald-500/30 rounded-3xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black">{financialData.name}</h2>
                                            <p className="text-gray-400 text-sm">{financialData.symbol} · 재무 분석 리포트</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getGradeStyle(financialData.grade)} flex items-center justify-center text-3xl font-black shadow-xl`}>
                                                {financialData.grade}
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-4xl font-black ${getScoreColor(financialData.health_score)}`}>{financialData.health_score}</span>
                                                <p className="text-xs text-gray-500">분합 분석 점수</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Z-Score & F-Score */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-black/40 rounded-2xl p-4 border border-white/10 group">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                                                    📐 Altman Z-Score
                                                    {showEasy && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">당장 망할 일 없나?</span>}
                                                </h4>
                                            </div>
                                            {showEasy && (
                                                <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                    회사가 <span className="text-emerald-400 font-bold">당장 쓰러질 위험</span>(부도 위험)이 있는지 체크해요. <span className="text-emerald-400 font-bold">3.0 이상이면 '강철 심장'</span>을 가진 아주 튼튼한 상태예요!
                                                </p>
                                            )}


                                            <div className="flex items-end gap-3">
                                                <span className="text-3xl font-black">{financialData.z_score?.value}</span>
                                                <span className={`text-sm font-bold pb-1 ${financialData.z_score?.color === "green" ? "text-green-400" : financialData.z_score?.color === "yellow" ? "text-yellow-400" : "text-red-400"}`}>
                                                    {financialData.z_score?.zone}
                                                </span>
                                            </div>
                                            <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${financialData.z_score?.color === "green" ? "bg-green-500" : financialData.z_score?.color === "yellow" ? "bg-yellow-500" : "bg-red-500"}`}
                                                    style={{ width: `${Math.min((financialData.z_score?.value || 0) / 5 * 100, 100)}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                                                <span>위험 (&lt;1.8)</span>
                                                <span>주의</span>
                                                <span>안전 (&gt;3.0)</span>
                                            </div>
                                        </div>

                                        <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                                                    🏋️ Piotroski F-Score
                                                    {showEasy && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">전보다 건강해졌나?</span>}
                                                </h4>
                                            </div>
                                            {showEasy && (
                                                <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                    회사의 <span className="text-emerald-400 font-bold">기초 체력이 좋아졌는지</span> 보는 점수예요. 작년보다 돈은 잘 벌고 빚은 줄었는지 9가지를 깐깐하게 검사한 결과예요.
                                                </p>
                                            )}


                                            <div className="flex items-end gap-3">
                                                <span className="text-3xl font-black">{financialData.f_score?.value}</span>
                                                <span className="text-sm text-gray-500 pb-1">/ {financialData.f_score?.max}</span>
                                            </div>
                                            <div className="flex gap-1 mt-2">
                                                {Array.from({ length: 9 }, (_, i) => (
                                                    <div key={i} className={`h-3 flex-1 rounded-full ${i < (financialData.f_score?.value || 0) ? "bg-emerald-500" : "bg-gray-700"}`} />
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-gray-500 mt-1">0-3: 약함 | 4-6: 보통 | 7-9: 강함</p>
                                        </div>
                                    </div>
                                </div>

                                {/* F-Score Details */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <h4 className="font-bold text-sm text-gray-300 mb-3">F-Score 세부 항목</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        {(financialData.f_score?.details || []).map((d: string, i: number) => {
                                            const getFScoreMetaphor = (detail: string) => {
                                                const lower = detail.toLowerCase();
                                                if (lower.includes("순이익") && lower.includes("흑자")) return "올해 밥값 했나? (순이익 > 0)";
                                                if (lower.includes("영업현금흐름") && lower.includes("양수")) return "피가 잘 도나? (현금유입 > 0)";
                                                if (lower.includes("roa") && lower.includes("양수")) return "에너지 효율 체크 (ROA > 0)";
                                                if (lower.includes("현금흐름") && lower.includes("순이익")) return "장부보다 실속 있나? (현금 > 순이익)";
                                                if (lower.includes("부채비율")) return "군살(빚)이 빠졌나? (부채비율 < 50%)";
                                                if (lower.includes("유동비율")) return "비상금(현금여유) 늘었나? (유동비율 > 1.0)";
                                                if (lower.includes("신주발행")) return "새 사람한테 손 안벌렸나? (증자 없음)";
                                                if (lower.includes("매출총이익률")) return "장사 실력이 늘었나? (마진 개선)";
                                                if (lower.includes("자산회전율")) return "기계가 부지런히 돌아가나? (회전율 > 0.5)";
                                                return null;
                                            };
                                            const fMetaphor = getFScoreMetaphor(d);

                                            return (
                                                <div key={i} className="text-xs py-2 px-3 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-emerald-500">✅</span>
                                                        <span className="text-gray-200">{d}</span>
                                                    </div>
                                                    {showEasy && fMetaphor && (
                                                        <span className="text-[10px] text-emerald-400 font-bold ml-6 leading-none italic bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit">
                                                            "{fMetaphor}"
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Key Ratios */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <h4 className="font-bold text-sm text-gray-300 mb-3">핵심 재무 비율</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {Object.entries(financialData.ratios || {}).map(([k, v]: any) => {
                                            const getExplanation = (key: string) => {
                                                if (key === "PER") return "버는 돈 대비 '지금 가격표' (권장: < 15배)";
                                                if (key === "PBR") return "가진 재산 대비 '지금 가격표' (권장: < 1.0)";
                                                if (key === "ROE") return "내 돈으로 얼마나 잘 불렸나? (권장: > 10%)";
                                                if (key === "부채비율") return "남한테 빌린 돈이 너무 많진 않나? (권장: < 100%)";
                                                if (key === "유동비율") return "급할 때 당장 뺄 '비상금'이 있나? (권장: > 1.0)";
                                                if (key === "영업이익률") return "물건 팔아서 남긴 진짜 내 몫 (권장: > 10%)";
                                                if (key === "매출총이익률") return "원가 빼고 남긴 순수 마진 (권장: > 20%)";
                                                if (key === "자산회전율") return "내 재산을 얼마나 열심히 굴리나 (권장: > 0.5)";
                                                return "";
                                            };



                                            return (
                                                <div key={k} className="bg-black/30 rounded-2xl p-4 border border-white/5 transition-all hover:border-emerald-500/20">
                                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5">{k}</p>
                                                    <p className="text-lg font-black text-white">{v}</p>
                                                    {showEasy && (
                                                        <p className="text-[10px] text-emerald-400/70 mt-1 font-medium leading-tight">
                                                            {getExplanation(k)}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <Shield className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" />
                                <p className="text-gray-500">종목코드를 입력하면 재무 분석을 시작합니다</p>
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
                                                        <td className="py-3 px-2 text-gray-400 text-xs font-bold whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span>{metric.label}</span>
                                                                {showEasy && (() => {
                                                                    const metaphors: any = {
                                                                        "market_cap_display": "덩치 (회사 규모)",
                                                                        "per": "가성비 (이익 대비 주가)",
                                                                        "pbr": "장부 가격 (자산 대비 주가)",
                                                                        "roe": "성장판 (내실 있는 성장)",
                                                                        "operating_margin": "장사 실력 (마진)",
                                                                        "revenue_growth": "성장 속도",
                                                                        "dividend_yield": "보너스 (배당금)",
                                                                        "debt_to_equity": "군살 (낮을수록 안전)",
                                                                        "beta": "민감도 (변동성)",
                                                                        "change_3m": "최근 흐름 (3개월)"
                                                                    };
                                                                    return metaphors[metric.key] ? (
                                                                        <span className="text-[9px] text-orange-400 font-normal mt-0.5">
                                                                            {metaphors[metric.key]}
                                                                        </span>
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                        </td>
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

                                {/* 종합 검진 리뷰 (요약 리포트) */}
                                <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl p-6 mt-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-orange-500/20 rounded-lg">
                                            <BarChart3 className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <h3 className="font-bold text-lg">그룹 종합 검진 리뷰</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* 지표별 리더 */}
                                        <div className="space-y-3">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">주요 지표 우수 종목</p>
                                            {[
                                                { label: "💰 가성비 대장 (최저 PER)", key: "per", isLowBetter: true },
                                                { label: "🚀 성장판 우등생 (최상 ROE)", key: "roe", isLowBetter: false },
                                                { label: "🛡️ 강철 체력 (최저 부채비율)", key: "debt_to_equity", isLowBetter: true },
                                            ].map(item => {
                                                const validData = peerData.data.filter((s: any) => (parseFloat(s[item.key]) || 0) > 0);
                                                if (validData.length === 0) return null;
                                                const leader = item.isLowBetter 
                                                    ? validData.reduce((prev: any, curr: any) => (parseFloat(prev[item.key]) < parseFloat(curr[item.key]) ? prev : curr))
                                                    : validData.reduce((prev: any, curr: any) => (parseFloat(prev[item.key]) > parseFloat(curr[item.key]) ? prev : curr));
                                                
                                                return (
                                                    <div key={item.key} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                                                        <span className="text-xs text-gray-300">{item.label}</span>
                                                        <span className="text-sm font-black text-orange-400">{leader.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* 데이터 요약 분석 */}
                                        <div className="space-y-3">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">데이터 요약 분석</p>
                                            <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                                                {(() => {
                                                    const avgPer = peerData.data.reduce((acc: number, s: any) => acc + (parseFloat(s.per) || 0), 0) / peerData.data.length;
                                                    const avgRoe = peerData.data.reduce((acc: number, s: any) => acc + (parseFloat(s.roe) || 0), 0) / peerData.data.length;
                                                    return (
                                                        <div className="text-xs leading-relaxed text-gray-400">
                                                            검색된 그룹의 평균 PER은 <span className="text-white font-bold">{avgPer.toFixed(1)}배</span>, 
                                                            평균 ROE는 <span className="text-white font-bold">{avgRoe.toFixed(1)}%</span>입니다.
                                                            <br /><br />
                                                            {avgPer < 15 ? "이 그룹은 전반적으로 가치가 저평가된 '알짜' 종목들이 포함되어 있습니다. " : "이 그룹은 전반적으로 시장의 높은 기대를 받고 있는 '성장주' 위주의 구성입니다. "}
                                                            {avgRoe > 15 ? "수익성 또한 우수하여 효율적으로 돈을 벌고 있는 상태로 분석됩니다." : "수익성은 보통 수준이며, 업계 평균 수동과 비교해 볼 필요가 있습니다."}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 pt-4 border-t border-white/5 flex items-start gap-2">
                                        <AlertTriangle className="w-3 h-3 text-gray-600 mt-0.5" />
                                        <p className="text-[10px] text-gray-600 leading-tight">
                                            위 정보는 입력된 종목들 간의 상대적인 수치 비교이며, 절대적인 투자 판단의 근거가 될 수 없습니다. 
                                            특정 종목의 매수 또는 매도를 권유하는 것이 아닌 단순 데이터 요약임을 밝힙니다.
                                        </p>
                                    </div>
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
