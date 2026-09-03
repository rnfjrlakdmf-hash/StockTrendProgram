"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Link from "next/link";
import { 
    ChevronRight, AlertCircle, Clock, CheckCircle2, XCircle, TrendingUp, 
    TrendingDown, Eye, Calendar, Building2, Tag, Info, Database, BellRing,
    Sparkles, Compass, Zap, ShieldCheck, Flame, Layers, ExternalLink,
    Search, Filter, Globe, Crown, ShieldAlert, Lock
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import KakaoAdFit from "@/components/KakaoAdFit";

interface AlertItem {
    id: string;
    type: string;
    title: string;
    body: string;
    timestamp: any;
    market?: string;
    symbol?: string;
    dart_url?: string;
    news_url?: string;
    url?: string;
}

// Market Badge Resolver (국내 코스피·코스닥 및 미국 나스닥·NYSE·S&P500 완벽 구분)
function getMarketBadge(alert: any): { label: string; style: string; icon?: string } | null {
    const text = `${alert.title || ''} ${alert.body || ''} ${alert.market || ''}`;
    const symbol = (alert.symbol || '').toUpperCase().trim();
    
    // 1. 국내 증시 (코스피 / 코스닥)
    if (text.includes('[코스피]') || alert.market === 'KOSPI' || alert.market === '코스피' || symbol.endsWith('.KS')) {
        return { label: '코스피', style: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
    }
    if (text.includes('[코스닥]') || alert.market === 'KOSDAQ' || alert.market === '코스닥' || symbol.endsWith('.KQ')) {
        return { label: '코스닥', style: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
    }
    if (/^\d{6}$/.test(symbol)) {
        return { label: '코스피', style: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
    }

    // 2. 미국 증시 (나스닥 / NYSE / S&P 500)
    if (text.includes('[나스닥]') || alert.market === 'NASDAQ' || alert.market === '나스닥') {
        return { label: '나스닥', style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    }
    if (text.includes('[S&P500]') || text.includes('S&P 500') || alert.market === 'S&P500') {
        return { label: 'S&P 500', style: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    }
    if (text.includes('[NYSE]') || text.includes('뉴욕증시') || alert.market === 'NYSE') {
        return { label: 'NYSE', style: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
    }
    
    // 미국 대형 지수 (S&P 500 주요 대표 종목)
    const sp500Top = [
        'AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'GOOG', 'AMZN', 'META', 'BRK.A', 'BRK.B', 
        'LLY', 'JPM', 'V', 'UNH', 'XOM', 'MA', 'JNJ', 'PG', 'HD', 'COST', 'ABBV', 'MRK', 
        'NFLX', 'AMD', 'CRM', 'PEP', 'KO', 'BAC', 'WMT', 'CVX', 'TMO', 'MCD', 'CSCO', 'INTC', 'DIS'
    ];
    if (sp500Top.includes(symbol)) {
        return { label: 'S&P 500', style: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
    }

    // 미국 SEC 공시 또는 [미국] 태그가 있는 경우 심볼 기반으로 나스닥 / NYSE 자동 분류
    const isUS = text.includes('[미국]') || alert.market === 'US' || (alert.type && alert.type.startsWith('sec_'));
    if (isUS) {
        // 미국 거래소 룰: 4글자 이상 티커(BRZE, ALMU, PLTR, SMCI, CRWD 등)는 나스닥 상장사
        if (symbol.length >= 4 && /^[A-Z]+$/.test(symbol)) {
            return { label: '나스닥', style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
        }
        // 1~3글자 티커(SMR, F, BA, GM, IBM, LLY, CAT 등)는 전통 뉴욕증권거래소(NYSE) 상장사
        if (symbol.length >= 1 && symbol.length <= 3 && /^[A-Z]+$/.test(symbol)) {
            return { label: 'NYSE', style: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
        }
        // 기본 미국장 뱃지
        return { label: '나스닥', style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    }
    
    return null;
}

export default function AlertCenterPage() {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("all");
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
    const [watchlistNames, setWatchlistNames] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [disclosureFilter, setDisclosureFilter] = useState<'all' | 'kr' | 'us'>('all');
    const ITEMS_PER_PAGE = 20;

    const { user } = useAuth();
    const isAdmin = Boolean(
        user && (
            user.role === 'admin' || 
            user.email?.toLowerCase() === 'rnfjr@gmail.com' || 
            user.email?.toLowerCase() === 'rnfjrlakdmf@gmail.com' || 
            (user as any).is_admin ||
            user.id === '110418985320259217419' ||
            user.id === '108559801745912003405'
        )
    );

    // 방문 시간 기록
    useEffect(() => {
        localStorage.setItem('last_alert_visit', new Date().toISOString());
        window.dispatchEvent(new Event('alerts_visited'));
    }, []);

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const alertsRef = collection(db, "alerts");
                
                let userId = user?.id || (user as any)?.uid || localStorage.getItem('fcm_guest_id');
                if (!userId) {
                    try {
                        const storedUser = localStorage.getItem('stock_user');
                        if (storedUser) {
                            const parsed = JSON.parse(storedUser);
                            userId = parsed.id || parsed.uid;
                        }
                    } catch(e){}
                }
                
                const qLatest = query(alertsRef, orderBy("timestamp", "desc"), limit(800));
                const snapLatest = await getDocs(qLatest);
                
                const seenContentKeys = new Set<string>();
                const deduplicatedAlerts: any[] = [];

                snapLatest.forEach(doc => {
                    const data = doc.data();
                    const isGlobal = data.is_global === true;
                    const isTargeted = userId && data.target_users && Array.isArray(data.target_users) && data.target_users.includes(userId);
                    
                    const isAdminType = ['admin_report', 'ping_test', 'system_error', 'health_check', 'visitor_report', 'daily_admin_report', 'admin'].includes(data.type) || 
                        (data.title || '').includes('[관리자]') || (data.title || '').includes('일일 운영 보고서') || (data.title || '').includes('방문자 보고');

                    // 관리자 전용 알림은 비관리자 유저에게는 DB에서부터 필터링
                    if (isAdminType && !isAdmin) return;

                    const isPublicType = ['disclosure_alert', 'large_holding', 'disclosure', 'sec_insider_trading', 'sec_13f', 'sec_disclosure', 'insider_trading', 'whale_accumulation', 'whale_alert', 'news_alert', 'news_naver', 'news_google', 'news', 'portfolio_summary', 'market_summary', 'system_alert', 'notice', 'announcement', 'service_update'].includes(data.type);
                    
                    if (isGlobal || isTargeted || isPublicType || (isAdmin && isAdminType)) {
                        // Smart Deduplication: normalize whitespace, title + normalized body + 30-minute time bucket
                        const sec = data.timestamp?.seconds || 0;
                        const timeBucket = Math.floor(sec / 1800); // 30 minutes bucket
                        const cleanTitle = (data.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
                        // 공백 및 줄바꿈 차이로 인한 중복 방지를 위해 공백 통일
                        const cleanBody = (data.body || '').replace(/\s+/g, ' ').trim().substring(0, 60).toLowerCase();
                        const contentKey = `${cleanTitle}::${cleanBody}::${timeBucket}`;
                        
                        if (!seenContentKeys.has(contentKey)) {
                            seenContentKeys.add(contentKey);
                            deduplicatedAlerts.push({ id: doc.id, ...data });
                        }
                    }
                });

                let sortedAlerts = deduplicatedAlerts;
                sortedAlerts.sort((a, b) => {
                    const timeA = a.timestamp?.seconds || 0;
                    const timeB = b.timestamp?.seconds || 0;
                    return timeB - timeA;
                });
                
                setAlerts(sortedAlerts.slice(0, 600));
                setErrorMsg(null);
            } catch (err: any) {
                console.error("Failed to fetch alerts:", err);
                setErrorMsg(err.message || "알림을 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        }
        
        async function fetchWatchlist() {
            try {
                const userId = user?.id || (user as any)?.uid;
                if (!userId) return;
                const res = await fetch(`${API_BASE_URL}/api/watchlist`, {
                    headers: { "X-User-ID": userId }
                });
                const json = await res.json();
                if (json.status === "success" && json.data.length > 0) {
                    const symbols: string[] = [];
                    const names: string[] = [];
                    json.data.forEach((item: any) => {
                        if (typeof item === 'string') {
                            symbols.push(item);
                        } else {
                            if (item.symbol) symbols.push(item.symbol);
                            if (item.name) names.push(item.name);
                        }
                    });
                    setWatchlistSymbols(symbols);
                    setWatchlistNames(names);
                }
            } catch (err) {
                console.error("Failed to fetch watchlist:", err);
            }
        }
        
        if (user !== undefined) {
            fetchAlerts();
            fetchWatchlist();
        }
    }, [user]);

    // Enhanced Body Formatter with Market Interpretation Pill Box
    
// Convert USD abbreviations ($72.4K, $2.1M) to Korean Won & Korean Dollars (e.g. 약 44.2억원 · 320만 달러)
function formatUsdToKrwInText(text: string): string {
    if (!text) return text;
    const fx = 1380;
    return text.replace(/\(\s*약?\s*\$([\d\.]+)\s*([KMBkmb]?)\s*\)/g, (match, numStr, unit) => {
        let val = parseFloat(numStr) || 0;
        const u = (unit || '').toUpperCase();
        if (u === 'B') val *= 1_000_000_000;
        else if (u === 'M') val *= 1_000_000;
        else if (u === 'K') val *= 1_000;
        
        const krw = val * fx;
        let krwStr = "";
        if (krw >= 100_000_000_000) {
            krwStr = `약 ${(krw / 100_000_000_000).toFixed(1)}천억원`;
        } else if (krw >= 100_000_000) {
            krwStr = `약 ${(krw / 100_000_000).toFixed(1)}억원`;
        } else if (krw >= 10_000) {
            krwStr = `약 ${Math.round(krw / 10_000).toLocaleString()}만원`;
        } else {
            krwStr = `약 ${Math.round(krw).toLocaleString()}원`;
        }

        let usdKor = "";
        if (val >= 1_000_000_000) {
            usdKor = `${(val / 100_000_000).toFixed(1)}억 달러`;
        } else if (val >= 10_000) {
            const valMan = val / 10_000;
            usdKor = `${valMan % 1 === 0 ? valMan : valMan.toFixed(1)}만 달러`;
        } else {
            usdKor = `${Math.round(val).toLocaleString()}달러`;
        }

        return `(${krwStr} · ${usdKor})`;
    });
}

    const renderFormattedBody = (text: string) => {
        text = formatUsdToKrwInText(text);
        if (!text) return null;

        // Separate market interpretation block if present
        let mainText = text;
        let marketInterpretation = "";

        if (text.includes("💡 [시장해석]") || text.includes("💡 [시장 해석]")) {
            const splitIdx = text.indexOf("💡 [시장");
            mainText = text.substring(0, splitIdx).trim();
            marketInterpretation = text.substring(splitIdx).trim();
        }

        const urlRegex = /(https?:\/\/[^\s]+)/g;

        const formatSegment = (str: string) => {
            const parts = str.split(urlRegex);
            return parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    let href = part;
                    let isInternal = false;
                    if (part.startsWith("https://stock-trend-program.co.kr") || part.startsWith("http://stock-trend-program.co.kr")) {
                        try {
                            const parsed = new URL(part);
                            href = parsed.pathname + parsed.search;
                            isInternal = true;
                        } catch(e){}
                    }
                    if (isInternal) {
                        return (
                            <Link
                                key={index}
                                href={href}
                                onClick={(e) => e.stopPropagation()}
                                className="text-cyan-400 font-bold hover:underline break-all"
                            >
                                {part}
                            </Link>
                        );
                    }
                    return (
                        <a
                            key={index}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-cyan-400 font-bold hover:underline break-all inline-flex items-center gap-1"
                        >
                            {part} <ExternalLink className="w-3 h-3 inline" />
                        </a>
                    );
                }
                return <span key={index}>{part}</span>;
            });
        };

        return (
            <div className="space-y-2.5">
                <div className="text-xs md:text-sm text-zinc-200 leading-relaxed font-medium">
                    {formatSegment(mainText)}
                </div>
                {marketInterpretation && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 mt-2 flex items-start gap-2.5 shadow-sm">
                        <div className="p-1 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-xs md:text-sm text-amber-200 leading-relaxed font-semibold">
                            {marketInterpretation.replace(/^💡\s*\[시장해석\]\s*/, '')}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // Render Luxury Alert Card
    
    // Render Dedicated Portfolio Summary Micro-Bento with MVP & Smart Money Supply
    const renderPortfolioCardContent = (alert: any) => {
        const text = alert.body || '';
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        
        let totalReturn = "";
        let totalProfit = "";
        let mvpText = "";
        let worstText = "";
        let supplyText = "";
        let stockItems: { name: string; detail: string; changePct: number; isUp: boolean }[] = [];
        let subDetails: string[] = [];
        let disclaimer = "";

        lines.forEach((line: string) => {
            if (line.includes('총 누적 수익률') || line.includes('총 수익률')) {
                totalReturn = line.replace(/^.*?수익률[:\s]*/, '').trim();
            } else if (line.includes('총 누적 수익') || line.includes('총 수익:')) {
                totalProfit = line.replace(/^.*?총\s*누적\s*수익[:\s]*/, '').replace(/^.*?총\s*수익[:\s]*/, '').trim();
            } else if (line.includes('오늘의 MVP') || line.includes('🏆')) {
                mvpText = line.replace(/^.*?MVP[:\s]*/, '').trim();
            } else if (line.includes('약세 종목') || line.includes('⚠️')) {
                worstText = line.replace(/^.*?약세\s*종목[:\s]*/, '').trim();
            } else if (line.includes('수급 합산') || line.includes('🌊')) {
                supplyText = line.replace(/^.*?수급\s*합산[:\s]*/, '').trim();
            } else if (line.startsWith('(') && line.endsWith(')')) {
                disclaimer = line;
            } else if (line.startsWith('↳') || line.startsWith('->') || line.includes('차]')) {
                subDetails.push(line);
            } else if (line.startsWith('•') || line.includes(':')) {
                const match = line.match(/([▲▼\-]?\s*[\d\.]+%)/);
                let pct = 0;
                let isUp = false;
                if (match) {
                    const cleanPct = match[1].replace('▲', '+').replace('▼', '-').replace('%', '').trim();
                    pct = parseFloat(cleanPct) || 0;
                    isUp = pct >= 0;
                }
                stockItems.push({
                    name: line.split(':')[0].replace('•', '').trim(),
                    detail: line.includes(':') ? line.substring(line.indexOf(':') + 1).trim() : line,
                    changePct: pct,
                    isUp: isUp
                });
            }
        });

        if (!mvpText && stockItems.length > 0) {
            const sorted = [...stockItems].sort((a, b) => b.changePct - a.changePct);
            if (sorted[0] && sorted[0].changePct > 0) {
                mvpText = `${sorted[0].name} (${sorted[0].changePct > 0 ? '+' : ''}${sorted[0].changePct}%)`;
            }
            if (sorted[sorted.length - 1] && sorted[sorted.length - 1].changePct < 0 && sorted[sorted.length - 1] !== sorted[0]) {
                worstText = `${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].changePct}%)`;
            }
        }

        const isNegative = totalReturn.includes('-') || totalProfit.includes('-');

        return (
            <div className="space-y-3.5">
                {/* Top KPI Metrics Bento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-zinc-950/80 border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between p-3 bg-zinc-900/90 rounded-xl border border-white/5">
                        <span className="text-xs text-gray-400 font-medium">총 누적 수익률</span>
                        <span className={`text-sm md:text-base font-black font-mono px-2.5 py-0.5 rounded-lg border ${
                            isNegative 
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                            {totalReturn || '0.00%'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-900/90 rounded-xl border border-white/5">
                        <span className="text-xs text-gray-400 font-medium">누적 평가 손익</span>
                        <span className={`text-sm md:text-base font-black font-mono ${
                            isNegative ? 'text-rose-300' : 'text-emerald-300'
                        }`}>
                            {totalProfit || '0원'}
                        </span>
                    </div>
                </div>

                {/* Content Feature 1: MVP & Worst Performer Chip */}
                {(mvpText || worstText) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {mvpText && (
                            <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/25 rounded-2xl">
                                <div className="p-1.5 bg-amber-500/20 rounded-xl text-amber-400 shrink-0 font-bold text-xs">
                                    🏆 MVP
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-gray-400 font-semibold">오늘의 최고 효자 종목</p>
                                    <p className="text-xs md:text-sm font-black text-amber-200 truncate">{mvpText}</p>
                                </div>
                            </div>
                        )}
                        {worstText && (
                            <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/25 rounded-2xl">
                                <div className="p-1.5 bg-blue-500/20 rounded-xl text-blue-400 shrink-0 font-bold text-xs">
                                    ⚠️ 약세
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-gray-400 font-semibold">당일 리스크 점검 종목</p>
                                    <p className="text-xs md:text-sm font-black text-blue-200 truncate">{worstText}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Content Feature 2: Foreign & Inst Supply Summary Chip */}
                {supplyText && (
                    <div className="flex items-center gap-2.5 p-3 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent border border-cyan-500/25 rounded-2xl">
                        <div className="p-1.5 bg-cyan-500/20 rounded-xl text-cyan-300 shrink-0 font-bold text-xs">
                            🌊 수급
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-gray-400 font-semibold">외인·기관 스마트머니 합산</p>
                            <p className="text-xs md:text-sm font-black text-cyan-200 truncate">{supplyText}</p>
                        </div>
                    </div>
                )}

                {/* Individual Holdings Micro-List */}
                {stockItems.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">종목별 마감 현황</p>
                        <div className="space-y-2">
                            {stockItems.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="p-3 bg-zinc-900/80 border border-white/10 hover:border-amber-500/30 rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                                >
                                    <span className="text-xs md:text-sm font-black text-white">{item.name}</span>
                                    <span className="text-xs font-mono font-bold text-zinc-300">{item.detail}</span>
                                </div>
                            ))}
                            {subDetails.map((sub, sIdx) => (
                                <div key={`sub-${sIdx}`} className="ml-3 p-2 bg-zinc-950/60 border border-white/5 rounded-xl text-xs font-mono text-gray-400">
                                    {sub}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Disclaimer */}
                <p className="text-[11px] text-gray-500 font-medium px-1">
                    {disclaimer || '(한국거래소 당일 정규장 종가 기준 단순 집계 통계 자료이며 투자 권유가 아닙니다)'}
                </p>

                {/* Action CTA Buttons */}
                <div className="flex flex-wrap gap-2.5 pt-2 border-t border-white/10">
                    <Link 
                        href="/watchlist" 
                        className="flex-1 min-w-[140px] bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 text-amber-300 border border-amber-500/30 text-center py-2.5 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Crown className="w-4 h-4 text-amber-400" />
                        관심종목 포트폴리오 관리
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    };

    const renderAlertCard = (alert: any) => {
        const isDisclosure = ['disclosure_alert', 'large_holding', 'disclosure', 'sec_insider_trading', 'sec_13f', 'sec_disclosure', 'insider_trading', 'whale_accumulation', 'whale_alert'].includes(alert.type);
        const rawSymbol = alert.symbol || alert.code || '';
        const cleanSymbol = rawSymbol ? (rawSymbol.split('.')[0] || rawSymbol) : '';
        const marketBadge = getMarketBadge(alert);

        let targetUrl = alert.url || '';
        if (targetUrl && (targetUrl.startsWith("https://stock-trend-program.co.kr") || targetUrl.startsWith("http://stock-trend-program.co.kr"))) {
            try {
                const parsed = new URL(targetUrl);
                targetUrl = parsed.pathname + parsed.search;
            } catch(e){}
        }

        // 통합 대시보드('/')로 잘못 설정되어 있는 경우 빈 문자열로 초기화하여 재계산
        if (!targetUrl || targetUrl === '/' || targetUrl === 'https://stock-trend-program.co.kr' || targetUrl === 'https://stock-trend-program.co.kr/') {
            targetUrl = '';
        }

        const dartUrl = (alert as any).dart_url || '';
        const newsUrl = (alert as any).news_url || '';

        if (dartUrl) {
            const params = new URLSearchParams();
            params.set("url", dartUrl);
            params.set("type", "disclosure");
            if (cleanSymbol) params.set("symbol", cleanSymbol);
            if (alert.title) params.set("title", alert.title);
            targetUrl = `/news-redirect?${params.toString()}`;
        } else if (newsUrl) {
            const params = new URLSearchParams();
            params.set("url", newsUrl);
            params.set("type", "news");
            if (cleanSymbol) params.set("symbol", cleanSymbol);
            if (alert.title) params.set("title", alert.title);
            targetUrl = `/news-redirect?${params.toString()}`;
        } else if (!targetUrl && cleanSymbol) {
            targetUrl = `/discovery?q=${cleanSymbol}`;
        }

        // Title and Body text analysis for smart categorization
        const titleText = (alert.title || '').trim();
        const combinedText = `${titleText} ${alert.body || ''}`.toLowerCase();

        const isAdminAlert = ['admin_report', 'ping_test', 'system_error', 'health_check', 'visitor_report', 'daily_admin_report', 'admin'].includes(alert.type) || 
            titleText.includes('[관리자]') || titleText.includes('[시스템 보고]') || titleText.includes('[일일 보고]') || titleText.includes('[방문자 보고]') || titleText.includes('방문자') || titleText.includes('일일 운영 보고서');

        let typeBadgeStyle = "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]";
        let typeBadgeLabel = "📢 스마트 투자 알림";
        let cardBorderHover = "hover:border-cyan-500/40 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]";
        let accentBorder = "border-l-4 border-l-cyan-400";
        let defaultCta = { href: "/discovery", label: "스마트 종목 발굴 레이더 바로가기", icon: Sparkles, style: "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30" };

        const isPortfolio = alert.type === 'portfolio_summary' || alert.type === 'portfolio' || titleText.includes('관심종목 결산');
        const isMarketSummary = alert.type === 'market_summary' || alert.type === 'market' || titleText.includes('장마감 시황');

        // [0순위: 관리자 운영 및 시스템 보고서]
        if (isAdminAlert) {
            typeBadgeStyle = "bg-purple-500/25 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]";
            typeBadgeLabel = "👑 🛡️ 관리자 전용 운영 보고";
            cardBorderHover = "hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)]";
            accentBorder = "border-l-4 border-l-purple-500";
            defaultCta = { href: "/admin", label: "관리자 시스템 대시보드 바로가기", icon: Crown, style: "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40" };
        }
        // [1순위: DART 공시 / 내부자 거래 / 지분 공시] -> 명확하게 공시 뱃지 우선 부여
        else if (titleText.includes("공시 팩트 알림") || alert.type === 'disclosure_alert' || alert.type === 'disclosure') {
            typeBadgeStyle = "bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]";
            typeBadgeLabel = "🇰🇷 DART 공시 팩트 속보";
            cardBorderHover = "hover:border-blue-500/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]";
            accentBorder = "border-l-4 border-l-blue-400";
        } else if (titleText.includes("내부자 거래") || alert.type === 'insider_trading' || alert.type === 'sec_insider_trading') {
            typeBadgeStyle = "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
            typeBadgeLabel = "🚨 대주주·내부자 지분 변동";
            cardBorderHover = "hover:border-rose-500/40 hover:shadow-[0_0_25px_rgba(244,63,94,0.15)]";
            accentBorder = "border-l-4 border-l-rose-400";
        } else if (titleText.includes("대량 보유") || titleText.includes("5% 이상") || alert.type === 'large_holding') {
            typeBadgeStyle = "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]";
            typeBadgeLabel = "🏛️ 5% 이상 대량 보유 공시";
            cardBorderHover = "hover:border-indigo-500/40 hover:shadow-[0_0_25px_rgba(99,102,241,0.15)]";
            accentBorder = "border-l-4 border-l-indigo-400";
        } else if (['sec_13f', 'sec_disclosure'].includes(alert.type) || titleText.includes("SEC")) {
            typeBadgeStyle = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(168,185,129,0.2)]";
            typeBadgeLabel = "🇺🇸 미국 SEC 공시 속보";
            cardBorderHover = "hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(168,185,129,0.15)]";
            accentBorder = "border-l-4 border-l-emerald-400";
        } 
        // [2순위: 리포트 및 결산]
        else if (isPortfolio) {
            typeBadgeStyle = "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
            typeBadgeLabel = "👑 관심종목 마감 결산";
            cardBorderHover = "hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]";
            accentBorder = "border-l-4 border-l-amber-400";
            defaultCta = { href: "/watchlist", label: "관심종목 포트폴리오 관리", icon: Crown, style: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30" };
        } else if (isMarketSummary) {
            typeBadgeStyle = "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]";
            typeBadgeLabel = "🌕 마켓 장마감 시황";
            cardBorderHover = "hover:border-indigo-500/40 hover:shadow-[0_0_25px_rgba(99,102,241,0.15)]";
            accentBorder = "border-l-4 border-l-indigo-400";
            defaultCta = { href: "/blog", label: "마켓 심층 브리핑 전문 읽기", icon: Globe, style: "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30" };
        } 
        // [3순위: 세력 및 외국인·기관 수급 특보]
        else if (['whale_accumulation', 'whale_alert'].includes(alert.type) || titleText.includes("외국인") || titleText.includes("쓸어담은") || titleText.includes("세력") || titleText.includes("기관 순매수")) {
            typeBadgeStyle = "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]";
            typeBadgeLabel = "🐳 외인·기관 수급 특보";
            cardBorderHover = "hover:border-cyan-500/40 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]";
            accentBorder = "border-l-4 border-l-cyan-400";
            defaultCta = { href: "/ranking", label: "실시간 외국인·기관 수급 순위 보기", icon: TrendingUp, style: "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30" };
        } 
        // [4순위: 주도 테마 레이더]
        else if (combinedText.includes("테마") || combinedText.includes("지역화폐") || combinedText.includes("뜨거운 테마") || combinedText.includes("대장주") || combinedText.includes("급등주")) {
            typeBadgeStyle = "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
            typeBadgeLabel = "⚡ 실시간 주도 테마 레이더";
            cardBorderHover = "hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]";
            accentBorder = "border-l-4 border-l-amber-400";
            defaultCta = { href: "/theme", label: "주도 테마 맵 & 대장주 확인", icon: Zap, style: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30" };
        } 
        // [5순위: 기타 마켓 뉴스 및 시그널]
        else if (alert.type === 'crypto_bull' || combinedText.includes("코인") || combinedText.includes("비트코인")) {
            typeBadgeStyle = "bg-rose-500/20 text-rose-300 border-rose-500/40";
            typeBadgeLabel = "🔥 코인 불장 시그널";
            cardBorderHover = "hover:border-rose-500/40";
            accentBorder = "border-l-4 border-l-rose-400";
        } else if (alert.type === 'ipo_alert') {
            typeBadgeStyle = "bg-pink-500/20 text-pink-300 border-pink-500/40";
            typeBadgeLabel = "🎯 공모주 레이더";
            cardBorderHover = "hover:border-pink-500/40";
            accentBorder = "border-l-4 border-l-pink-400";
        } else if (['news_alert', 'news_naver', 'news_google', 'news'].includes(alert.type)) {
            typeBadgeStyle = "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
            typeBadgeLabel = "📰 마켓 헤드라인";
            cardBorderHover = "hover:border-cyan-500/40";
            accentBorder = "border-l-4 border-l-cyan-400";
        } else if (combinedText.includes("시그널") || combinedText.includes("내일 장") || combinedText.includes("미국장")) {
            typeBadgeStyle = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
            typeBadgeLabel = "🚦 글로벌 마켓 시그널";
            cardBorderHover = "hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]";
            accentBorder = "border-l-4 border-l-emerald-400";
            defaultCta = { href: "/signals", label: "글로벌 마켓 시그널 확인", icon: Compass, style: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30" };
        } else if (combinedText.includes("리포트") || combinedText.includes("vip") || combinedText.includes("인사이트")) {
            typeBadgeStyle = "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]";
            typeBadgeLabel = "💎 VIP 프리미엄 리포트";
            cardBorderHover = "hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]";
            accentBorder = "border-l-4 border-l-purple-400";
            defaultCta = { href: "/premium", label: "VIP 프리미엄 리포트 열람", icon: Crown, style: "bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border-purple-500/30" };
        }

        const cardContent = (
            <div className={`relative bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-black border border-white/10 ${accentBorder} ${cardBorderHover} rounded-3xl p-5 md:p-6 transition-all duration-300 shadow-2xl w-full text-left overflow-hidden group`}>
                {/* Header Row: Type Badge + Market Badge + Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5 pb-3 border-b border-white/5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${typeBadgeStyle}`}>
                            {typeBadgeLabel}
                        </span>
                        {marketBadge && (
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black border font-mono tracking-tight shadow-sm ${marketBadge.style}`}>
                                {marketBadge.label}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-400">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {alert.timestamp && alert.timestamp.seconds
                            ? new Date(alert.timestamp.seconds * 1000).toLocaleString("ko-KR", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                              })
                            : "최근"}
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-base md:text-lg font-black text-white group-hover:text-amber-200 transition-colors leading-snug mb-2.5">
                    {alert.title}
                </h3>

                {/* Body Content */}
                {isPortfolio ? (
                    renderPortfolioCardContent(alert)
                ) : (
                    <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-normal">
                        {renderFormattedBody(alert.body)}
                    </div>
                )}

                {/* Action Buttons for Disclosures / Stocks */}
                {isDisclosure ? (
                    <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-white/10">
                        {cleanSymbol && (
                            <Link 
                                href={`/discovery?q=${cleanSymbol}`} 
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 min-w-[130px] bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-300 border border-blue-500/30 text-center py-2.5 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-blue-400" />
                                종목 정밀 심층 분석
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        )}
                        {(dartUrl || targetUrl) && (
                            <Link 
                                href={targetUrl || dartUrl} 
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 min-w-[130px] bg-zinc-800/80 hover:bg-zinc-700/80 text-gray-200 border border-white/10 text-center py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                            >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                                공시 원문 보기
                            </Link>
                        )}
                    </div>
                ) : !isPortfolio && (
                    <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between">
                        {targetUrl ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                                <span>상세 내용 확인하기</span>
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        ) : defaultCta ? (
                            <Link
                                href={defaultCta.href}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-full py-2.5 px-4 rounded-xl border text-xs md:text-sm font-bold transition-all flex items-center justify-between shadow-sm active:scale-95 cursor-pointer ${defaultCta.style}`}
                            >
                                <span className="flex items-center gap-2">
                                    <defaultCta.icon className="w-4 h-4" />
                                    {defaultCta.label}
                                </span>
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        ) : null}
                    </div>
                )}
            </div>
        );

        // 카드 클릭 시 이동할 최종 목적지 URL (통합 대시보드로 떨어지지 않도록 정밀 계산)
        const finalHref = targetUrl || (cleanSymbol ? `/discovery?q=${cleanSymbol}` : (defaultCta?.href || '/discovery'));

        if (finalHref.startsWith("http")) {
            return (
                <a key={alert.id} href={finalHref} target="_blank" rel="noopener noreferrer" className="block cursor-pointer">
                    {cardContent}
                </a>
            );
        } else {
            return (
                <Link key={alert.id} href={finalHref} className="block cursor-pointer">
                    {cardContent}
                </Link>
            );
        }
    };

    // Filter Navigation Tabs (관리자 로그인 시 '👑 관리자 알림' 탭 추가)
    const baseTabs = [
        { id: "all", label: "전체 브리핑", icon: Layers },
        { id: "disclosure", label: "공시 & 세력 수급", icon: Zap },
        { id: "news", label: "마켓 뉴스", icon: Globe },
        { id: "portfolio", label: "내 관심종목", icon: Crown },
        { id: "system", label: "서비스 공지/운영", icon: ShieldCheck }
    ];

    const tabs = isAdmin 
        ? [...baseTabs, { id: "admin", label: "👑 관리자 알림", icon: ShieldAlert }]
        : baseTabs;

    const filteredAlerts = alerts.filter(alert => {
        const titleText = (alert.title || '').trim();
        const isAdminAlert = ['admin_report', 'ping_test', 'system_error', 'health_check', 'visitor_report', 'daily_admin_report', 'admin'].includes(alert.type) || 
            titleText.includes('[관리자]') || titleText.includes('[시스템 보고]') || titleText.includes('[일일 보고]') || titleText.includes('[방문자 보고]') || titleText.includes('방문자') || titleText.includes('일일 운영 보고서');

        // 1. 관리자 전용 알림은 비관리자에게 절대 노출 금지
        if (isAdminAlert && !isAdmin) return false;

        // 2. 관리자 탭 선택 시: 관리자 알림만 집중 표시
        if (activeTab === "admin") return isAdminAlert;

        // 3. 운영 알림 탭 선택 시: 관리자용 보고서는 완전 제외하고, 순수 일반 서비스 공지/업데이트만 표시!
        if (activeTab === "system") {
            if (isAdminAlert) return false;
            const isSystemNotice = ['system_alert', 'notice', 'announcement', 'service_update', 'update'].includes(alert.type) ||
                titleText.includes('[공지]') || titleText.includes('[안내]') || titleText.includes('[업데이트]') || titleText.includes('[점검]');
            return isSystemNotice;
        }

        // 4. 일반 탭(전체 브리핑, 공시, 뉴스, 내 관심종목)에서는 관리자 보고서 완전 제외
        if (isAdminAlert) {
            return false;
        }

        const isDisclosure = ['disclosure_alert', 'large_holding', 'disclosure', 'sec_insider_trading', 'sec_13f', 'sec_disclosure', 'insider_trading', 'whale_accumulation', 'whale_alert'].includes(alert.type);
        const isNews = ['news_alert', 'news_naver', 'news_google', 'news'].includes(alert.type);
        const isPrice = ['target_price_alert', 'price_alert', 'crypto_bull', 'ipo_alert'].includes(alert.type);

        if (activeTab === "news") return isNews;

        let symbolMatch = false;
        if (alert.symbol && watchlistSymbols.includes(alert.symbol)) {
            symbolMatch = true;
        } else {
            for (const name of watchlistNames) {
                if (name && (alert.title?.includes(name) || alert.body?.includes(name))) {
                    symbolMatch = true;
                    break;
                }
            }
        }

        if (activeTab === "disclosure") {
            if (!isDisclosure) return false;
            if (disclosureFilter === 'kr') {
                return ['disclosure_alert', 'large_holding', 'disclosure', 'insider_trading', 'whale_accumulation', 'whale_alert'].includes(alert.type);
            }
            if (disclosureFilter === 'us') {
                return ['sec_insider_trading', 'sec_13f', 'sec_disclosure'].includes(alert.type);
            }
            return true;
        }
        
        if (activeTab === "portfolio") {
            const isPortfolioAlert = ['portfolio_summary', 'dividend_alert', 'morning_briefing'].includes(alert.type);
            return isPortfolioAlert || ((isNews || isDisclosure || isPrice) && symbolMatch);
        }
        
        return true;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, disclosureFilter]);

    const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE);
    const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen bg-[#07080d] text-gray-100 pb-20 font-sans relative overflow-hidden">
            <Header />

            {/* Ambient Background Glowing Auroras */}
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
            <div className="fixed bottom-10 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

            <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-7">
                
                {/* Prestige Top Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="relative p-3.5 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.35)] text-white font-black flex items-center justify-center shrink-0">
                            <BellRing className="w-7 h-7 text-white drop-shadow-sm" />
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-400"></span>
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} />
                                    LIVE RADAR STREAM
                                </span>
                                <span className="text-xs font-mono font-bold text-gray-400">
                                    REAL-TIME INTELLIGENCE
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug">
                                실시간 마켓 인텔리전스 알림 센터
                            </h1>
                            <p className="text-xs md:text-sm text-gray-400 mt-1 font-medium">
                                DART·SEC 공시, 큰손 세력 매집, 실시간 급등락 시그널을 초고속으로 스트리밍합니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 탭 버튼 영역 */}
                <div className="flex items-center gap-2 p-1.5 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto scrollbar-none shadow-xl">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                                    isActive
                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black shadow-lg shadow-blue-500/25"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* 공시 탭 전용 서브 필터 */}
                {activeTab === 'disclosure' && (
                    <div className="flex items-center gap-2 p-1 bg-zinc-950/80 border border-white/5 rounded-2xl w-fit">
                        <button
                            onClick={() => setDisclosureFilter('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                disclosureFilter === 'all'
                                    ? "bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            전체 공시
                        </button>
                        <button
                            onClick={() => setDisclosureFilter('kr')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                disclosureFilter === 'kr'
                                    ? "bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            🇰🇷 국내 (DART)
                        </button>
                        <button
                            onClick={() => setDisclosureFilter('us')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                disclosureFilter === 'us'
                                    ? "bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-sm"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            🇺🇸 해외 (SEC)
                        </button>
                    </div>
                )}

                {/* 게스트 로그인 배너 */}
                {!user && (
                    <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-transparent border border-blue-500/30 rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                        <div className="flex items-center gap-3.5 text-center sm:text-left">
                            <div className="p-3 bg-blue-500/15 rounded-2xl text-blue-400 shrink-0 hidden sm:flex">
                                <Crown className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-base font-black text-white">개인 맞춤 관심종목 실시간 시그널 알림</h3>
                                <p className="text-xs text-gray-300 mt-0.5">로그인하시면 내 관심종목의 공시, 급등락, 목표가 돌파 푸시를 즉시 수신할 수 있습니다.</p>
                            </div>
                        </div>
                        <Link href="/login" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-500/20 whitespace-nowrap active:scale-95">
                            3초 로그인하기
                        </Link>
                    </div>
                )}

                {/* 알림 목록 영역 */}
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-80 gap-3">
                        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-mono text-blue-400/80 animate-pulse">STREAMING RADAR SIGNALS...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6">
                        <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
                        <h3 className="text-lg font-black text-rose-300">알림을 불러오지 못했습니다</h3>
                        <p className="text-xs text-rose-400 mt-1">{errorMsg}</p>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center bg-zinc-950/80 border border-white/5 rounded-3xl shadow-2xl p-6">
                        <div className="w-16 h-16 mb-4 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                            📭
                        </div>
                        <h3 className="text-lg font-black text-gray-200 mb-1">
                            해당 분류의 실시간 알림이 없습니다.
                        </h3>
                        <p className="text-xs md:text-sm text-gray-400 font-medium max-w-sm leading-relaxed">
                            새로운 중요 공시나 시장 시그널이 포착되면 가장 먼저 실시간으로 알려드릴게요!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {paginatedAlerts.map((alert, idx) => {
                            const isHighValue = alert.type === 'insider_trading' || alert.type === 'large_holding';
                            const isFirstHighValue = isHighValue && idx === filteredAlerts.findIndex(a => a.type === 'insider_trading' || a.type === 'large_holding');
                            return (
                                <React.Fragment key={alert.id}>
                                    {renderAlertCard(alert)}
                                    {isFirstHighValue && (
                                        <div className="bg-zinc-950/80 border border-white/5 rounded-3xl p-4 flex flex-col items-center justify-center my-6 shadow-xl">
                                            <p className="text-[11px] text-gray-500 mb-2 font-semibold">스폰서 광고</p>
                                            <KakaoAdFit adUnit="DAN-4lZ2zEzbyDJ1Yva6" adWidth="300" adHeight="250" />
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        
                        {/* 페이지네이션 */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center space-x-2 mt-10 pt-4 border-t border-white/10">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white disabled:opacity-30 transition-all text-xs font-bold cursor-pointer"
                                >
                                    이전
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(currentPage - p) <= 2)
                                    .map((p, idx, arr) => (
                                        <React.Fragment key={p}>
                                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                <span className="text-gray-600 px-1 font-bold">...</span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                                                    currentPage === p 
                                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/40" 
                                                    : "bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-gray-400 hover:text-white"
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }

                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white disabled:opacity-30 transition-all text-xs font-bold cursor-pointer"
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
