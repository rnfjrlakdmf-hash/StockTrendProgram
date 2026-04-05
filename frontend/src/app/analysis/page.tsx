"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Search, RefreshCw, Shield, BarChart3, Users, TrendingUp, TrendingDown,
    Activity, Zap, AlertTriangle, ChevronRight, X, Info, HelpCircle,
    Eye, EyeOff, LayoutDashboard, History, PieChart, LineChart as LineIcon,
    Coins, ArrowUpRight
} from "lucide-react";
import { 
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import TurboQuantIndicators from "@/components/TurboQuantIndicators";
import ProSummaryReport from "@/components/ProSummaryReport";
import BlinkingPrice from "@/components/BlinkingPrice";


// [v1.2.0] Added intuitive metaphors for beginners
function AnalysisContent() {
    const searchParams = useSearchParams();
    const urlSymbol = searchParams.get("symbol");

    const [symbol, setSymbol] = useState("");
    const [activeTab, setActiveTab] = useState<"summary" | "quant" | "financial" | "sector" | "peer">("summary");

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
    const [summarySymbol, setSummarySymbol] = useState("");
    const [quantSymbol, setQuantSymbol] = useState("");
    const [finSymbol, setFinSymbol] = useState("");
    const [secSymbol, setSecSymbol] = useState("");
    const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
    
    // [v2.1.0] Sector Analysis Sub-Modes State
    const [sectorSubModes, setSectorSubModes] = useState<Record<string, number>>({
        "returns": 1,
        "dividend": 1,
        "per": 1,
        "pbr": 1,
        "roe": 1,
        "stability": 1,
        "growth": 1,
        "margin": 1
    });

    // [v2.7.2] Auto-Sync Trigger: Automatically fetch data when tab changes if symbol is present
    useEffect(() => {
        if (!symbol || stockLoading) return;
        
        const targetSymbol = symbol.trim();
        // 한글이 포함되어 있으면 검색이 필요하므로 자동 트리거에서 제외 (사용자가 직접 검색 유도)
        if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(targetSymbol)) return; 
        if (targetSymbol.length < 5) return; // 유효한 코드가 아닐 가능성

        if (activeTab === "sector" && secSymbol !== targetSymbol) {
            handleGlobalSearch("sector");
        } else if (activeTab === "quant" && quantSymbol !== targetSymbol) {
            handleGlobalSearch("quant");
        } else if (activeTab === "financial" && finSymbol !== targetSymbol) {
            handleGlobalSearch("financial");
        } else if (activeTab === "summary" && summarySymbol !== targetSymbol) {
            if (!stockInfo || stockInfo.symbol !== targetSymbol) {
                handleGlobalSearch("summary");
            }
        }
    }, [activeTab, symbol]);

    const handleGlobalSearch = async (tab: string) => {
        let targetSymbol = symbol.trim();
        if (!targetSymbol) return;
        
        if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(targetSymbol)) {
            setStockLoading(true);
            try {
                const searchUrl = `${API_BASE_URL}/api/stock/search?q=${encodeURIComponent(targetSymbol)}`;
                console.log(`[Search] Requesting: ${searchUrl}`);
                
                const res = await fetch(searchUrl);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                
                const json = await res.json();
                console.log(`[Search] Response:`, json);

                if (json.status === "success" && json.data && json.data.length > 0) {
                    targetSymbol = json.data[0].code;
                    console.log(`[Search] Success! Found code: ${targetSymbol}`);
                    setSymbol(targetSymbol); // 상태 업데이트
                } else {
                    console.warn(`[Search] No stock found for: ${targetSymbol}`, json);
                    alert(`해당 종목('${targetSymbol}')을 찾을 수 없습니다.\n검색 결과가 없거나 백엔드 오류일 수 있습니다.`);
                    setStockLoading(false);
                    return;
                }
            } catch (err) {
                console.error("[Search] Failed to fetch search API:", err);
                alert("검색 중 오류가 발생했습니다. 서버 연결 상태를 확인해주세요.");
                setStockLoading(false);
                return;
            } finally {
                setStockLoading(false);
            }
        }
        
        // [중요] targetSymbol은 이제 무조건 숫자 코드(005930 등)인 상태입니다.
        // 해당 탭에 맞는 트리거 실행
        switch(tab) {
            case "summary": setSummarySymbol(targetSymbol); fetchBasicInfo(targetSymbol); break;
            case "quant": setQuantSymbol(targetSymbol); fetchBasicInfo(targetSymbol); fetchQuant(targetSymbol); break;
            case "financial": setFinSymbol(targetSymbol); fetchBasicInfo(targetSymbol); fetchFinancial(targetSymbol); break;
            case "sector": setSecSymbol(targetSymbol); fetchBasicInfo(targetSymbol); fetchSectorAnalysis(targetSymbol); break;
        }
    };

    const fetchBasicInfo = async (sym: string) => {
        if (!sym) return;
        setStockLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pro/summary/${sym}`);
            const json = await res.json();
            if (json.status === "success") {
                setStockInfo(json.data.stock_info);
            }
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
            // [v2.7.6] Final-Release Forced Cache Invalidation
            url.searchParams.append("v", "2.7.6");
            url.searchParams.append("t", new Date().getTime().toString());
            
            const res = await fetch(url.toString());
            const json = await res.json();
            if (json.status === "success") {
                setSectorData(json.data);
                // [v2.7.6] Global-Sync Fixed: Keep user's selected sector even if server response differs
                const activeId = json.data.compare_sectors?.find((s: any) => s.selected)?.id;
                if (!selectedSectorId && activeId) setSelectedSectorId(activeId);
            } else {
                console.error("[Sector] API Error:", json.message);
                if (json.message === "0") {
                    alert("네이버 금융 구조 변경으로 인해 데이터를 일시적으로 가져올 수 없습니다. 긴급 복구 중입니다.");
                } else {
                    alert(`데이터 수집 오류: ${json.message}`);
                }
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
        <div className="min-h-screen pb-20 text-white bg-black notranslate" translate="no">
            <Header title="프로 분석" subtitle="데이터 기반 종목 정밀 검진" />

            <div className="max-w-5xl mx-auto px-4 space-y-6 pt-4">
                {/* 1. Global Stock Picker (No big button) */}
                <div className="max-w-3xl mx-auto w-full">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-4 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="text" placeholder="종목코드 입력 (예: 005930, 삼성전자)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-5 text-base outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase font-mono transition-all placeholder:text-gray-600 shadow-2xl"
                            value={symbol} onChange={e => setSymbol(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleGlobalSearch(activeTab); }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                             {stockLoading && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
                             <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded">Quick Set</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Select a stock and click 'Analyze' in each tab below</p>
                        <div className="flex items-center gap-2">
                            <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black px-2 py-0.5 rounded border border-indigo-500/20 animate-pulse">
                                Sector Trend v2.6.0 (Unified-Release)
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Stock Header & Mode Toggle */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 w-full">
                        {stockInfo && (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-3xl font-black">{stockInfo.name}</h2>
                                            <span className="text-gray-500 font-mono text-sm tracking-widest">{stockInfo.symbol}</span>
                                            {isTurbo && <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-indigo-500/30">Turbo Active</span>}
                                        </div>
                                        <div className="flex items-baseline gap-3">
                                            <BlinkingPrice 
                                                price={stockInfo.price || "---"} 
                                                className="text-4xl font-black font-mono tracking-tighter" 
                                            />
                                            <div className={`flex items-center gap-1 font-bold ${parseFloat(stockInfo.change_rate) >= 0 ? "text-red-400" : "text-blue-400"}`}>
                                                {parseFloat(stockInfo.change_rate) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                <span className="text-lg">{stockInfo.change?.toLocaleString()}</span>
                                                <span className="text-sm">({parseFloat(stockInfo.change_rate) > 0 ? "+" : ""}{stockInfo.change_rate}%)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                        <div className="bg-black/40 px-4 py-3 rounded-2xl border border-white/5">
                                            <p className="mb-1 opacity-50">시가총액</p>
                                            <p className="text-sm text-gray-300">{stockInfo.market_cap || "N/A"}</p>
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

                    {/* [v1.4.0] Beginner Mode Toggle Button */}
                    <button 
                        onClick={() => setShowEasy(!showEasy)}
                        className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-sm transition-all shadow-xl group border ${
                            showEasy 
                            ? "bg-indigo-600 border-indigo-400 text-white" 
                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                        }`}
                    >
                        <HelpCircle className={`w-5 h-5 ${showEasy ? "animate-bounce" : "group-hover:rotate-12 transition-transform"}`} />
                        <div className="text-left leading-none">
                            <p className="text-[10px] uppercase tracking-widest mb-1 opacity-70">Guide Mode</p>
                            <p className="text-xs">{showEasy ? "초보자 가이드 끄기" : "초보자 가이드 켜기"}</p>
                        </div>
                    </button>
                </div>



                {/* 4. Analysis Tabs */}
                <div className="sticky top-4 z-40 flex justify-center py-2 bg-black/50 backdrop-blur-md rounded-2xl border border-white/5">
                    <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-full max-w-2xl">
                        {[
                            { id: "summary", label: "요약 리포트", icon: Activity },
                            { id: "quant", label: "TurboQuant", icon: Zap },
                            { id: "financial", label: "재무 분석", icon: Shield },
                            { id: "sector", label: "섹터 분석", icon: PieChart },
                            { id: "peer", label: "동종비교", icon: Users }
                        ].map((tab: any) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                            >
                                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 5. Tab Contents */}
                <div className="min-h-[400px] mt-4">
                    {activeTab === "summary" && (
                        <div className="space-y-6">
                            {/* Local Trigger for Summary */}
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg"><Activity className="w-5 h-5 text-indigo-400" /></div>
                                    <h3 className="font-bold">요약 리포트 파트</h3>
                                </div>
                                <button onClick={() => handleGlobalSearch("summary")}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                    리포트 생성
                                </button>
                            </div>

                            {summarySymbol ? (
                                <ProSummaryReport symbol={summarySymbol} />
                            ) : (
                                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                    <Zap className="w-12 h-12 text-indigo-400/30 mx-auto mb-4" />
                                    <p className="text-gray-500 font-bold text-sm">상단에서 종목 선택 후 [리포트 생성]을 눌러주세요.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "quant" && (
                        <div className="space-y-6">
                            {/* Local Trigger for Quant */}
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/20 rounded-lg"><Zap className="w-5 h-5 text-amber-400" /></div>
                                    <h3 className="font-bold">TurboQuant 정밀 분석</h3>
                                </div>
                                <button onClick={() => handleGlobalSearch("quant")}
                                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                    퀀트 로드
                                </button>
                            </div>

                            {quantLoading ? (
                                <div className="text-center py-16">
                                    <RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-3" />
                                    <p className="text-gray-500">지표 분석 중...</p>
                                </div>
                            ) : quantData ? (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {showEasy && (
                                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2">
                                            <div className="bg-indigo-500/20 p-2 rounded-lg h-fit">
                                                <HelpCircle className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-indigo-400 mb-1">TurboQuant 가이드 활성화됨</h4>
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    TurboEngine의 고성능 퀀트 분석 비유를 확인해 보세요. 종목의 종합적인 체질을 확인해 보세요!
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="bg-gradient-to-br from-indigo-900/30 to-black border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl">
                                        <div className="p-6 relative">
                                            {isTurbo && (
                                                <div className="absolute top-0 right-0 p-2">
                                                    <div className="bg-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-bl-xl flex items-center gap-1 animate-pulse">
                                                        <Zap className="w-3 h-3 fill-current" /> TURBO ACTIVE
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGradeStyle(quantData.grade)} flex items-center justify-center text-xl font-black shadow-lg`}>
                                                        {quantData.grade}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold">5축 퀀트 정밀 진단</h3>
                                                        <p className="text-xs text-gray-500">각 팩터별 점수와 세부 지표를 확인하세요</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-3xl font-black ${getScoreColor(quantData.total_score)}`}>{quantData.total_score}</span>
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Total Score</p>
                                                </div>
                                            </div>

                                            <RadarChart factors={quantData.factors} />

                                            <div className="mt-8 pt-6 border-t border-white/10">
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                    {Object.entries(quantData.factors || {}).map(([key, f]: any) => {
                                                        const getFactorMetaphor = (label: string) => {
                                                            if (label === "가치") return { title: "가성비", desc: "가격표 매력" };
                                                            if (label === "성장") return { title: "성장판", desc: "자라나는 속도" };
                                                            if (label === "모멘텀") return { title: "기세", desc: "주가 달리기" };
                                                            if (label === "수익성") return { title: "효율", desc: "돈 버는 기술" };
                                                            if (label === "안정성") return { title: "뼈대", desc: "위기 견디기" };
                                                            return null;
                                                        };
                                                        const metaphor = getFactorMetaphor(f.label);

                                                        return (
                                                            <div key={key} className="flex flex-col items-center text-center group">
                                                                <span className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">{f.label}</span>
                                                                <span className={`text-2xl font-black mb-1 ${getScoreColor(f.score)}`}>
                                                                    {f.score}
                                                                </span>
                                                                {showEasy && metaphor && (
                                                                    <div className="mb-2">
                                                                        <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                                                                            {metaphor.title}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div className="space-y-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                                    {Object.entries(f.metrics || {}).map(([mk, mv]: any) => (
                                                                        <div key={mk} className="text-[9px] text-gray-400 flex items-center justify-center gap-1">
                                                                            <span>{mk}</span>
                                                                            <span className="text-gray-200 font-bold">{mv}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {(symbol.length >= 6) && (
                                            <div className="border-t border-indigo-500/20 bg-indigo-500/5">
                                                <TurboQuantIndicators symbol={symbol} showEasy={showEasy} />
                                            </div>
                                        )}
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

                    {activeTab === "financial" && (
                        <div className="space-y-6">
                            {/* Local Trigger for Financial */}
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg"><Shield className="w-5 h-5 text-emerald-400" /></div>
                                    <h3 className="font-bold">재무 건강도 진단</h3>
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
                                                    어려운 재무 용어들을 알기 쉽게 풀어 설명해 드릴게요. 각 수치가 의미하는 '건강 상태'를 확인해 보세요!
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-gradient-to-br from-emerald-900/30 to-black border border-emerald-500/30 rounded-3xl p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-2xl font-black text-white">안전성 및 재무 건강도 진단</h2>
                                                <p className="text-gray-400 text-sm">종목의 기초 체력과 위기 관리 능력을 정밀 스캔합니다.</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getGradeStyle(financialData.grade)} flex items-center justify-center text-3xl font-black shadow-xl`}>
                                                    {financialData.grade}
                                                </div>
                                            </div>
                                        </div>

                                        {/* [v1.4.0] Stability & Efficiency Charts */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            {/* 안전성 추이 Chart */}
                                            <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <Shield className="w-4 h-4 text-emerald-400" />
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-emerald-300">3개년 안전성 추이 (Debt/Liquid)</h4>
                                                </div>
                                                <div className="h-[200px] w-full">
                                                    {financialData.charts?.stability ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={financialData.charts.stability}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                                <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '11px' }} />
                                                                <Legend iconType="circle" />
                                                                <Line type="monotone" dataKey="부채비율" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                                                                <Line type="monotone" dataKey="유동비율" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    ) : <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest">No Trend Data</div>}
                                                </div>
                                            </div>

                                            {/* 수익 효율 Chart */}
                                            <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                                                <div className="flex items-center gap-2 mb-6">
                                                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">3개년 수익 효율 추이 (ROE/ROA)</h4>
                                                </div>
                                                <div className="h-[200px] w-full">
                                                    {financialData.charts?.profitability ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={financialData.charts.profitability}>
                                                                <defs>
                                                                    <linearGradient id="colorROE" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                                <XAxis dataKey="year" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '11px' }} />
                                                                <Area type="monotone" dataKey="ROE" stroke="#6366f1" fillOpacity={1} fill="url(#colorROE)" strokeWidth={3} />
                                                                <Area type="monotone" dataKey="ROA" stroke="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    ) : <div className="h-full flex items-center justify-center text-gray-600 text-xs font-bold uppercase tracking-widest">No Trend Data</div>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-black/40 rounded-2xl p-4 border border-white/10 group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                                                        📐 Altman Z-Score
                                                        {showEasy && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded animate-pulse">부도 위험 체크</span>}
                                                    </h4>
                                                </div>
                                                {showEasy && (
                                                    <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                        "회사가 갑자기 망하지 않을지 보는 **정밀 건강검진**이에요. **3.0점 이상**이면 비바람이 불어도 끄떡없는 상태랍니다!"
                                                    </p>
                                                )}

                                                <div className="flex items-end gap-3">
                                                    <span className="text-3xl font-black">{financialData.z_score?.value}</span>
                                                    <span className={`text-sm font-bold pb-1 ${financialData.z_score?.color === "green" ? "text-green-400" : financialData.z_score?.color === "yellow" ? "text-yellow-400" : "text-red-400"}`}>
                                                        {financialData.z_score?.zone} ZONE
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
                                                        {showEasy && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded animate-pulse">체력 개선 체크</span>}
                                                    </h4>
                                                </div>
                                                {showEasy && (
                                                    <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                        "작년보다 몸매(재무상태)가 좋아졌는지 채점하는 **9가지 체크리스트**예요. 높을수록 나날이 발전하고 있다는 뜻이에요!"
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
                                                <p className="text-[9px] text-gray-500 mt-1">0-3: 허약 | 4-6: 보통 | 7-9: 탄탄</p>
                                            </div>
                                        </div>
                                    </div>

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

                    {activeTab === "sector" && (
                        <div className="space-y-6">
                            {/* Local Trigger for Sector */}
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg"><PieChart className="w-5 h-5 text-blue-400" /></div>
                                    <h3 className="font-bold">섹터 비교 분석</h3>
                                </div>
                                <button onClick={() => handleGlobalSearch("sector")}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                    섹터 비교
                                </button>
                            </div>

                            {sectorLoading ? (
                                <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-blue-400 mb-3" /><p className="text-gray-500">섹터 비교 데이터 분석 중...</p></div>
                            ) : sectorData ? (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="bg-gradient-to-br from-blue-900/30 to-black border border-blue-500/30 rounded-3xl p-6">
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h2 className="text-2xl font-black text-white">섹터 비교 분석 (Sector Health)</h2>
                                                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">Sector Trend v2.6.0 (Unified-Release)</span>
                                                </div>
                                                <p className="text-gray-400 text-sm">업종 및 시장 지수 대비 현재 위치를 추적합니다. (Synced-Release)</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">비교 업종</span>
                                                    <select 
                                                        value={selectedSectorId || (sectorData.compare_sectors || []).find((s: any) => s.selected)?.id || ""}
                                                        onChange={(e) => {
                                                            const newId = e.target.value;
                                                            setSelectedSectorId(newId);
                                                            fetchSectorAnalysis(secSymbol || symbol, newId);
                                                        }}
                                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                                    >
                                                        {(sectorData.compare_sectors || []).map((s: any) => (
                                                            <option key={s.id} value={s.id} className="bg-gray-900 text-white">
                                                                {s.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chart Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                            {(() => {
                                                if (!(sectorData?.charts)) return null;
                                                
                                                // Category Definitions
                                                const categories = [
                                                    { id: "returns", title: "주가 수익률 분석", items: ["주가수익률", "주가수익률_연간"], icon: TrendingUp, labels: ["최근 수익률", "연간 수익률"] },
                                                    { id: "dividend", title: "배당 수익/성향", items: ["div_yield", "payout_ratio"], icon: Coins, labels: ["배당수익률", "배당성향"] },
                                                    { id: "per", title: "PER 지표 분석", items: ["per", "fwd_per"], icon: BarChart3, labels: ["PER", "Fwd. 12M PER 추이"] },
                                                    { id: "pbr", title: "PBR 지표 분석", items: ["pbr", "fwd_pbr"], icon: BarChart3, labels: ["PBR", "Fwd. 12M PBR 추이"] },
                                                    { id: "roe", title: "효율성 (ROE/ROA)", items: ["roe", "roa"], icon: Activity, labels: ["ROE", "ROA"] },
                                                    { id: "stability", title: "안정성 (부채/유동)", items: ["debt_ratio", "current_ratio"], icon: Shield, labels: ["부채비율", "유동비율"] },
                                                    { id: "growth", title: "성장성 (매출/이익)", items: ["sales_growth", "op_growth", "net_growth"], icon: ArrowUpRight, labels: ["매출액증가율", "영업이익증가율", "순이익증가율"] },
                                                    { id: "margin", title: "이익률 (총/영업/순)", items: ["gross_margin", "op_margin", "net_margin"], icon: PieChart, labels: ["매출총이익률", "영업이익률", "순이익률"] }
                                                ];

                                                return categories.map((cat) => {
                                                    const subMode = sectorSubModes[cat.id] || 1;
                                                    const activeItemName = cat.items[subMode - 1] || cat.items[0];
                                                    const data = sectorData.charts[activeItemName];
                                                    
                                                    return (
                                                        <div key={cat.id} className="bg-black/40 rounded-3xl p-6 border border-white/5 transition-all hover:border-blue-500/20 group">
                                                            <div className="flex flex-col gap-4 mb-5">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                                                            <cat.icon className="w-4 h-4 text-blue-400" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-black text-white leading-none mb-1">{(cat.labels ? cat.labels[subMode - 1] : activeItemName) || "데이터 준비 중"}</h4>
                                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sector Trend v2.7.6 (Final-Release)</p>
                                                                        </div>
                                                                    </div>
                                                                    {/* Indicator Selection - Prominent High-Contrast Buttons */}
                                                                    <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/10 shadow-xl">
                                                                        {cat.items.map((item, idx) => (
                                                                            <button 
                                                                                key={idx}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSectorSubModes(prev => ({ ...prev, [cat.id]: idx + 1 }));
                                                                                }}
                                                                                className={`w-8 h-8 rounded-lg text-[11px] font-black transition-all duration-300 flex items-center justify-center ${
                                                                                    subMode === idx + 1 
                                                                                    ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-105" 
                                                                                    : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                                                                                }`}
                                                                            >
                                                                                {idx + 1}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="h-[260px] w-full">
                                                                {data ? (
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <LineChart 
                                                                            data={data.chart_data} 
                                                                            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                                                                        >
                                                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                                            <XAxis 
                                                                                dataKey="period" 
                                                                                stroke="#64748b" 
                                                                                fontSize={10} 
                                                                                tickLine={false} 
                                                                                axisLine={false}
                                                                                minTickGap={activeItemName.includes("수익률") ? 80 : 40}
                                                                            />
                                                                            <YAxis 
                                                                                stroke="#64748b" 
                                                                                fontSize={10} 
                                                                                tickLine={false} 
                                                                                axisLine={false} 
                                                                                tickFormatter={(val) => {
                                                                                    if (val === 0) return "0";
                                                                                    // High Precision Unit Logic
                                                                                    const isRatio = ['PER', 'PBR', 'PSR', 'EV/EBITDA'].some(k => activeItemName.toUpperCase().includes(k.toUpperCase()));
                                                                                    return `${val}${isRatio ? "x" : "%"}`;
                                                                                }}
                                                                            />
                                                                            <Tooltip 
                                                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '11px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                                                                                itemStyle={{ fontWeight: 'bold' }}
                                                                                formatter={(val: any) => {
                                                                                    const unit = (activeItemName.includes("PER") || activeItemName.includes("PBR")) ? "배" : "%";
                                                                                    return [typeof val === 'number' ? `${val.toFixed(2)}${unit}` : val, ""];
                                                                                }}
                                                                            />
                                                                            <Legend 
                                                                                verticalAlign="top" 
                                                                                align="left" 
                                                                                iconType="circle" 
                                                                                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px', marginLeft: '0px' }}
                                                                            />
                                                                            {Object.keys(data.chart_data[0] || {}).filter(k => k !== 'period').map((key) => {
                                                                                const isTarget = key === "대상 종목";
                                                                                const isIndustry = key === "업종 평균";
                                                                                
                                                                                return (
                                                                                    <Line 
                                                                                        key={key} 
                                                                                        type="monotone" 
                                                                                        dataKey={key} 
                                                                                        name={key}
                                                                                        stroke={isTarget ? "#818cf8" : isIndustry ? "#10b981" : "#475569"} 
                                                                                        strokeWidth={isTarget ? 3.5 : 1.5} 
                                                                                        dot={isTarget ? { r: 3, fill: '#818cf8' } : false} 
                                                                                        activeDot={{ r: 6 }}
                                                                                        animationDuration={1200}
                                                                                    />
                                                                                );
                                                                            })}
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                ) : (
                                                                    <div className="h-full flex flex-col items-center justify-center text-gray-700 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                                                        <Info className="w-8 h-8 mb-3 opacity-20" />
                                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No Data Available for {activeItemName}</p>
                                                                        <p className="text-[9px] text-gray-600 mt-1">다른 지표 버튼(숫자)을 눌러 다른 데이터를 확인해 보세요</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>

                                        {/* [NEW] v1.6.0 Comprehensive Sector Comparison Table */}
                                        <div className="bg-black/40 rounded-3xl p-6 border border-white/5 transition-all hover:border-blue-500/20">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-2">
                                                    <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-emerald-300">섹터별 지표 전체 분석 데이터</h4>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase font-bold tracking-tighter">전 업종 최신 지표</span>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left border-separate border-spacing-0">
                                                    <thead>
                                                        <tr className="text-gray-500 uppercase tracking-widest text-[9px] border-b border-white/10">
                                                            <th className="py-3 px-2 border-b border-white/10">비교 항목 (섹터/지수)</th>
                                                            <th className="py-3 px-2 text-right border-b border-white/10">PER</th>
                                                            <th className="py-3 px-2 text-right border-b border-white/10">PBR</th>
                                                            <th className="py-3 px-2 text-right border-b border-white/10">배당 (%)</th>
                                                            <th className="py-3 px-2 text-right border-b border-white/10">ROE (%)</th>
                                                            <th className="py-3 px-2 text-right border-b border-white/10">부채비율 (%)</th>
                                                            <th className="py-3 px-2 text-right border-b border-white/10">이익률 (%)</th>
                                                            <th className="py-3 px-2 text-right border-b border-white/10">성장률 (%)</th>
                                                            <th className="py-3 px-2 text-right border-b border-white/10">수익률 (%)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {(sectorData?.summary_table || []).map((row: any, i: number) => (
                                                            <tr key={i} className={`hover:bg-white/5 transition-colors ${row.name === "대상 종목" ? "bg-indigo-500/20 border-l-4 border-indigo-500" : ""}`}>
                                                                <td className="py-4 px-2 text-gray-200 font-bold flex items-center gap-2">
                                                                    {row.name === "대상 종목" && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
                                                                    {row.name}
                                                                </td>
                                                                <td className={`text-right py-4 px-2 font-mono ${(row.per || row.PER) && (row.per || row.PER) < 10 ? "text-emerald-400" : "text-gray-400"}`}>
                                                                    {row.per ? row.per.toFixed(2) : (row.PER ? row.PER.toFixed(2) : '-')}
                                                                </td>
                                                                <td className="text-right py-4 px-2 font-mono text-gray-400">
                                                                    {row.pbr ? row.pbr.toFixed(2) : (row.PBR ? row.PBR.toFixed(2) : '-')}
                                                                </td>
                                                                <td className="text-right py-4 px-2 font-mono text-emerald-400">
                                                                    {row.div_yield ? `${row.div_yield.toFixed(2)}%` : (row.배당수익률 ? `${row.배당수익률.toFixed(2)}%` : '-')}
                                                                </td>
                                                                <td className="text-right py-4 px-2 font-mono text-blue-400">
                                                                    {row.roe ? `${row.roe.toFixed(2)}%` : (row.ROE ? `${row.ROE.toFixed(2)}%` : '-')}
                                                                </td>
                                                                <td className="text-right py-4 px-2 font-mono text-gray-400">
                                                                    {row.debt_ratio ? `${row.debt_ratio.toFixed(2)}%` : (row.부채비율 ? `${row.부채비율.toFixed(2)}%` : '-')}
                                                                </td>
                                                                <td className="text-right py-4 px-2 font-mono text-indigo-400">
                                                                    {(() => {
                                                                        const val = row.op_margin ?? row.gross_margin ?? row.net_margin ?? row.영업이익률;
                                                                        return val ? `${val.toFixed(2)}%` : '-';
                                                                    })()}
                                                                </td>
                                                                <td className="text-right py-4 px-2 font-mono text-amber-400">
                                                                    {row.sales_growth ? `${row.sales_growth.toFixed(2)}%` : (row.매출액증가율 ? `${row.매출액증가율.toFixed(2)}%` : '-')}
                                                                </td>
                                                                <td className={`text-right py-4 px-2 font-mono ${row.주가수익률 && row.주가수익률 > 0 ? "text-red-400" : row.주가수익률 < 0 ? "text-blue-400" : "text-gray-400"}`}>
                                                                    {row.주가수익률 ? `${row.주가수익률.toFixed(2)}%` : '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {showEasy && (
                                                <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                                                    <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                    <p className="text-[11px] text-emerald-300 leading-relaxed italic">
                                                        "이미지에 있던 드롭다운 속 모든 업종을 데이터화했습니다. 초록색 수치는 해당 항목에서 건강함(저평가/고수익)을 의미해요. 다른 섹터들과 내 종목을 한눈에 체급 비교해 보세요!"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    <PieChart className="w-12 h-12 text-blue-400/30 mx-auto mb-4" />
                                    <p className="text-gray-500 font-bold">종목코드를 입력하면 업종/섹터 비교 분석을 시작합니다</p>
                                    <p className="text-xs text-gray-600 mt-2 font-medium">대상 종목 vs 업종 평균 vs 시장 지수 (3-Way 데이터 통합)</p>
                                    <div className="mt-4 flex justify-center gap-4">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-bold uppercase"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> 대상 종목</div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-bold uppercase"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> 업종 평균</div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-bold uppercase"><div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div> 시장 지수</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "peer" && (
                        <div className="space-y-6">
                             {/* Local Trigger for Peer */}
                             <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-lg"><Users className="w-5 h-5 text-purple-400" /></div>
                                    <h3 className="font-bold">동종 업계 비교</h3>
                                </div>
                                <button onClick={fetchPeer}
                                    className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
                                    피어 분석
                                </button>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
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
                                                                <span className={`text-xs font-bold w-12 text-right ${val >= 0 ? "text-red-400" : "text-blue-400"}`}>{val}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl p-6 mt-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-orange-500/20 rounded-lg">
                                                <BarChart3 className="w-5 h-5 text-orange-400" />
                                            </div>
                                            <h3 className="font-bold text-lg">그룹 종합 검진 리뷰</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                                {avgRoe > 15 ? "수익성 또한 우수하여 효율적으로 돈을 벌고 있는 상태로 분석됩니다." : "수익성은 보통 수준이며, 업계 평균 수준과 비교해 볼 필요가 있습니다."}
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
                </div>

                <p className="text-center text-[10px] text-gray-600 mt-6">
                    * 본 정보는 투자 참고용 데이터이며, 특정 종목의 매수·매도를 권유하지 않습니다.<br />
                    퀀트 점수는 과거 데이터 기반이며, 미래 수익을 보장하지 않습니다.
                </p>
            </div>
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
                <RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-4" />
                <p className="text-gray-400 font-bold">데이터를 렌더링하고 있습니다...</p>
            </div>
        }>
            <AnalysisContent />
        </Suspense>
    );
}
