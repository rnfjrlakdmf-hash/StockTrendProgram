"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Search, RefreshCw, Shield, BarChart3, Users, TrendingUp, TrendingDown,
    Activity, Zap, AlertTriangle, ChevronRight, X, Info, HelpCircle,
    Eye, EyeOff, LayoutDashboard, History, PieChart, LineChart as LineIcon,
    Coins, ArrowUpRight, AlertCircle
} from "lucide-react";
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import TurboQuantIndicators from "@/components/TurboQuantIndicators";
import BlinkingPrice from "@/components/BlinkingPrice";


// [v4.9.5] Deep-Sector-Matrix Analysis Dashboard
function AnalysisContent() {
    const searchParams = useSearchParams();
    const urlSymbol = searchParams.get("symbol");

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [symbol, setSymbol] = useState("");
    const [activeTab, setActiveTab] = useState<"quant" | "financial" | "sector" | "peer">("quant");

    // Quant State
    const [quantData, setQuantData] = useState<any>(null);
    const [quantLoading, setQuantLoading] = useState(false);
    const [isTurbo, setIsTurbo] = useState(false);

    // Financial Analysis State
    const [financialData, setFinancialData] = useState<any>(null);
    const [financialLoading, setFinancialLoading] = useState(false);

    // Sector State
    const [sectorData, setSectorData] = useState<any>(null);
    const [sectorLoading, setSectorLoading] = useState(false);

    // Peer State
    const [peerSymbols, setPeerSymbols] = useState("005930,000660,035420");
    const [peerData, setPeerData] = useState<any>(null);
    const [peerLoading, setPeerLoading] = useState(false);

    // Global Stock Info (Price, Change, etc.)
    const [stockInfo, setStockInfo] = useState<any>(null);
    const [stockLoading, setStockLoading] = useState(false);

    // UI Helpers
    const [showEasy, setShowEasy] = useState(false);

    // [v1.9.0] 개별 분석 실행을 위한 타겟 심볼 상태들
    const [quantSymbol, setQuantSymbol] = useState("");
    const [finSymbol, setFinSymbol] = useState("");
    const [secSymbol, setSecSymbol] = useState("");
    const [activeSectorTab, setActiveSectorTab] = useState(0);
    const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

    // [v4.9.5] Sync Trigger
    useEffect(() => {
        if (!symbol || stockLoading) return;
        const targetSymbol = symbol.trim();
        if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(targetSymbol)) return;
        if (targetSymbol.length < 5) return;

        if (activeTab === "sector" && secSymbol !== targetSymbol) {
            handleGlobalSearch("sector");
        } else if (activeTab === "quant" && quantSymbol !== targetSymbol) {
            handleGlobalSearch("quant");
        } else if (activeTab === "financial" && finSymbol !== targetSymbol) {
            handleGlobalSearch("financial");
        }
    }, [activeTab, symbol]);

    const handleGlobalSearch = async (tab: string) => {
        let targetSymbol = symbol.trim();
        if (!targetSymbol) return;

        if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(targetSymbol)) {
            setStockLoading(true);
            try {
                const searchUrl = `${API_BASE_URL}/api/stock/search?q=${encodeURIComponent(targetSymbol)}`;
                const res = await fetch(searchUrl);
                const json = await res.json();
                if (json.status === "success" && json.data && json.data.length > 0) {
                    targetSymbol = json.data[0].code;
                    setSymbol(targetSymbol);
                } else {
                    alert(`해당 종목('${targetSymbol}')을 찾을 수 없습니다.`);
                    setStockLoading(false);
                    return;
                }
            } catch (err) {
                console.error(err);
                setStockLoading(false);
                return;
            } finally {
                setStockLoading(false);
            }
        }

        switch (tab) {
            case "quant": setQuantSymbol(targetSymbol); fetchBasicInfo(targetSymbol); fetchQuant(targetSymbol); break;
            case "financial": setFinSymbol(targetSymbol); fetchBasicInfo(targetSymbol); fetchFinancial(targetSymbol); break;
            case "sector": 
                setSelectedSectorId(null);
                setSecSymbol(targetSymbol); 
                fetchBasicInfo(targetSymbol); 
                fetchSectorAnalysis(targetSymbol); 
                break;
        }
    };

    const fetchBasicInfo = async (sym: string) => {
        if (!sym) return;
        setStockLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pro/summary/${sym}`);
            const json = await res.json();
            if (json.status === "success") setStockInfo(json.data.stock_info);
        } catch (err) { console.error(err); }
        finally { setStockLoading(false); }
    };

    const fetchQuant = async (sym: string) => {
        if (!sym) return;
        setQuantLoading(true);
        setIsTurbo(false);
        try {
            const res = await fetch(`${API_BASE_URL}/api/quant/${sym}`);
            const json = await res.json();
            if (json.status === "success") {
                setQuantData(json.data);
                if (json.turbo) setIsTurbo(true);
            }
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

    const fetchSectorAnalysis = async (sym: string, sector_id: string | null = null) => {
        if (!sym) return;
        setSectorLoading(true);
        try {
            const url = new URL(`${API_BASE_URL}/api/sector-analysis/${sym}`);
            if (sector_id) url.searchParams.append("sector_id", sector_id);
            url.searchParams.append("v", "4.9.5");
            url.searchParams.append("t", new Date().getTime().toString());

            const res = await fetch(url.toString());
            const json = await res.json();
            if (json.status === "success") {
                setSectorData(json.data);
                const activeId = json.data.compare_sectors?.find((s: any) => s.selected)?.id;
                if (!selectedSectorId && activeId) setSelectedSectorId(activeId);
            }
        } catch (err) { console.error(err); }
        finally { setSectorLoading(false); }
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
                {gridLevels.map(level => (
                    <polygon key={level} points={keys.map((_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                ))}
                {keys.map((_, i) => { const p = getPoint(i, 100); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />; })}
                <polygon points={keys.map((k, i) => { const p = getPoint(i, factors[k]?.score || 0); return `${p.x},${p.y}`; }).join(" ")} fill="rgba(99,102,241,0.3)" stroke="rgb(99,102,241)" strokeWidth="2" />
                {keys.map((k, i) => { const p = getPoint(i, factors[k]?.score || 0); return <circle key={k} cx={p.x} cy={p.y} r="4" fill="rgb(129,140,248)" />; })}
                {keys.map((k, i) => { const p = getPoint(i, 120); return <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="bold"> {labels[i]} </text>; })}
            </svg>
        );
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen pb-20 text-white bg-black notranslate" translate="no">
            <Header title="프로 분석" subtitle="데이터 기반 종목 정밀 검진" />

            <div className="max-w-5xl mx-auto px-4 space-y-6 pt-4">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-4 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="text" placeholder="종목코드 입력 (예: 005930, 삼성전자)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-5 text-base outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase font-mono transition-all placeholder:text-gray-600 shadow-2xl"
                            value={symbol} onChange={e => setSymbol(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleGlobalSearch(activeTab); }}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Select a stock and click 'Analyze' in each tab below</p>
                        <span className="bg-red-500/10 text-red-400 text-[9px] font-black px-2 py-0.5 rounded border border-red-500/20">
                            Deep-Sector-Matrix v4.9.5 PRECISION-SYNC
                        </span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 w-full">
                        {stockInfo && (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-3xl font-black">{stockInfo.name}</h2>
                                            <span className="text-gray-500 font-mono text-sm tracking-widest">{stockInfo.symbol}</span>
                                        </div>
                                        <div className="flex items-baseline gap-3">
                                            <BlinkingPrice price={stockInfo.price || "---"} className={`text-4xl font-black font-mono tracking-tighter ${parseFloat(stockInfo.change_rate) > 0 ? "text-red-500" : parseFloat(stockInfo.change_rate) < 0 ? "text-blue-500" : "text-white"}`} />
                                            <div className={`flex items-center gap-1 font-bold ${parseFloat(stockInfo.change_rate) > 0 ? "text-red-400" : parseFloat(stockInfo.change_rate) < 0 ? "text-blue-400" : "text-gray-400"}`}>
                                                {parseFloat(stockInfo.change_rate) > 0 ? <TrendingUp className="w-4 h-4" /> : parseFloat(stockInfo.change_rate) < 0 ? <TrendingDown className="w-4 h-4" /> : <span className="w-4 h-4 flex items-center justify-center">-</span>}
                                                <span className="text-lg">{stockInfo.change?.toLocaleString()}</span>
                                                <span className="text-sm">({parseFloat(stockInfo.change_rate) > 0 ? "+" : ""}{stockInfo.change_rate}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                        <div className="bg-black/40 px-4 py-3 rounded-2xl border border-white/5">
                                            <p className="mb-1 opacity-50">시가총액</p>
                                            <p className="text-sm text-gray-300">{stockInfo.market_cap_str || stockInfo.market_cap || "N/A"}</p>
                                        </div>
                                        {quantData && (
                                            <>
                                                <div className="bg-white/5 px-4 py-3 rounded-2xl">
                                                    <p className="mb-1 opacity-50">종합 점수</p>
                                                    <p className={`text-xl ${getScoreColor(quantData.total_score)}`}>{quantData.total_score}점</p>
                                                </div>
                                                <div className={`px-5 py-3 rounded-2xl bg-gradient-to-br ${getGradeStyle(quantData.grade)} flex flex-col justify-center`}>
                                                    <p className="mb-1 opacity-70 text-black">등급</p>
                                                    <p className="text-xl font-black text-black">{quantData.grade}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setShowEasy(!showEasy)}
                        className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-sm transition-all shadow-xl group border ${showEasy ? "bg-indigo-600 border-indigo-400 text-white" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}>
                        <HelpCircle className={`w-5 h-5 ${showEasy ? "animate-bounce" : ""}`} />
                        <div className="text-left leading-none">
                            <p className="text-[10px] uppercase tracking-widest mb-1 opacity-70">Guide Mode</p>
                            <p className="text-xs">{showEasy ? "가이드 끄기" : "가이드 켜기"}</p>
                        </div>
                    </button>
                </div>

                <div className="sticky top-4 z-40 flex justify-center py-2 bg-black/50 backdrop-blur-md rounded-2xl border border-white/5">
                    <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-full max-w-2xl">
                        {[
                            { id: "quant", label: "TurboQuant", icon: Zap },
                            { id: "financial", label: "재무 분석", icon: Shield },
                            { id: "sector", label: "섹터 분석", icon: PieChart },
                            { id: "peer", label: "동종비교", icon: Users }
                        ].map((tab: any) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-[400px] mt-4">
                    {activeTab === "quant" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/20 rounded-lg"><Zap className="w-5 h-5 text-amber-400" /></div>
                                    <h3 className="font-bold whitespace-nowrap">TurboQuant 정밀 분석</h3>
                                </div>
                                <button onClick={() => handleGlobalSearch("quant")}
                                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                    퀀트 로드
                                </button>
                            </div>

                            {quantLoading ? (
                                <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-3" /><p className="text-gray-500">지표 분석 중...</p></div>
                            ) : quantData ? (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-indigo-900/30 to-black border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGradeStyle(quantData.grade)} flex items-center justify-center text-xl font-black shadow-lg`}>{quantData.grade}</div>
                                                <div><h3 className="text-lg font-bold">5축 퀀트 정밀 진단</h3><p className="text-xs text-gray-500">각 팩터별 점수와 세부 지표를 확인하세요</p></div>
                                            </div>
                                            <div className="text-right"><span className={`text-3xl font-black ${getScoreColor(quantData.total_score)}`}>{quantData.total_score}</span><p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Total Score</p></div>
                                        </div>
                                        <RadarChart factors={quantData.factors} />
                                        <div className="mt-8 pt-6 border-t border-white/10">
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                {Object.entries(quantData.factors || {}).map(([key, f]: any) => (
                                                    <div key={key} className="flex flex-col items-center text-center">
                                                        <span className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">{f.label}</span>
                                                        <span className={`text-2xl font-black mb-1 ${getScoreColor(f.score)}`}>{f.score}</span>
                                                        <div className="space-y-0.5 opacity-60">
                                                            {Object.entries(f.metrics || {}).map(([mk, mv]: any) => (
                                                                <div key={mk} className="text-[9px] text-gray-400 flex items-center justify-center gap-1"><span>{mk}</span><span className="text-gray-200 font-bold">{mv}</span></div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-indigo-500/20 bg-indigo-500/5">
                                        <TurboQuantIndicators symbol={quantSymbol || symbol} showEasy={showEasy} />
                                    </div>
                                </div>
                            ) : <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10"> <Activity className="w-12 h-12 text-indigo-400/30 mx-auto mb-4" /> <p className="text-gray-500">종목코드를 입력하면 5축 퀀트 분석을 시작합니다</p> </div>}
                        </div>
                    )}

                    {activeTab === "financial" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg"><Shield className="w-5 h-5 text-emerald-400" /></div>
                                    <h3 className="font-bold whitespace-nowrap">재무 건강도 진단</h3>
                                </div>
                                <button onClick={() => handleGlobalSearch("financial")}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                    건강도 측정
                                </button>
                            </div>
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
                                                    어려운 재무 용어들을 알기 쉽게 기업의 '건강 상태'에 비유하여 설명해 드릴게요.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-gradient-to-br from-emerald-900/30 to-black border border-emerald-500/30 rounded-3xl p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div><h2 className="text-2xl font-black text-white">안전성 및 재무 건강도 진단</h2><p className="text-gray-400 text-sm">종목의 기초 체력과 위기 관리 능력을 정밀 스캔합니다.</p></div>
                                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getGradeStyle(financialData.grade)} flex items-center justify-center text-3xl font-black shadow-xl`}>{financialData.grade}</div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                                                <div className="flex items-center gap-2 mb-6"><Shield className="w-4 h-4 text-emerald-400" /><h4 className="text-xs font-black uppercase tracking-widest text-emerald-300">3개년 안전성 추이</h4></div>
                                                <div className="h-[200px] w-full">
                                                    {financialData.charts?.stability ? (
                                                        <ResponsiveContainer width="100%" height="100%"><LineChart data={financialData.charts.stability}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} /><XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '11px' }} /><Legend iconType="circle" /><Line type="monotone" dataKey="부채비율" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} /><Line type="monotone" dataKey="당좌비율" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer>
                                                    ) : <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest">No Trend Data</div>}
                                                </div>
                                            </div>
                                            <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                                                <div className="flex items-center gap-2 mb-6"><TrendingUp className="w-4 h-4 text-indigo-400" /><h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">3개년 수익 효율 추이</h4></div>
                                                <div className="h-[200px] w-full">
                                                    {financialData.charts?.profitability ? (
                                                        <ResponsiveContainer width="100%" height="100%"><AreaChart data={financialData.charts.profitability}><defs><linearGradient id="colorROE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} /><XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '11px' }} /><Area type="monotone" dataKey="ROE" stroke="#6366f1" fillOpacity={1} fill="url(#colorROE)" strokeWidth={3} /><Area type="monotone" dataKey="영업이익률" stroke="#8b5cf6" fillOpacity={0.1} strokeWidth={2} /></AreaChart></ResponsiveContainer>
                                                    ) : <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest">No Trend Data</div>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-black/40 rounded-2xl p-4 border border-white/10 group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 whitespace-nowrap">
                                                        📐 Altman Z-Score
                                                        {showEasy && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">부도 위험률</span>}
                                                    </h4>
                                                </div>
                                                {showEasy && (
                                                    <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                        당장 쓰러질 위험(부도 위험)이 있는지 체크해요. <span className="text-emerald-400 font-bold">3.0 이상이면 '강철 체력'</span>을 가진 아주 튼튼한 상태예요!
                                                    </p>
                                                )}
                                                <div className="flex items-end gap-3">
                                                    <span className="text-3xl font-black">{financialData.z_score?.value}</span>
                                                    <span className={`text-sm font-bold pb-1 ${financialData.z_score?.color === "green" ? "text-green-400" : financialData.z_score?.color === "yellow" ? "text-yellow-400" : "text-red-400"}`}>
                                                        {financialData.z_score?.zone} ZONE
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="bg-black/40 rounded-2xl p-4 border border-white/10 group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 whitespace-nowrap">
                                                        🏋️ Piotroski F-Score
                                                        {showEasy && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">종합 기초체력</span>}
                                                    </h4>
                                                </div>
                                                {showEasy && (
                                                    <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                        회사의 <span className="text-emerald-400 font-bold">'근육과 체지방'</span>을 봅니다. 이익은 늘고 빚은 줄었는지 9단계를 엄격히 검진한 기초체력 점수예요. 7점 이상이면 우수해요.
                                                    </p>
                                                )}
                                                <div className="flex items-end gap-3">
                                                    <span className="text-3xl font-black">{financialData.f_score?.value}</span>
                                                    <span className="text-sm text-gray-500 pb-1">/ 9</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* F-Score Details */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <h4 className="font-bold text-sm text-gray-300 mb-3">F-Score 세부 항목</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            {(financialData.f_score?.details || []).map((d: string, i: number) => (
                                                <div key={i} className="text-xs py-2 px-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-2">
                                                    <span className="text-emerald-500">✓</span> {d}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Key Ratios */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <h4 className="font-bold text-sm text-gray-300 mb-3">핵심 재무 비율</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {Object.entries(financialData.ratios || {}).map(([k, v]: any) => {
                                                const getExplanation = (key: string) => {
                                                    if (key === "PER") return "버는 능력 대비 '현재 가격표'";
                                                    if (key === "PBR") return "가진 자산 대비 '현재 가격표'";
                                                    if (key === "ROE") return "투자금 대비 '근성' (회사의 가성비)";
                                                    if (key === "부채비율") return "몸무게 대비 '체지방' (빌린 돈)";
                                                    if (key === "유동비율") return "지갑 속 '비상금' (현금 여유)";
                                                    if (key === "영업이익률") return "1만원어치 팔아 얼마를 남기나";
                                                    if (key === "매출총이익률") return "물건 떼와서 남긴 순수 마진";
                                                    if (key === "자산회전율") return "자산을 얼마나 부지런히 굴리나";
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
                            ) : <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10"> <Shield className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" /> <p className="text-gray-500">종목코드를 입력하면 재무 분석을 시작합니다</p> </div>}
                        </div>
                    )}

                    {activeTab === "sector" && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-2xl">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-3 bg-red-500/20 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.2)]"><PieChart className="w-6 h-6 text-red-500" /></div>
                                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Deep-Sector-Matrix v4.9.5</h3>
                                    </div>
                                    <p className="text-gray-400 text-sm font-medium">대상 종목 vs 섹터 평균 vs 시장 지수 (17개 지표 초정밀 분석)</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={selectedSectorId || (sectorData?.compare_sectors || []).find((s: any) => s.selected)?.id || ""}
                                        onChange={(e) => { const newId = e.target.value; setSelectedSectorId(newId); fetchSectorAnalysis(secSymbol || symbol, newId); }}
                                        className="bg-black/80 border border-white/20 rounded-2xl px-6 py-3 text-sm font-black text-white outline-none focus:ring-4 focus:ring-red-500/30 min-w-[240px] cursor-pointer appearance-none shadow-xl"
                                    >
                                        {(sectorData?.compare_sectors || []).map((s: any) => <option key={s.id} value={s.id} className="bg-gray-900 text-white">{s.name}</option>)}
                                    </select>
                                    <button onClick={() => handleGlobalSearch("sector")} className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-2xl text-sm font-black shadow-[0_10px_30px_rgba(239,68,68,0.3)] transition-all active:scale-95 text-white">데이터 갱신</button>
                                </div>
                            </div>

                            {sectorLoading ? (
                                <div className="text-center py-32"><RefreshCw className="w-16 h-16 animate-spin mx-auto text-red-500 mb-6 opacity-50" /><p className="text-gray-400 font-black tracking-widest uppercase">Fetching 17-Factor Deep Matrix...</p></div>
                            ) : sectorData ? (
                                <div className="space-y-16">
                                    {(() => {
                                        const sectorSections = [
                                            {
                                                group: "Value Analytics (가치 분석)",
                                                metrics: [
                                                    { key: "PER", label: "PER (배)" },
                                                    { key: "PBR", label: "PBR (배)" },
                                                    { key: "Fwd. 12M PER 추이", label: "Fwd. 12M PER" },
                                                    { key: "Fwd. 12M PBR 추이", label: "Fwd. 12M PBR" }
                                                ]
                                            },
                                            {
                                                group: "Growth Dynamics (성장성 분석)",
                                                metrics: [
                                                    { key: "매출액증가율", label: "매출액 증가율 (%)" },
                                                    { key: "영업이익증가율", label: "영업이익 증가율 (%)" },
                                                    { key: "순이익증가율", label: "순이익 증가율 (%)" }
                                                ]
                                            },
                                            {
                                                group: "Profitability Engine (수익성 분석)",
                                                metrics: [
                                                    { key: "ROE", label: "ROE (%)" },
                                                    { key: "ROA", label: "ROA (%)" },
                                                    { key: "매출총이익률", label: "매출총이익률 (%)" },
                                                    { key: "영업이익률", label: "영업이익률 (%)" },
                                                    { key: "순이익률", label: "순이익률 (%)" }
                                                ]
                                            },
                                            {
                                                group: "Stability & Returns (안정성 및 수익률)",
                                                metrics: [
                                                    { key: "부채비율", label: "부채비율 (%)" },
                                                    { key: "유동비율", label: "유동비율 (%)" },
                                                    { key: "배당수익률", label: "배당수익률 (%)" },
                                                    { key: "배당성향", label: "배당성향 (%)" },
                                                    { key: "주가수익률", label: "주가 수익률 (%)" }
                                                ]
                                            }
                                        ];
                                        return (
                                            <div className="space-y-6">
                                                <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                                                    {sectorSections.map((sec: any, idx: number) => (
                                                        <button 
                                                            key={idx}
                                                            onClick={() => setActiveSectorTab(idx)}
                                                            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSectorTab === idx ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-transparent text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                                    >
                                                        {sec.group.split(' (')[1].replace(')', '')} 
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                                        {sectorSections[activeSectorTab].group}
                                                    </h3>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {sectorSections[activeSectorTab].metrics.map((metric) => {
                                                    const cat = (sectorData.charts || {})[metric.key];
                                                    if (!cat) return null;
                                                    return (
                                                        <div key={metric.key} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all duration-500 hover:scale-[1.01] hover:border-red-500/20 group shadow-2xl">
                                                            <div className="flex items-center justify-between mb-8">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-2.5 h-10 bg-red-600 rounded-full group-hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all" />
                                                                    <h3 className="text-xl font-black text-white tracking-tighter uppercase">{metric.label}</h3>
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[10px] font-black text-gray-500 uppercase mb-1 tracking-widest">Curr FY0</span>
                                                                    <span className="text-3xl font-black text-red-500 tabular-nums drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                                                        {(() => {
                                                                            const r = cat.rows?.find((r: any) => r.name === "내 종목");
                                                                            if (!r) return "-";
                                                                            const hds = cat.headers || [];
                                                                            const isEst = hds.some((h: string) => h.includes('(E)') || h.includes('(A)'));
                                                                            const targetIdx = isEst && hds.length > 1 ? hds.length - 2 : hds.length - 1;
                                                                            const targetH = hds[targetIdx] || "";
                                                                            return r[targetH] ?? "-";
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="h-[300px] w-full">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={cat.chart_data}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                                        <XAxis dataKey="period" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} dy={15} />
                                                                        <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} width={40} />
                                                                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', borderRadius: '24px', fontSize: '11px', color: '#fff', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }} itemStyle={{ fontWeight: '900', padding: '4px 0' }} cursor={{ stroke: '#ffffff10', strokeWidth: 1 }} />
                                                                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', paddingBottom: '40px' }} />
                                                                        <Line type="monotone" dataKey="내 종목" stroke="#ef4444" strokeWidth={6} dot={{ r: 6, strokeWidth: 3, fill: '#ef4444', stroke: '#000' }} activeDot={{ r: 10, strokeWidth: 0 }} animationDuration={2500} />
                                                                        <Line type="monotone" dataKey="섹터 평균" stroke="#10b981" strokeWidth={2.5} strokeDasharray="8 4" dot={{ r: 4, fill: '#10b981' }} animationDuration={2500} />
                                                                        <Line type="monotone" dataKey="시장 지수" stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="4 8" dot={{ r: 4, fill: '#3b82f6' }} animationDuration={2500} />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                    })()}
                                </div>
                            ) : <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10"><PieChart className="w-20 h-20 text-red-500/20 mx-auto mb-6" /><p className="text-gray-400 font-black tracking-[0.3em] text-sm uppercase">Sector Matrix Stand-By</p></div>}
                        </div>
                    )}

                    {activeTab === "peer" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-lg"><Users className="w-5 h-5 text-purple-400" /></div>
                                    <h3 className="font-bold">동종 업계 비교</h3>
                                </div>
                                <button onClick={fetchPeer} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">피어 분석</button>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex gap-4">
                                <input type="text" placeholder="종목코드 쉼표로 구분 (예: 005930,000660)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500 uppercase font-mono text-white" value={peerSymbols} onChange={e => setPeerSymbols(e.target.value)} onKeyDown={e => { if (e.key === "Enter") fetchPeer(); }} />
                                <button onClick={fetchPeer} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-black text-sm text-white transition-all active:scale-95">비교 분석</button>
                            </div>
                            {peerLoading ? (
                                <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-orange-400 mb-3" /><p className="text-gray-500">피어 데이터 분석 중...</p></div>
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
                                    <p className="text-gray-500">비교할 종목 코드를 입력하세요</p>
                                    <p className="text-xs text-gray-600 mt-2">최대 5개 종목 · PER/PBR/ROE/성장률 등</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-center text-[10px] text-gray-600 mt-16 font-bold tracking-tight opacity-50">
                    * 본 정보는 투자 참고용이며, 최종 투자 판단의 책임은 본인에게 있습니다.<br />
                    v4.9.5 PRECISION-SYNC (Deep-Sector-Matrix)
                </p>
            </div>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex flex-col items-center justify-center"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-4" /><p className="text-gray-400 font-bold">로딩 중...</p></div>}>
            <AnalysisContent />
        </Suspense>
    );
}
