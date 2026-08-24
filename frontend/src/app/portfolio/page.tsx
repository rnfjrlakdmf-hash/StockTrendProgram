"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { Star, Plus, Zap, Loader2, Calendar, Activity, X, AlertTriangle, TrendingUp, TrendingDown, Info, ShieldCheck, Coins, BarChart3 } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import AdRewardModal from "@/components/AdRewardModal";
import { checkReward } from "@/lib/reward";
import { isFreeModeEnabled } from "@/lib/adminMode";
import { useAuth } from "@/context/AuthContext";

const safeNum = (v: any): number => {
  const n = parseFloat(String(v ?? "0").replace(/,/g, ""));
  return isFinite(n) ? n : 0;
};

// 점수에 따른 등급
function getGrade(score: number) {
  if (score >= 80) return { label: "매우 우수 (안정 성장) 💎", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
  if (score >= 65) return { label: "균형 우수 (적정 분산) ✅", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" };
  if (score >= 50) return { label: "보통 (일부 편중) 😐", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
  return { label: "집중 위험 (리밸런싱 권장) ⚠️", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" };
}

// 팩터 설명 (전문 용어 + 쉬운 설명 결합)
const FACTOR_INFO: Record<string, { label: string; term: string; desc: string; icon: string }> = {
  베타:    { label: "시장 민감도", term: "Beta (시장 연동 계수)", desc: "KOSPI/S&P500 등 시장 지수 변동에 대한 민감도. 1.0 초과 시 시장보다 큰 변동성을 보입니다.", icon: "📡" },
  알파:    { label: "초과 수익력", term: "Alpha (고유 초과 수익)", desc: "시장 지수 수익률을 넘어서는 종목 고유의 초과 성과 창출 역량 (Jensen's Alpha).", icon: "🏆" },
  모멘텀:  { label: "추세 탄력도", term: "Momentum (가격 가속도)", desc: "최근 1~6개월간 주가 상승 추세의 속도와 강도. 높을수록 상승 탄력이 강하게 유지됩니다.", icon: "🚀" },
  밸류:    { label: "저평가 매력", term: "Valuation (기업 내재가치)", desc: "PER, PBR, BPS 기준 기업 실적 및 자산 대비 저평가 정도. 높을수록 안전마진이 큽니다.", icon: "🏷️" },
  변동성:  { label: "가격 안정성", term: "Volatility (안정성 역수)", desc: "과거 일간 수익률 등락의 표준편차. 점수가 높을수록 가격 변동이 완만하여 안정적입니다.", icon: "🛡️" },
  배당:    { label: "현금 창출력", term: "Dividend (배당 수익률)", desc: "보유 자산 대비 배당금 지급 비율. 하락장 방어와 지속적인 현금 흐름을 제공합니다.", icon: "💰" },
};

function FactorBar({ name, value }: { name: string; value: number }) {
  const info = FACTOR_INFO[name] || { label: name, term: name, desc: "", icon: "📊" };
  const color = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-blue-500" : "bg-rose-400";
  return (
    <div className="bg-zinc-950/60 border border-white/5 hover:border-white/15 p-4 rounded-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{info.icon}</span>
          <div>
            <span className="text-xs font-bold text-white block">{info.label}</span>
            <span className="text-[10px] text-gray-500 font-mono">{info.term}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-black font-mono text-white">{Math.round(value)}</span>
          <span className="text-xs text-gray-500 font-mono"> / 100</span>
        </div>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{info.desc}</p>
    </div>
  );
}

function StatCard({ icon, label, value, desc, color }: any) {
  return (
    <div className={`rounded-3xl p-5 border ${color} flex flex-col justify-between shadow-lg backdrop-blur-md min-h-[140px]`}>
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-xl md:text-2xl font-black font-mono text-white tracking-tight">{value}</div>
      </div>
      <div className="text-[10px] text-gray-500 font-medium leading-relaxed mt-2 pt-2 border-t border-white/5">{desc}</div>
    </div>
  );
}

const getDayOfWeek = (dateStr: string) => {
  try {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const d = new Date(dateStr);
    return days[d.getDay()];
  } catch { return ""; }
};

export default function PortfolioPage() {
  const [inputSymbol, setInputSymbol] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [holdings, setHoldings] = useState<{ symbol: string; name?: string; price: string; quantity: string; currency?: string }[]>([]);
  const [inputPrice, setInputPrice] = useState("");
  const [inputQuantity, setInputQuantity] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [currentPrices, setCurrentPrices] = useState<Record<string, { price: number; change: string; up: boolean }>>({});
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [usdKrw, setUsdKrw] = useState(1350);
  const { user, isLoading: authLoading, isMigrating } = useAuth();

  // 항상 최신 userId를 반환
  const getUserId = useCallback(() => {
    if (user?.id) return user.id;
    try {
      const stored = localStorage.getItem("stock_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) return parsed.id;
      }
    } catch {}
    return null;
  }, [user]);

  const isLoggedIn = !!getUserId();

  useEffect(() => {
    const userId = getUserId();
    if (!userId || isMigrating) return;
    fetch(`${API_BASE_URL}/api/portfolio`, { headers: { "X-User-ID": userId } })
      .then(r => r.json())
      .then(json => {
        if (json.status === "success" && Array.isArray(json.data)) {
          setHoldings(json.data);
          refreshPrices(json.data);
        }
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isMigrating]);

  const refreshPrices = useCallback(async (targets?: any[]) => {
    const list = targets || holdings;
    if (list.length === 0) return;
    const syms = list.map(h => h.symbol).join(",");
    try {
      const res = await fetch(`${API_BASE_URL}/api/market/stock/quotes/multi?symbols=${encodeURIComponent(syms)}`);
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setCurrentPrices(json.data);
        if (json.usd_krw) setUsdKrw(json.usd_krw);
      }
    } catch (e) { console.error(e); }
  }, [holdings, API_BASE_URL]);

  useEffect(() => {
    const timer = setInterval(() => refreshPrices(), 30000);
    return () => clearInterval(timer);
  }, [refreshPrices]);

  const syncFromWatchlist = async () => {
    const userId = getUserId();
    if (!userId) {
      alert("로그인 후 관심종목을 동기화할 수 있습니다.");
      return;
    }
    setSyncLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
        headers: { "X-User-ID": userId },
      });
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
        const newHoldings = await Promise.all(
          json.data.map(async (s: any) => {
            let price = s.added_price && s.added_price > 0 ? String(s.added_price) : "0";
            let quantity = s.quantity && s.quantity > 0 ? String(s.quantity) : "1";
            let currency = "KRW";
            try {
              const qr = await fetch(`${API_BASE_URL}/api/market/quote/${encodeURIComponent(s.symbol)}`);
              const qj = await qr.json();
              if (qj.status === "success" && qj.data) {
                if (price === "0") price = String(safeNum(qj.data.price));
                currency = qj.data.currency || "KRW";
              }
            } catch {}
            return { symbol: s.symbol, name: s.name, price, quantity, currency };
          })
        );
        setHoldings(newHoldings);
        for (const h of newHoldings) {
          try {
            await fetch(`${API_BASE_URL}/api/portfolio`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-User-ID": userId },
              body: JSON.stringify(h),
            });
          } catch {}
        }
        alert(`관심종목 ${newHoldings.length}개를 성공적으로 불러왔습니다!`);
      } else {
        alert("불러올 관심종목이 없습니다.\n관심종목 메뉴에서 먼저 종목을 추가해 주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("관심종목 불러오기 실패. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSyncLoading(false);
    }
  };

  const fetchPriceForSymbol = async (sym: string) => {
    if (!sym.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/market/quote/${encodeURIComponent(sym.trim())}`);
      const json = await res.json();
      if (json.status === "success" && json.data?.price) {
        const p = safeNum(json.data.price);
        if (p > 0) {
          setInputPrice(p.toString());
          setCurrentPrices(prev => ({
            ...prev,
            [sym.toUpperCase().trim()]: { price: p, change: json.data.change || "0%", up: json.data.up ?? true }
          }));
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (inputSymbol.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/market/stock/search?q=${encodeURIComponent(inputSymbol)}`);
        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.data)) {
          setSuggestions(json.data.slice(0, 5));
        }
      } catch (e) { console.error(e); }
      finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputSymbol]);

  const selectSuggestion = (s: any) => {
    setInputSymbol(s.symbol);
    setSelectedName(s.name);
    setSuggestions([]);
    fetchPriceForSymbol(s.symbol);
  };

  const addHolding = async () => {
    if (!inputSymbol || !inputPrice || !inputQuantity) { alert("종목, 단가, 수량을 모두 입력해주세요."); return; }
    const sym = inputSymbol.toUpperCase().trim();
    const foundName = selectedName || suggestions.find(s => s.symbol === sym)?.name || sym;
    const isUS = sym.match(/[A-Z]/) && !sym.includes(".");
    const currency = isUS ? "USD" : "KRW";
    const newH = { symbol: sym, name: foundName, price: inputPrice, quantity: inputQuantity, currency };
    const updated = [...holdings, newH];
    setHoldings(updated);
    refreshPrices(updated);
    const userId = getUserId();
    if (userId) {
      try { await fetch(`${API_BASE_URL}/api/portfolio`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-ID": userId }, body: JSON.stringify(newH) }); }
      catch (e) { console.error(e); }
    }
    setInputSymbol(""); setSelectedName(""); setInputPrice(""); setInputQuantity("");
    setSuggestions([]);
  };

  const updateQuantity = (symbol: string, newQty: string) => {
    const updated = holdings.map(h => h.symbol === symbol ? { ...h, quantity: newQty } : h);
    setHoldings(updated);
  };

  const removeHolding = async (sym: string) => {
    setHoldings(prev => prev.filter(h => h.symbol !== sym));
    const userId = getUserId();
    if (userId) { try { await fetch(`${API_BASE_URL}/api/portfolio/${sym}`, { method: "DELETE", headers: { "X-User-ID": userId } }); } catch (e) { console.error(e); } }
  };

  const runOptimization = async (overrideHoldings?: any[]) => {
    const tH = overrideHoldings || holdings;
    const syms = tH.map(h => h.symbol).filter(Boolean);
    if (syms.length < 1) { setError("최소 1개 이상의 종목이 필요합니다."); return; }
    if (!checkReward() && !hasPaid && !isFreeModeEnabled()) { setShowAdModal(true); return; }
    setLoading(true); setError(""); setResult(null); setAnalysisResult(null);
    try {
      if (syms.length >= 2) {
        try {
          const r = await fetch(`${API_BASE_URL}/api/analysis/portfolio/optimize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbols: syms }) });
          const j = await r.json();
          if (j.status === "success" && j.data) setResult(j.data);
        } catch (e) { console.warn(e); }
      }
      const rd = await fetch(`${API_BASE_URL}/api/analysis/portfolio/diagnosis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portfolio: syms }) });
      if (!rd.ok) throw new Error(`Server error: ${rd.status}`);
      const jd = await rd.json();
      if (jd.status === "success" && jd.data) setAnalysisResult(jd.data);
      else setError(jd.message || "분석 데이터를 가져오지 못했습니다.");
    } catch (err: any) {
      setError(`분석 중 오류: ${err?.message || "서버 연결 실패"}`);
    } finally { setLoading(false); }
  };

  const handleAdReward = () => { setHasPaid(true); setShowAdModal(false); setTimeout(() => runOptimization(), 100); };

  const totalInvested = holdings.reduce((acc, h) => {
    const price = safeNum(h.price);
    const qty = safeNum(h.quantity);
    const isUSD = h.currency === "USD" || (h.symbol.match(/[A-Z]/) && !h.symbol.includes("."));
    const value = isUSD ? price * qty * usdKrw : price * qty;
    return acc + value;
  }, 0);

  const score = safeNum(analysisResult?.score) || 0;
  const grade = getGrade(score);

  const radarData = analysisResult?.factors ? [
    { subject: "베타", A: safeNum(analysisResult.factors.beta) },
    { subject: "알파", A: safeNum(analysisResult.factors.alpha) },
    { subject: "모멘텀", A: safeNum(analysisResult.factors.momentum) },
    { subject: "밸류", A: safeNum(analysisResult.factors.value) },
    { subject: "변동성", A: safeNum(analysisResult.factors.volatility) },
    { subject: "배당", A: safeNum(analysisResult.factors.yield) },
  ] : [];

  const calendarItems = Array.isArray(analysisResult?.calendar) ? analysisResult.calendar : [];
  const expReturn = safeNum(result?.metrics?.expected_return);
  const volatility = safeNum(result?.metrics?.volatility);

  // Total annual dividend estimation
  const totalAnnualDividend = calendarItems.reduce((acc: number, item: any) => {
    const amt = safeNum(item.amount);
    const found = holdings.find(h => h.symbol === item.symbol);
    const qty = found ? safeNum(found.quantity) : 1;
    const isUSD = item.currency === "USD" || (item.symbol?.match(/[A-Z]/) && !item.symbol?.includes("."));
    return acc + (isUSD ? amt * qty * usdKrw : amt * qty);
  }, 0);

  const dividendYieldPct = totalInvested > 0 ? (totalAnnualDividend / totalInvested * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-gray-200">
      <div className="bg-amber-950/40 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-300">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span><strong>투자 유의 안내:</strong> 본 포트폴리오 진단은 과거 통계 모델 기반의 참고용 지표이며, 특정 금융투자상품의 매매를 권유하거나 수익을 보장하지 않습니다.</span>
      </div>

      <div className="shrink-0">
        <Header title="포트폴리오 정밀 퀀트 진단" subtitle="보유 종목의 분산도, 리스크, 팩터 지표 및 현금흐름을 종합 분석합니다" />
      </div>

      <AdRewardModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} onReward={handleAdReward} featureName="Portfolio Optimizer" />

      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          {authLoading || isMigrating ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
              <p className="text-sm font-semibold">{isMigrating ? "관심종목을 동기화하고 있습니다..." : "사용자 정보를 확인하고 있습니다..."}</p>
            </div>
          ) : (
            <>
              {/* 보유 종목 입력 패널 */}
              <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">포트폴리오 보유 종목 관리</h2>
                      <p className="text-xs text-gray-400">보유 중인 종목과 매수 단가, 수량을 입력해 정밀 리스크를 진단하세요.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowManualInput(!showManualInput)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all border shadow-sm ${
                        showManualInput 
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                          : "bg-zinc-800 hover:bg-zinc-700 text-gray-200 border-white/10"
                      }`}
                    >
                      <Plus className={`w-4 h-4 transition-transform ${showManualInput ? "rotate-45" : ""}`} /> 직접 추가
                    </button>
                    <button
                      onClick={syncFromWatchlist}
                      disabled={syncLoading}
                      title={!isLoggedIn ? "로그인 후 이용 가능합니다" : ""}
                      className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl transition-all border shadow-sm ${
                        isLoggedIn
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : "bg-zinc-800/50 text-gray-500 border-white/5 cursor-not-allowed"
                      }`}
                    >
                      {syncLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5 text-amber-400" />}
                      {syncLoading ? "불러오는 중..." : "관심종목 불러오기"}
                    </button>
                  </div>
                </div>

                {/* 보유 종목 카드 리스트 */}
                {holdings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                    {holdings.map(h => {
                      const current = currentPrices[h.symbol];
                      const buyPrice = safeNum(h.price);
                      const currPrice = current ? safeNum(current.price) : buyPrice;
                      const profit = (currPrice - buyPrice) * safeNum(h.quantity);
                      const profitRate = buyPrice > 0 ? ((currPrice - buyPrice) / buyPrice * 100) : 0;
                      const isUp = profit > 0;
                      const isDown = profit < 0;

                      return (
                        <div key={h.symbol} className="group relative bg-zinc-950/80 border border-white/10 hover:border-blue-500/40 p-4 rounded-2xl transition-all shadow-md flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-white truncate">{h.name || h.symbol}</span>
                              <span className="text-[10px] font-mono text-gray-500 tracking-wider">{h.symbol}</span>
                            </div>
                            <button 
                              onClick={() => removeHolding(h.symbol)} 
                              className="text-gray-500 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5 transition-all opacity-70 group-hover:opacity-100"
                              title="삭제"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">매수단가</span>
                              <span className="font-mono font-bold text-gray-200">{buyPrice.toLocaleString()}{h.currency === "USD" ? "$" : "원"}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">보유수량</span>
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number" 
                                  min="0"
                                  step="any"
                                  value={h.quantity} 
                                  onChange={(e) => updateQuantity(h.symbol, e.target.value)}
                                  className="bg-zinc-900 border border-white/15 rounded-lg w-16 px-2 py-0.5 text-white outline-none focus:border-blue-500 text-center font-mono font-bold text-xs"
                                />
                                <span className="text-gray-400 font-mono text-[11px]">주</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                              <div>
                                <div className="text-[9px] text-gray-500 font-mono">현재가</div>
                                <div className="text-xs font-black font-mono text-white">
                                  {currPrice > 0 ? `${currPrice.toLocaleString()}${h.currency === "USD" ? "$" : "원"}` : "조회중..."}
                                </div>
                              </div>
                              <div className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono border ${
                                isUp ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : isDown ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : "bg-white/5 text-gray-400 border-white/10"
                              }`}>
                                {isUp ? "▲ +" : isDown ? "▼ " : ""}{profitRate.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center bg-zinc-950/40 rounded-2xl border border-dashed border-white/10 mb-6">
                    <p className="text-sm font-bold text-gray-400 mb-1">등록된 보유 종목이 없습니다</p>
                    <p className="text-xs text-gray-500">우측 상단의 <strong>[직접 추가]</strong> 또는 <strong>[관심종목 불러오기]</strong>를 눌러 종목을 등록하세요.</p>
                  </div>
                )}

                {/* 직접 입력 폼 */}
                {showManualInput && (
                  <div className="flex flex-wrap items-end gap-3 p-5 bg-zinc-950 rounded-2xl border border-white/10 mb-5 shadow-inner">
                    <div className="flex flex-col gap-1.5 relative flex-1 min-w-[180px]">
                      <label className="text-xs font-bold text-gray-400">종목명 또는 티커</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="예: 삼성전자, TSLA, 005930"
                          className="w-full bg-zinc-900 border border-white/15 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-bold text-sm text-white shadow-inner"
                          value={inputSymbol} 
                          onChange={e => setInputSymbol(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addHolding()}
                          onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                        />
                        {isSearching && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-gray-500" />}
                      </div>
                      
                      {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl divide-y divide-white/5">
                          {suggestions.map((s, i) => (
                            <button key={i} onClick={() => selectSuggestion(s)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors text-left">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{s.name}</span>
                                <span className="text-[10px] text-gray-500 font-mono">{s.symbol}</span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{s.market}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                      <label className="text-xs font-bold text-gray-400">매수 단가 (원/$)</label>
                      <input 
                        type="number" 
                        placeholder="단가 입력"
                        className="bg-zinc-900 border border-white/15 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-mono font-bold text-sm text-white shadow-inner"
                        value={inputPrice} 
                        onChange={e => setInputPrice(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addHolding()} 
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[110px]">
                      <label className="text-xs font-bold text-gray-400">보유 수량 (주)</label>
                      <input 
                        type="number" 
                        placeholder="수량"
                        className="bg-zinc-900 border border-white/15 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 font-mono font-bold text-sm text-white shadow-inner"
                        value={inputQuantity} 
                        onChange={e => setInputQuantity(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addHolding()} 
                      />
                    </div>

                    <button 
                      onClick={addHolding} 
                      className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> 종목 추가
                    </button>
                  </div>
                )}

                {/* 진단 실행 바 */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                    <span>등록된 자산: <strong className="text-white font-mono">{holdings.length}개</strong></span>
                    <span>·</span>
                    <span>총 매입액: <strong className="text-amber-400 font-mono">{totalInvested.toLocaleString()}원</strong></span>
                  </div>
                  <button 
                    onClick={() => runOptimization()} 
                    disabled={loading || holdings.length < 1}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-8 py-3.5 rounded-2xl font-black text-sm text-white shadow-xl shadow-blue-500/20 flex justify-center items-center gap-2 disabled:opacity-40 transition-all active:scale-95"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5 text-amber-300" /> 포트폴리오 퀀트 진단하기</>}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl px-5 py-4 text-sm text-rose-300 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" /> {error}
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center gap-4 py-20 bg-zinc-900/40 rounded-3xl border border-white/10">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                  <div className="text-center">
                    <p className="text-white font-bold text-base mb-1">포트폴리오 정밀 퀀트 모델 연산 중...</p>
                    <p className="text-gray-500 text-xs">자산 상관계수, 팩터 민감도, 배당 스케줄 및 스트레스 테스트를 계산하고 있습니다.</p>
                  </div>
                </div>
              )}

              {/* 분석 결과 대시보드 */}
              {!loading && (result || analysisResult) && (
                <div className="flex flex-col gap-8">

                  {/* 1. 상단 5대 핵심 지표 카드 (완벽 대칭 5-Column Grid) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* 건강 점수 */}
                    <div className={`col-span-2 sm:col-span-1 rounded-3xl p-5 border flex flex-col justify-between shadow-xl backdrop-blur-md ${grade.bg}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold">건강 균형 지수</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="my-2">
                        <div className={`text-4xl md:text-5xl font-black font-mono tracking-tight ${grade.color}`}>{score}<span className="text-xs text-gray-400 font-normal"> / 100</span></div>
                        <div className={`text-xs font-bold px-2.5 py-1 rounded-lg mt-2 inline-block border ${grade.bg} ${grade.color}`}>{grade.label}</div>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">통계 퀀트 모델 기반 종합 점수</p>
                    </div>

                    {/* 총 투자금액 */}
                    <StatCard
                      icon={<Coins className="w-4 h-4 text-amber-400" />}
                      label="총 자산 평가액"
                      value={`${totalInvested.toLocaleString()}원`}
                      desc={`미국 주식은 실시간 환율(약 ₩${usdKrw.toLocaleString()})로 합산`}
                      color="bg-zinc-900/90 border-white/10"
                    />

                    {/* 기대 수익 */}
                    <StatCard
                      icon={expReturn >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
                      label="연간 기대 수익률"
                      value={result?.metrics ? `${expReturn > 0 ? "+" : ""}${expReturn}%` : "—"}
                      desc={result?.metrics ? "과거 주가 통계 기반 기하평균 산출치" : "종목 2개 이상 입력 시 통계 계산"}
                      color={result?.metrics ? (expReturn >= 0 ? "bg-emerald-950/20 border-emerald-500/20" : "bg-rose-950/20 border-rose-500/20") : "bg-zinc-900/90 border-white/10"}
                    />

                    {/* 변동성 */}
                    <StatCard
                      icon={<Activity className="w-4 h-4 text-purple-400" />}
                      label="포트폴리오 변동성"
                      value={result?.metrics ? `${volatility}%` : "—"}
                      desc={result?.metrics ? `연간 수익률 표준편차: ${volatility}%` : "종목 2개 이상 입력 시 통계 계산"}
                      color="bg-zinc-900/90 border-white/10"
                    />

                    {/* 평균 최대낙폭(MDD) */}
                    <StatCard
                      icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
                      label="통합 최대낙폭 (MDD)"
                      value={analysisResult?.portfolio_mdd ? `${analysisResult.portfolio_mdd}%` : "—"}
                      desc="과거 역사적 하락장 기준 최대 하락폭 시뮬레이션"
                      color="bg-rose-950/20 border-rose-500/20"
                    />
                  </div>

                  {/* 2. 포트폴리오 정밀 퀀트 진단 리포트 */}
                  {analysisResult?.report && (
                    <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900/80 to-purple-950/40 border border-blue-500/20 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
                        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-white text-base">포트폴리오 정밀 퀀트 진단 리포트</h3>
                          <p className="text-xs text-gray-400">자산군 간 상관관계 및 분산 상태를 종합 평가한 결과입니다.</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-200 leading-relaxed mt-2">{analysisResult.report}</p>
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                        <span>본 진단 리포트는 과거 통계 데이터를 기계적으로 집계한 참고용 정보이며, 법적 투자 자문에 해당하지 않습니다.</span>
                      </div>
                    </div>
                  )}

                  {/* 3. 6가지 팩터 특성 지도 & 상세 지표 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 레이더 차트 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-5 h-5 text-purple-400" />
                          <h3 className="font-black text-white text-base">6대 팩터 특성 지도</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-6">자산의 성향(성장, 가치, 안정, 현금흐름) 균형도를 다각형으로 시각화합니다.</p>
                      </div>

                      {radarData.length > 0 ? (
                        <div style={{ width: "100%", height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                              <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: "bold" }} />
                              <Radar name="포트폴리오" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} strokeWidth={2.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">데이터 없음</div>
                      )}
                      
                      <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-gray-500 text-center">
                        다각형 면적이 고르게 넓을수록 분산 투자와 리스크 관리가 잘 이루어진 상태입니다.
                      </div>
                    </div>

                    {/* 팩터 상세 바 차트 */}
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        <h3 className="font-black text-white text-base">6가지 핵심 투자 지표 상세</h3>
                      </div>
                      <p className="text-xs text-gray-400 mb-5">각 지표별 퀀트 모델 산출 점수와 전문적 의미를 확인하세요.</p>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {radarData.map(d => (
                          <FactorBar key={d.subject} name={d.subject} value={d.A} />
                        ))}
                        {radarData.length === 0 && <p className="text-gray-500 text-sm text-center py-8">진단하기 후 표시됩니다</p>}
                      </div>
                    </div>
                  </div>

                  {/* 4. 자산 분산 비중 분석 (Sector Composition) */}
                  {analysisResult?.composition?.composition && analysisResult.composition.composition.length > 0 && (
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-emerald-400" />
                          <h3 className="font-black text-white text-base">자산 및 업종별 분산 비중</h3>
                        </div>
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-500/20">
                          포트폴리오 균형성 분석
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-6">특정 섹터에 자산이 과도하게 쏠려 있지 않은지 확인하여 시스템 리스크를 줄이세요.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-8">
                        <div className="w-full h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analysisResult.composition.composition}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                innerRadius={55}
                                paddingAngle={3}
                              >
                                {analysisResult.composition.composition.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(val: any) => [`${val}%`, '비중']}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {analysisResult.composition.composition.map((entry: any, index: number) => (
                            <div key={index} className="flex flex-col gap-1 text-sm bg-zinc-950/80 p-3 rounded-2xl border border-white/5 hover:border-white/15 transition-all">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-3.5 h-3.5 rounded-lg shadow-sm" style={{ backgroundColor: entry.fill }} />
                                  <span className="font-bold text-white text-xs md:text-sm">{entry.name}</span>
                                </div>
                                <span className="font-black font-mono text-white text-sm">{entry.value}%</span>
                              </div>
                              {entry.symbols && entry.symbols.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 pl-6">
                                  {entry.symbols.map((sym: string, i: number) => (
                                    <span key={i} className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                      {sym}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. 예상 배당 캘린더 & 현금흐름 요약 */}
                  {calendarItems.length > 0 && (
                    <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-3xl p-6 shadow-xl">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-black text-white text-base">예상 배당 캘린더 및 현금흐름</h3>
                            <p className="text-xs text-gray-400">보유 수량을 반영한 분기별 예상 배당금 지급 스케줄입니다.</p>
                          </div>
                        </div>
                        
                        {totalAnnualDividend > 0 && (
                          <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-[10px] text-gray-400 font-bold">연간 총 예상 배당금</div>
                              <div className="text-sm md:text-base font-black font-mono text-amber-300">
                                ₩{Math.round(totalAnnualDividend).toLocaleString()}원
                                <span className="text-xs font-normal text-amber-400/80 ml-1.5">({dividendYieldPct.toFixed(2)}%)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-6 mt-6">
                        {Object.entries(
                          calendarItems.reduce((acc: any, curr: any) => {
                            const month = curr.date ? curr.date.substring(0, 7) : "Unknown";
                            if (!acc[month]) acc[month] = [];
                            acc[month].push(curr);
                            return acc;
                          }, {})
                        ).sort().slice(0, 6).map(([month, events]: [string, any]) => (
                          <div key={month} className="flex flex-col gap-3">
                            <h4 className="text-xs font-black text-gray-300 flex items-center gap-2 px-1">
                              <div className="w-2 h-2 rounded-full bg-amber-400" />
                              <span>{month.split('-')[0]}년 {parseInt(month.split('-')[1])}월</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {events.map((event: any, i: number) => {
                                const isConfirmed = event.type?.includes("확정") || event.source === "확정";
                                const dayOfWeek = getDayOfWeek(event.date);
                                const found = holdings.find(it => it.symbol === event.symbol);
                                const stockName = event.name && event.name !== event.symbol ? event.name : found?.name || event.symbol;
                                const qty = found ? safeNum(found.quantity) : 1;
                                const unitAmt = safeNum(event.amount);
                                const isUSD = event.currency === "USD" || (event.symbol?.match(/[A-Z]/) && !event.symbol?.includes("."));
                                const totalAmt = isUSD ? unitAmt * qty * usdKrw : unitAmt * qty;

                                return (
                                  <div key={i} className="bg-zinc-950/80 border border-white/10 hover:border-amber-500/40 rounded-2xl p-4 flex justify-between items-center transition-all shadow-md">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs md:text-sm text-white">{stockName}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                                          isConfirmed ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-zinc-800 text-gray-400 border-white/10"
                                        }`}>
                                          {isConfirmed ? "확정" : "예상"}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-gray-500 font-mono">
                                        {event.date.split('-')[2]}일 ({dayOfWeek}) · 주당 {unitAmt.toLocaleString()}{isUSD ? "$" : "원"}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-amber-400 font-black font-mono text-sm md:text-base">
                                        +₩{Math.round(totalAmt).toLocaleString()}
                                      </div>
                                      <div className="text-[9px] text-gray-500 font-mono">
                                        {qty}주 보유 기준
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6. 법적 면책 고지 */}
                  <div className="bg-rose-950/20 border border-rose-500/20 rounded-3xl p-6 text-xs text-gray-400 leading-relaxed shadow-lg">
                    <div className="flex items-center gap-2 mb-2 font-bold text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>[투자 유의사항 및 법적 면책 안내]</span>
                    </div>
                    <p className="mb-1.5">
                      본 포트폴리오 정밀 퀀트 분석 서비스는 유사투자자문업 등에 해당하지 않으며, 특정 종목의 매수·매도 추천이나 수익률을 보장하지 않습니다.
                    </p>
                    <p className="mb-1.5">
                      제공되는 모든 지표(건강 균형 지수, 기대 수익률, 변동성, MDD, 팩터 점수)는 과거 주가 및 재무제표 통계에 기반한 정량적 수치일 뿐이며, 미래의 투자 성과를 담보하지 않습니다.
                    </p>
                    <p>
                      모든 투자의 최종 결정과 손익에 대한 책임은 투자자 본인에게 있습니다.
                    </p>
                  </div>
                </div>
              )}

              {/* 초기 안내 화면 */}
              {!loading && !result && !analysisResult && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500 bg-zinc-900/30 rounded-3xl border border-white/5 p-8">
                  <Star className="w-16 h-16 opacity-20 text-yellow-500" />
                  <h3 className="text-xl font-black text-white">내 포트폴리오를 퀀트 알고리즘으로 진단해 보세요</h3>
                  <p className="text-xs sm:text-sm text-center text-gray-400 max-w-md leading-relaxed">
                    상단에 보유 종목과 매수 단가, 수량을 입력하고<br/>
                    <strong className="text-blue-400 font-bold">포트폴리오 퀀트 진단하기</strong> 버튼을 누르면 5대 핵심 지표가 계산됩니다.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 w-full max-w-lg text-center text-xs">
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5"><div className="text-2xl mb-1">🏥</div><div className="text-white font-bold mb-0.5">건강 균형 지수</div><div className="text-[10px] text-gray-500">종합 분산도 진단</div></div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5"><div className="text-2xl mb-1">📊</div><div className="text-white font-bold mb-0.5">6대 팩터 레이더</div><div className="text-[10px] text-gray-500">베타/알파/모멘텀 분석</div></div>
                    <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5"><div className="text-2xl mb-1">💰</div><div className="text-white font-bold mb-0.5">배당 현금흐름</div><div className="text-[10px] text-gray-500">연간 배당 스케줄</div></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
