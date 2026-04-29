"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
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
  if (score >= 80) return { label: "아주 튼튼해요 💎", color: "text-blue-400", bg: "bg-blue-500/20" };
  if (score >= 65) return { label: "균형 잡혔어요 ✅", color: "text-green-400", bg: "bg-green-500/20" };
  if (score >= 50) return { label: "적당한 상태예요 😐", color: "text-yellow-400", bg: "bg-yellow-500/20" };
  return { label: "관리가 필요해요 ⚠️", color: "text-red-400", bg: "bg-red-500/20" };
}

// 팩터 설명
const FACTOR_INFO: Record<string, { label: string; desc: string; icon: string }> = {
  베타:    { label: "시장 민감도", desc: "시장의 파도에 얼마나 민감한지. 높을수록 큰 파도를 타요.", icon: "📡" },
  알파:    { label: "실력 점수", desc: "평균보다 얼마나 더 수익을 냈는지 보여주는 성적표예요.", icon: "🏆" },
  모멘텀:  { label: "달리는 힘", desc: "주가가 최근 얼마나 씩씩하게 올라가고 있는지 나타내요.", icon: "🚀" },
  밸류:    { label: "가성비", desc: "좋은 회사를 저렴한 가격에 샀는지 보여주는 지표예요.", icon: "🏷️" },
  변동성:  { label: "출렁임", desc: "가격이 롤러코스터처럼 얼마나 오르내리는지 정도예요.", icon: "🎢" },
  배당:    { label: "보너스", desc: "주식을 가지고만 있어도 회사에서 주는 보너스 수익이에요.", icon: "💰" },
};

function FactorBar({ name, value }: { name: string; value: number }) {
  const info = FACTOR_INFO[name] || { label: name, desc: "", icon: "📊" };
  const color = value >= 70 ? "bg-green-500" : value >= 40 ? "bg-blue-500" : "bg-red-400";
  return (
    <div className="group relative">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{info.icon}</span>
          <span className="text-xs font-bold text-gray-200">{info.label}</span>
        </div>
        <span className="text-xs font-black text-white">{Math.round(value)}<span className="text-gray-400 font-normal">/100</span></span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <p className="text-[10px] text-gray-500 mt-0.5">{info.desc}</p>
    </div>
  );
}

function StatCard({ icon, label, value, desc, color }: any) {
  return (
    <div className={`rounded-2xl p-4 border ${color} flex flex-col gap-1`}>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-[11px] text-gray-500 leading-tight">{desc}</div>
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
  const [usdKrw, setUsdKrw] = useState(1350);
  const { user, isLoading: authLoading } = useAuth();

  // 항상 최신 userId를 반환 - localStorage 직접 읽기로 타이밍 문제 해결
  const getUserId = useCallback(() => {
    // 1순위: AuthContext user
    if (user?.id) return user.id;
    // 2순위: localStorage "stock_user" (AuthContext 로딩 전에도 동작)
    try {
      const stored = localStorage.getItem("stock_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) return parsed.id;
      }
    } catch {}
    return null;
  }, [user]);

  // 로그인 여부 (localStorage 포함)
  const isLoggedIn = !!getUserId();

  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;
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
  }, [user, authLoading]);

  // 실시간 시세 새로고침
  const refreshPrices = useCallback(async (targets?: any[]) => {
    const list = targets || holdings;
    if (list.length === 0) return;
    const syms = list.map(h => h.symbol).join(",");
    try {
      const res = await fetch(`${API_BASE_URL}/api/stock/quotes/multi?symbols=${encodeURIComponent(syms)}`);
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setCurrentPrices(json.data);
        if (json.usd_krw) setUsdKrw(json.usd_krw);
      }
    } catch (e) { console.error(e); }
  }, [holdings]);

  // 30초마다 시세 자동 갱신
  useEffect(() => {
    const timer = setInterval(() => refreshPrices(), 30000);
    return () => clearInterval(timer);
  }, [refreshPrices]);

  // 관심종목 불러오기
  const syncFromWatchlist = async () => {
    const userId = getUserId();
    if (!userId) {
      alert("구글 계정으로 로그인 후 이용할 수 있습니다.\n\n사이드바 하단에서 로그인해 주세요.");
      return;
    }
    setSyncLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
        headers: { "X-User-ID": userId },
      });
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
        // 현재가 동시 조회
        const newHoldings = await Promise.all(
          json.data.map(async (s: any) => {
            let price = "0";
            let currency = "KRW";
            try {
              const qr = await fetch(`${API_BASE_URL}/api/stock/quote/${encodeURIComponent(s.symbol)}`);
              const qj = await qr.json();
              if (qj.status === "success" && qj.data) {
                price = String(safeNum(qj.data.price));
                currency = qj.data.currency || "KRW";
              }
            } catch {}
            return { symbol: s.symbol, name: s.name, price, quantity: "1", currency };
          })
        );
        setHoldings(newHoldings);
        // DB에도 저장
        for (const h of newHoldings) {
          try {
            await fetch(`${API_BASE_URL}/api/portfolio`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-User-ID": userId },
              body: JSON.stringify(h),
            });
          } catch {}
        }
        alert(`관심종목 ${newHoldings.length}개를 현재가로 불러왔습니다!\n수량은 기본 1주로 설정되어 있으니 필요 시 수정해 주세요.`);
      } else {
        alert("불러올 관심종목이 없습니다.\n관심종목 페이지에서 먼저 종목을 추가해 주세요.");
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
      const res = await fetch(`${API_BASE_URL}/api/quote/${encodeURIComponent(sym.trim())}`);
      const json = await res.json();
      if (json.status === "success" && json.data?.price) {
        const p = safeNum(json.data.price);
        if (p > 0) {
          setInputPrice(p.toString());
          // 현재가 정보도 즉시 캐시
          setCurrentPrices(prev => ({
            ...prev,
            [sym.toUpperCase().trim()]: { price: p, change: json.data.change || "0%", up: json.data.up ?? true }
          }));
        }
      }
    } catch (e) { console.error(e); }
  };

  // 종목 검색 제안
  useEffect(() => {
    if (inputSymbol.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/stock/search?q=${encodeURIComponent(inputSymbol)}`);
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
    // 선택된 이름이 있으면 사용, 없으면 제안 리스트에서 찾기, 그것도 없으면 심볼 사용
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

  const removeHolding = async (sym: string) => {
    setHoldings(prev => prev.filter(h => h.symbol !== sym));
    const userId = getUserId();
    if (userId) { try { await fetch(`${API_BASE_URL}/api/portfolio/${sym}`, { method: "DELETE", headers: { "X-User-ID": userId } }); } catch (e) { console.error(e); } }
  };

  const runOptimization = async (overrideHoldings?: any[]) => {
    const tH = overrideHoldings || holdings;
    const syms = tH.map(h => h.symbol).filter(Boolean);
    if (syms.length < 1) { setError("최소 1개 이상의 종목이 필요합니다."); return; }
    const isPro = localStorage.getItem("isPro") === "true";
    if (!isPro && !checkReward() && !hasPaid && !isFreeModeEnabled()) { setShowAdModal(true); return; }
    setLoading(true); setError(""); setResult(null); setAnalysisResult(null);
    try {
      if (syms.length >= 2) {
        try {
          const r = await fetch(`${API_BASE_URL}/api/portfolio/optimize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbols: syms }) });
          const j = await r.json();
          if (j.status === "success" && j.data) setResult(j.data);
        } catch (e) { console.warn(e); }
      }
      const rd = await fetch(`${API_BASE_URL}/api/portfolio/diagnosis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portfolio: syms }) });
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

  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e12] text-white">
      <div className="bg-amber-900/30 border-b border-amber-600/30 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-200">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span><strong>투자 유의:</strong> 본 분석은 참고용 통계 정보이며, 투자 권유가 아닙니다. 투자 결정은 본인 판단으로 하세요.</span>
      </div>

      <div className="shrink-0"><Header title="내 포트폴리오 분석" subtitle="보유 종목을 입력하면 AI가 분석해 드려요" /></div>

      <AdRewardModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} onReward={handleAdReward} featureName="AI Portfolio Optimizer" />

      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-6">

          {/* 입력 패널 */}
          <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
            <h2 className="text-sm font-bold text-gray-400 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> 보유 종목 입력</span>
              {/* 관심종목 불러오기 버튼 */}
              <button
                onClick={syncFromWatchlist}
                disabled={syncLoading}
                title={!isLoggedIn ? "사이드바에서 구글 로그인 후 이용 가능합니다" : ""}
                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 border ${
                  isLoggedIn
                    ? "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    : "bg-gray-700/50 text-gray-500 border-gray-600/30 cursor-not-allowed"
                }`}
              >
                {syncLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                {syncLoading ? "불러오는 중..." : isLoggedIn ? "⭐ 관심종목 불러오기" : "로그인 후 이용 가능"}
              </button>
            </h2>

            {/* 종목 태그 */}
            {holdings.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {holdings.map(h => {
                  const current = currentPrices[h.symbol];
                  const buyPrice = safeNum(h.price);
                  const currPrice = current ? safeNum(current.price) : buyPrice;
                  const profit = (currPrice - buyPrice) * safeNum(h.quantity);
                  const profitRate = buyPrice > 0 ? ((currPrice - buyPrice) / buyPrice * 100) : 0;
                  const isUp = profit > 0;
                  const isDown = profit < 0;

                  return (
                    <div key={h.symbol} className="group relative flex flex-col gap-1 bg-white/5 border border-white/10 hover:border-blue-500/40 p-3 rounded-2xl transition-all min-w-[140px]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white truncate max-w-[100px]">{h.name || h.symbol}</span>
                          <span className="text-[9px] font-mono text-gray-500">{h.symbol}</span>
                        </div>
                        <button onClick={() => removeHolding(h.symbol)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-500">{buyPrice.toLocaleString()}원 × {h.quantity}주</div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs font-bold text-gray-200">{currPrice.toLocaleString()}원</div>
                        <div className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isUp ? "bg-red-500/10 text-red-400" : isDown ? "bg-blue-500/10 text-blue-400" : "bg-gray-500/10 text-gray-400"}`}>
                          {isUp ? "▲" : isDown ? "▼" : ""} {Math.abs(profitRate).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 입력 행 */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1 relative">
                <label className="text-[11px] text-gray-500">종목명 또는 코드</label>
                <div className="relative">
                  <input type="text" placeholder="예: 삼성전자, TSLA"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono text-sm w-44"
                    value={inputSymbol} onChange={e => setInputSymbol(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addHolding()}
                    onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                  />
                  {isSearching && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-gray-500" />}
                </div>
                
                {/* 검색 제안 드롭다운 */}
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-64 mt-1 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => selectSuggestion(s)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-bold text-white">{s.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{s.symbol}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{s.market}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500">매수 단가 (원)</label>
                <input type="number" placeholder="자동 조회됩니다"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm w-36"
                  value={inputPrice} onChange={e => setInputPrice(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addHolding()} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-gray-500">보유 수량 (주)</label>
                <input type="number" placeholder="수량"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm w-24"
                  value={inputQuantity} onChange={e => setInputQuantity(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addHolding()} />
              </div>
              <button onClick={addHolding} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all">
                <Plus className="w-4 h-4" /> 추가
              </button>
              <button onClick={() => runOptimization()} disabled={loading || holdings.length < 1}
                className="ml-auto bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> 포트폴리오 진단하기</>}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              <p className="text-gray-400 text-sm">AI가 포트폴리오를 분석 중입니다... (약 10~20초 소요)</p>
            </div>
          )}

          {/* 결과 영역 */}
          {!loading && (result || analysisResult) && (
            <div className="flex flex-col gap-6">

              {/* 상단 요약 카드 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 건강 점수 */}
                <div className={`col-span-2 md:col-span-1 rounded-2xl p-5 border border-white/10 flex flex-col items-center justify-center gap-2 ${grade.bg}`}>
                  <div className="text-xs text-gray-400 font-bold">포트폴리오 건강점수</div>
                  <div className={`text-6xl font-black ${grade.color}`}>{score}</div>
                  <div className={`text-sm font-bold px-3 py-1 rounded-full ${grade.bg} ${grade.color} border border-current/30`}>{grade.label}</div>
                  <p className="text-[11px] text-gray-500 text-center">AI가 산출한 포트폴리오 균형 점수 (참고용)</p>
                </div>

                {/* 총 투자금액 */}
                <StatCard
                  icon={<Coins className="w-4 h-4" />}
                  label="총 투자 금액"
                  value={`${totalInvested.toLocaleString()}원`}
                  desc={`미국 주식은 현재 환율(약 ${usdKrw.toLocaleString()}원)을 적용해 원화로 합산했어요.`}
                  color="bg-white/5 border-white/10"
                />

                {/* 기대 수익 */}
                <StatCard
                  icon={expReturn >= 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  label="연간 기대 수익률"
                  value={result?.metrics ? `${expReturn > 0 ? "+" : ""}${expReturn}%` : "—"}
                  desc={result?.metrics ? "※ 과거 통계 데이터 기반 산출값이며 미래 수익을 보장하지 않습니다" : "종목 2개 이상 입력 시 통계 계산됩니다"}
                  color={result?.metrics ? (expReturn >= 0 ? "bg-green-900/20 border-green-500/20" : "bg-red-900/20 border-red-500/20") : "bg-white/5 border-white/10"}
                />

                {/* 변동성 */}
                <StatCard
                  icon={<Activity className="w-4 h-4 text-purple-400" />}
                  label="포트폴리오 변동성"
                  value={result?.metrics ? `${volatility}%` : "—"}
                  desc={result?.metrics ? `과거 1년 기준 연간 가격 변동폭: ${volatility}% (통계 참고용)` : "종목 2개 이상 입력 시 통계 계산됩니다"}
                  color="bg-purple-900/20 border-purple-500/20"
                />
              </div>

              {/* AI 리포트 */}
              {analysisResult?.report && (
                <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <span className="font-bold text-white">AI 포트폴리오 리포트</span>
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">참고용 분석</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{analysisResult.report}</p>
                  <p className="text-[11px] text-gray-600 mt-3 flex items-center gap-1"><Info className="w-3 h-3" /> ※ 본 내용은 AI가 생성한 통계적 참고 정보이며, 투자자문이 아닙니다. 모든 투자 결정은 본인 책임입니다.</p>
                </div>
              )}

              {/* 6각 데이터맵 + 팩터 바 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 레이더 차트 */}
                <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-sm">포트폴리오 특성 지도</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-4">6가지 투자 특성을 한눈에 비교해요. 넓을수록 각 특성이 강해요.</p>
                  {radarData.length > 0 ? (
                    <div style={{ width: "100%", height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                          <PolarGrid stroke="#333" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "#a78bfa", fontSize: 11, fontWeight: "bold" }} />
                          <Radar name="포트폴리오" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-500 text-sm">데이터 없음</div>
                  )}
                </div>

                {/* 팩터 바 차트 */}
                <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-white text-sm">6가지 투자 지표 상세</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-4">각 지표가 무엇을 의미하는지 쉽게 확인하세요.</p>
                  <div className="flex flex-col gap-4">
                    {radarData.map(d => (
                      <FactorBar key={d.subject} name={d.subject} value={d.A} />
                    ))}
                    {radarData.length === 0 && <p className="text-gray-500 text-sm text-center py-8">진단하기 후 표시됩니다</p>}
                  </div>
                </div>
              </div>

              {/* 배당 캘린더 */}
              {calendarItems.length > 0 && (
                <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-white text-sm">예상 배당 캘린더</span>
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">연간 흐름 확인</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-4">
                    과거 배당 이력을 바탕으로 한 예상 일정입니다. <span className="text-blue-400 font-bold">확정</span>은 공시가 완료된 데이터, <span className="text-gray-400">예상</span>은 과거 패턴 분석 결과입니다.
                  </p>
                  
                  <div className="flex flex-col gap-6">
                    {/* 월별 그룹화 출력 */}
                    {Object.entries(
                      calendarItems.reduce((acc: any, curr: any) => {
                        const month = curr.date ? curr.date.substring(0, 7) : "Unknown"; // YYYY-MM
                        if (!acc[month]) acc[month] = [];
                        acc[month].push(curr);
                        return acc;
                      }, {})
                    ).sort().slice(0, 6).map(([month, events]: [string, any]) => (
                      <div key={month} className="flex flex-col gap-2">
                        <h4 className="text-xs font-black text-gray-400 flex items-center gap-2 px-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                          {month.split('-')[0]}년 {parseInt(month.split('-')[1])}월
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {events.map((event: any, i: number) => {
                            const isConfirmed = event.type?.includes("확정") || event.source === "확정";
                            const dayOfWeek = getDayOfWeek(event.date);
                            return (
                              <div key={i} className="bg-white/5 border border-white/10 hover:border-yellow-500/30 rounded-xl p-3 flex justify-between items-center transition-colors">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-white">{event.name || event.symbol}</span>
                                    <span className={`text-[9px] px-1 py-0.25 rounded ${isConfirmed ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"}`}>
                                      {isConfirmed ? "확정" : "예상"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    {event.date.split('-')[2]}일 ({dayOfWeek}) · {event.type.replace("확정", "").replace("예상", "").trim()}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-yellow-400 font-black text-sm">
                                    +{safeNum(event.amount).toLocaleString()}{event.currency === "KRW" ? "원" : "$"}
                                  </div>
                                  <div className="text-[9px] text-gray-600">주당 배당금</div>
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
            </div>
          )}

          {/* 초기 화면 */}
          {!loading && !result && !analysisResult && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
              <Star className="w-16 h-16 opacity-20 text-yellow-500" />
              <h3 className="text-xl font-bold text-gray-300">내 포트폴리오를 진단해 보세요</h3>
              <p className="text-sm text-center max-w-md">위에 보유 종목, 매수 단가, 수량을 입력하고<br/><strong className="text-blue-400">포트폴리오 진단하기</strong> 버튼을 눌러주세요!</p>
              <div className="grid grid-cols-3 gap-4 mt-4 text-center text-xs">
                <div className="bg-white/5 rounded-xl p-3"><div className="text-2xl mb-1">🏥</div><div className="text-gray-400">건강점수 분석</div></div>
                <div className="bg-white/5 rounded-xl p-3"><div className="text-2xl mb-1">📊</div><div className="text-gray-400">6가지 특성 진단</div></div>
                <div className="bg-white/5 rounded-xl p-3"><div className="text-2xl mb-1">💰</div><div className="text-gray-400">배당 캘린더</div></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
