"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import {
    Search, RefreshCw, Shield, BarChart3, Users, TrendingUp, TrendingDown,
    Activity, Zap, AlertTriangle, ChevronRight, X, Info, HelpCircle,
    Eye, EyeOff
} from "lucide-react";


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
        const labels = ["媛移?, "?깆옣", "紐⑤찘?", "?섏씡??, "?덉젙??];
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
            <Header title="?꾨줈 遺꾩꽍" subtitle="???쨌 ?щТ 遺꾩꽍 쨌 ?숈쥌鍮꾧탳" />

            <div className="max-w-5xl mx-auto p-4 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
                    <button onClick={() => setActiveTab("quant")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "quant" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg" : "text-gray-400"}`}>
                        <Activity className="w-4 h-4" /> ????ㅼ퐫??                    </button>
                    <button onClick={() => setActiveTab("financial")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "financial" ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg" : "text-gray-400"}`}>
                        <Shield className="w-4 h-4" /> ?щТ 遺꾩꽍
                    </button>
                    <button onClick={() => setActiveTab("peer")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "peer" ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg" : "text-gray-400"}`}>
                        <Users className="w-4 h-4" /> ?숈쥌鍮꾧탳
                    </button>
                </div>

                {/* Search (Quant & Financial) */}
                {(activeTab === "quant" || activeTab === "financial") && (
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                            <input type="text" placeholder="醫낅ぉ肄붾뱶 ?낅젰 (?? 005930, AAPL)"
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
                                value={symbol} onChange={e => setSymbol(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                            />
                        </div>
                        <button onClick={handleSearch}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm">
                            遺꾩꽍
                        </button>
                    </div>
                )}

                {/* ===== QUANT TAB ===== */}
                {activeTab === "quant" && (
                    <div className="space-y-6">
                        {quantLoading ? (
                            <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400 mb-3" /><p className="text-gray-500">???遺꾩꽍 以?..</p></div>
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
                                                <p className="text-xs text-gray-500">醫낇빀 ?먯닔</p>
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
                                <p className="text-gray-500">醫낅ぉ肄붾뱶瑜??낅젰?섎㈃ 5異????遺꾩꽍???쒖옉?⑸땲??/p>
                                <p className="text-xs text-gray-600 mt-2">媛移?쨌 ?깆옣 쨌 紐⑤찘? 쨌 ?섏씡??쨌 ?덉젙??/p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== FINANCIAL TAB ===== */}
                {activeTab === "financial" && (
                    <div className="space-y-6">
                        {/* Toggle Easy Mode */}
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setShowEasy(!showEasy)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showEasy ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}
                            >
                                {showEasy ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                珥덈낫?먮? ?꾪븳 ?ъ슫 ?ㅻ챸 {showEasy ? "?꾧린" : "耳쒓린"}
                            </button>
                        </div>

                        {financialLoading ? (
                            <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-emerald-400 mb-3" /><p className="text-gray-500">?щТ ?곗씠??遺꾩꽍 以?..</p></div>
                        ) : financialData ? (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                {showEasy && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex gap-3 animate-in slide-in-from-top-2">
                                        <div className="bg-emerald-500/20 p-2 rounded-lg h-fit">
                                            <HelpCircle className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-400 mb-1">珥덈낫??媛?대뱶 紐⑤뱶 ?쒖꽦?붾맖</h4>
                                            <p className="text-xs text-gray-300 leading-relaxed">
                                                ?대젮???щТ ?⑹뼱?ㅼ쓣 ?뚭린 ?쎄쾶 ????ㅻ챸???쒕┫寃뚯슂. 媛??섏튂媛 ?섎??섎뒗 '嫄닿컯 ?곹깭'瑜??뺤씤??蹂댁꽭??
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Analysis Overview */}
                                <div className="bg-gradient-to-br from-emerald-900/30 to-black border border-emerald-500/30 rounded-3xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black">{financialData.name}</h2>
                                            <p className="text-gray-400 text-sm">{financialData.symbol} 쨌 ?щТ 遺꾩꽍 由ы룷??/p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getGradeStyle(financialData.grade)} flex items-center justify-center text-3xl font-black shadow-xl`}>
                                                {financialData.grade}
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-4xl font-black ${getScoreColor(financialData.health_score)}`}>{financialData.health_score}</span>
                                                <p className="text-xs text-gray-500">遺꾪빀 遺꾩꽍 ?먯닔</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Z-Score & F-Score */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-black/40 rounded-2xl p-4 border border-white/10 group">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                                                    ?뱪 Altman Z-Score
                                                    {showEasy && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">遺???꾪뿕??/span>}
                                                </h4>
                                            </div>
                                            {showEasy && (
                                                <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                    ?뚯궗??<span className="text-emerald-400 font-bold">'?ы룓吏??</span>?덉슂. ?뱀옣 ?곕윭吏??꾪뿕(遺???꾪뿕)???덈뒗吏 泥댄겕?댁슂. <span className="text-emerald-400 font-bold">3.0 ?댁긽?대㈃ '媛뺤쿋 ?ъ옣'</span>??媛吏??꾩＜ ?쇳듉???곹깭?덉슂!
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
                                                <span>?꾪뿕 (&lt;1.8)</span>
                                                <span>二쇱쓽</span>
                                                <span>?덉쟾 (&gt;3.0)</span>
                                            </div>
                                        </div>

                                        <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                                                    ?룍截?Piotroski F-Score
                                                    {showEasy && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">醫낇빀 湲곗큹泥대젰</span>}
                                                </h4>
                                            </div>
                                            {showEasy && (
                                                <p className="text-[11px] text-gray-400 mb-2 leading-relaxed italic">
                                                    ?뚯궗??<span className="text-emerald-400 font-bold">'洹쇱쑁?됯낵 ?좎쭊???</span>?덉슂. 洹쇱쑁(?섏씡)? ?섍퀬 泥댁?諛?鍮?? 以꾩뿀?붿? 9媛吏瑜?源먭퉸?섍쾶 寃吏꾪븳 醫낇빀 湲곗큹泥대젰 ?먯닔?덉슂.
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
                                            <p className="text-[9px] text-gray-500 mt-1">0-3: ?쏀븿 | 4-6: 蹂댄넻 | 7-9: 媛뺥븿</p>
                                        </div>
                                    </div>
                                </div>

                                {/* F-Score Details */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <h4 className="font-bold text-sm text-gray-300 mb-3">F-Score ?몃? ??ぉ</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        {(financialData.f_score?.details || []).map((d: string, i: number) => (
                                            <div key={i} className="text-xs py-2 px-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-2">
                                                <span className="text-emerald-500">??/span>
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Key Ratios */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <h4 className="font-bold text-sm text-gray-300 mb-3">?듭떖 ?щТ 鍮꾩쑉</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {Object.entries(financialData.ratios || {}).map(([k, v]: any) => {
                                            const getExplanation = (key: string) => {
                                                if (key === "PER") return "??踰꾨뒗 ?λ젰 ?鍮?'?꾩옱 媛寃⑺몴'";
                                                if (key === "PBR") return "媛吏??ъ궛 ?鍮?'?꾩옱 媛寃⑺몴'";
                                                if (key === "ROE") return "?ъ옄湲??鍮?'洹쇱꽦' (?뚯궗??媛?깅퉬)";
                                                if (key === "遺梨꾨퉬??) return "紐몃Т寃??鍮?'泥댁?諛? (鍮뚮┛ ??";
                                                if (key === "?좊룞鍮꾩쑉") return "吏媛???'鍮꾩긽湲? (?꾧툑 ?ъ쑀)";
                                                if (key === "?곸뾽?댁씡瑜?) return "?⑤쭔 ?ъ뼱???섍?????鍮쇨퀬 ?⑤뒗 鍮꾩쨷";
                                                if (key === "留ㅼ텧珥앹씠?듬쪧") return "臾쇨굔 ?붿븘???④릿 ?쒖닔 留덉쭊";
                                                if (key === "?먯궛?뚯쟾??) return "?ъ궛???쇰쭏??遺吏?고엳 援대━??;
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
                                <p className="text-gray-500">醫낅ぉ肄붾뱶瑜??낅젰?섎㈃ ?щТ 遺꾩꽍???쒖옉?⑸땲??/p>
                                <p className="text-xs text-gray-600 mt-2">Altman Z-Score 쨌 Piotroski F-Score 쨌 ?듭떖 鍮꾩쑉</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== PEER TAB ===== */}
                {activeTab === "peer" && (
                    <div className="space-y-6">
                        <div className="flex gap-2">
                            <input type="text" placeholder="醫낅ぉ肄붾뱶 ?쇳몴濡?援щ텇 (?? 005930,000660,035420)"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500 uppercase font-mono"
                                value={peerSymbols} onChange={e => setPeerSymbols(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") fetchPeer(); }}
                            />
                            <button onClick={fetchPeer} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-sm">
                                鍮꾧탳 遺꾩꽍
                            </button>
                        </div>

                        {peerLoading ? (
                            <div className="text-center py-16"><RefreshCw className="w-10 h-10 animate-spin mx-auto text-orange-400 mb-3" /><p className="text-gray-500">?숈쥌?낃퀎 鍮꾧탳 遺꾩꽍 以?..</p></div>
                        ) : peerData?.data && peerData.data.length > 0 ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                {/* Comparison Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left py-3 px-2 text-gray-500 text-xs font-bold">吏??/th>
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
                                                { key: "market_cap_display", label: "?쒓?珥앹븸" },
                                                { key: "per", label: "PER (諛?" },
                                                { key: "pbr", label: "PBR (諛?" },
                                                { key: "roe", label: "ROE (%)" },
                                                { key: "operating_margin", label: "?곸뾽?댁씡瑜?(%)" },
                                                { key: "revenue_growth", label: "留ㅼ텧?깆옣瑜?(%)" },
                                                { key: "dividend_yield", label: "諛곕떦?섏씡瑜?(%)" },
                                                { key: "debt_to_equity", label: "遺梨꾨퉬??(%)" },
                                                { key: "beta", label: "踰좏?" },
                                                { key: "change_3m", label: "3媛쒖썡 ?섏씡瑜?(%)" },
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
                                                                    {isBest && <span className="ml-1 text-[8px]">?몣</span>}
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
                                <p className="text-gray-500">醫낅ぉ肄붾뱶瑜??낅젰?섎㈃ ?섎???鍮꾧탳 遺꾩꽍?⑸땲??/p>
                                <p className="text-xs text-gray-600 mt-2">理쒕? 5媛?醫낅ぉ 쨌 PER/PBR/ROE/?깆옣瑜???/p>
                            </div>
                        )}
                    </div>
                )}

                <p className="text-center text-[10px] text-gray-600 mt-6">
                    * 蹂??뺣낫???ъ옄 李멸퀬???곗씠?곗씠硫? ?뱀젙 醫낅ぉ??留ㅼ닔쨌留ㅻ룄瑜?沅뚯쑀?섏? ?딆뒿?덈떎.<br />
                    ????먯닔??怨쇨굅 ?곗씠??湲곕컲?대ŉ, 誘몃옒 ?섏씡??蹂댁옣?섏? ?딆뒿?덈떎.
                </p>
            </div>
        </div>
    );
}
