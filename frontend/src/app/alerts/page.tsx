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
    Search, Filter, Globe, Crown, ShieldAlert, Lock, FileText
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
            (user as any).role === 'admin' || 
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

    const renderFormattedBody = (text: string, alert?: any) => {
        text = formatUsdToKrwInText(text);
        if (!text) return null;

        // Separate market interpretation block, cta, and disclaimer if present
        let marketInterpretation = "";
        let disclaimerText = "";
        const mainLines: string[] = [];

        const lines = text.split('\n');
        for (const line of lines) {
            let trimmed = line.trim();
            if (!trimmed) continue;

            // [사용자 요청] 확인안내 문구 완전 제거 (👉 터치하여..., 🔍 알림을 누르면... 등)
            if (trimmed.startsWith("🔍") || trimmed.startsWith("👉") || trimmed.includes("터치하여") || trimmed.includes("알림을 누르면") || trimmed.includes("클릭하여")) {
                continue;
            }

            // 법적 면책 문구 분리
            if (trimmed.startsWith("※") || (trimmed.startsWith("(") && (trimmed.includes("투자 권유가 아닙니다") || trimmed.includes("투자권유")))) {
                disclaimerText = trimmed;
                continue;
            }

            // 별도 라인 형태의 [시장해석] 추출
            if (trimmed.startsWith("💡 [시장해석]") || trimmed.startsWith("💡 [시장 해석]") || trimmed.startsWith("💡 해석:") || trimmed.startsWith("[시장해석]")) {
                const interp = trimmed
                    .replace(/^(?:▪️|▪|[·\s])*💡\s*(?:\[시장\s*해석\]|해석:?)\s*/, '')
                    .replace(/^[\[\(]?시장\s*해석[\]\)]?\s*/, '')
                    .replace(/[👉🔍※].*$/, '')
                    .trim();
                if (interp && !marketInterpretation) {
                    marketInterpretation = interp;
                }
                continue;
            }

            // 본문 라인 내부에 포함된 💡 해석 문구 분리/제거 (예: 수급정보 · ▪️ 💡 해석: ...)
            const embeddedMatch = trimmed.match(/(?:[·\s]*▪️?|\s)*💡\s*(?:\[시장\s*해석\]|해석:?)\s*(.+)$/);
            if (embeddedMatch) {
                if (!marketInterpretation) {
                    marketInterpretation = embeddedMatch[1].replace(/[👉🔍※].*$/, '').trim();
                }
                // 본문 팩트 줄에서는 해석 내용을 완전히 제거
                trimmed = trimmed.replace(/(?:[·\s]*▪️?|\s)*💡\s*(?:\[시장\s*해석\]|해석:?).*$/, '').trim();
            }

            // 앞머리 중복 불릿 및 불필요한 접두사 정리 (📌 ▪️ 📊 수급: -> 📌)
            trimmed = trimmed.replace(/^(?:📌|▪️|▪|📊|📋|\s)+/, '').trim();
            trimmed = trimmed.replace(/^수급:\s*/, '').trim();
            trimmed = trimmed.replace(/^공시:\s*/, '').trim();

            if (trimmed) {
                mainLines.push(trimmed.startsWith("📌") ? trimmed : `📌 ${trimmed}`);
            }
        }

        // 사용자 요청: 내부자/경영진 매수 및 자사주 매입 해석을 직관적인 문구로 전면 통일 적용
        const isSell = (alert?.title && (alert.title.includes("매도") || alert.title.includes("처분"))) || text.includes("매도") || text.includes("처분") || marketInterpretation.includes("매도");
        const isInsiderOrBuy = marketInterpretation.includes("경영진 지분 매매") ||
                               marketInterpretation.includes("방향성 확인 필요") ||
                               marketInterpretation.includes("방향성 점검 권장") ||
                               marketInterpretation.includes("대표/경영진") ||
                               marketInterpretation.includes("실적 자신감 신호") ||
                               marketInterpretation.includes("책임 경영 및 주가 방어") ||
                               marketInterpretation.includes("주가 방어 및 주주가치") ||
                               marketInterpretation.includes("펀더멘털 평가의 핵심 지표") ||
                               marketInterpretation.includes("지배구조 개편 및 방향성") ||
                               (((alert?.title && (alert.title.includes("내부자") || alert.title.includes("자사주 매입") || alert.title.includes("자사주 취득") || alert.title.includes("지분변동"))) || text.includes("자사주 매입") || text.includes("자기주식 직접 매수") || text.includes("자사주 취득")) && !isSell);

        if (isInsiderOrBuy && !isSell) {
            marketInterpretation = "경영진 직접 매수로 사업 실적에 대한 강한 자신감 표명";
        }

        // [사용자 요청] 뉴스, 순수 수급 특보, 스터디/교육/공지 알림은 불필요한 시장해석 황금 박스 제거
        // 단, 유상증자/공급계약 등 진짜 공시는 초보자를 위해 시장해석 황금 박스를 유지해야 함!
        const hasDisclosureKey = Boolean(
            (alert?.title && (alert.title.includes("공시") || alert.title.includes("증자") || alert.title.includes("공급계약") || alert.title.includes("전환사채") || alert.title.includes("자사주") || alert.title.includes("자기주식") || alert.title.includes("실적") || alert.title.includes("배당") || alert.title.includes("내부자") || alert.title.includes("지분"))) || 
            alert?.dart_url || 
            (alert?.url && (alert.url.includes('dart') || alert.url.includes('disclosure'))) ||
            ['disclosure_alert', 'dart_disclosure', 'insider_trading', 'large_holding', 'sec_insider_trading', 'sec_disclosure'].includes(alert?.type || '')
        );

        const isNewsAlert = !hasDisclosureKey && alert && (
            ['news_alert', 'news_naver', 'news_google', 'news'].includes(alert.type) ||
            (alert.title && (alert.title.includes("뉴스") || (alert.title.includes("속보") && !alert.title.includes("공시"))))
        );
        const isSupplyAlert = !hasDisclosureKey && alert && (
            ['whale_accumulation', 'surge'].includes(alert.type) ||
            (alert.type === 'whale_alert' && !hasDisclosureKey) ||
            (alert.title && (alert.title.includes("수급") || alert.title.includes("세력") || alert.title.includes("폭풍 매수") || alert.title.includes("고래") || alert.title.includes("외국인") || alert.title.includes("기관")))
        );
        const isStudyOrNotice = alert && (
            ['study', 'theory', 'guide', 'notice', 'system'].includes(alert.type) ||
            (alert.title && (alert.title.includes("스터디") || alert.title.includes("1타 강사") || alert.title.includes("이론") || alert.title.includes("가이드") || alert.title.includes("공지") || alert.title.includes("안내")))
        );

        // 형식적인 깡통 문구 및 수급 동어반복 문구 필터링 (공시 유의미 해석은 안전하게 보존)
        const isGenericInterp = !hasDisclosureKey && (
            marketInterpretation.includes("주요 언론 보도") || 
            marketInterpretation.includes("시장 관심 테마") || 
            marketInterpretation.includes("시장 핵심 데이터 변동 감지") ||
            marketInterpretation.includes("스마트머니 집중 유입") ||
            marketInterpretation.includes("스마트머니 집중 매집") ||
            marketInterpretation.includes("스마트머니 유입") ||
            marketInterpretation.includes("단기 모멘텀") ||
            marketInterpretation.includes("대량 거래 동반") ||
            marketInterpretation.includes("급등 포착") ||
            marketInterpretation.includes("세부 분석 확인") ||
            marketInterpretation.includes("정규장 개장") ||
            marketInterpretation.includes("정규장 마감") ||
            text.includes("시가입니다") ||
            text.includes("관심종목 시가") ||
            (alert.title && (alert.title.includes("시가") || alert.title.includes("시초가") || alert.title.includes("급등 포착")))
        );

        if (isNewsAlert || isSupplyAlert || isStudyOrNotice || isGenericInterp) {
            marketInterpretation = "";
        }

        const mainText = mainLines.join('\n').trim();

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
                {mainText && (
                    <div className="text-xs md:text-sm text-zinc-200 leading-relaxed font-medium">
                        {formatSegment(mainText)}
                    </div>
                )}
                {marketInterpretation && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 mt-2 flex items-start gap-2.5 shadow-sm">
                        <div className="p-1 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-xs md:text-sm text-amber-200 leading-relaxed font-semibold">
                            {marketInterpretation}
                        </p>
                    </div>
                )}
                {disclaimerText && (
                    <div className="text-[11px] text-zinc-500 font-normal mt-1 border-t border-white/5 pt-1.5">
                        {disclaimerText}
                    </div>
                )}
            </div>
        );
    };

    // Render Luxury Alert Card
    
    // Render Dedicated Portfolio Summary Micro-Bento with Rich Details (Avg Price, Eval Amount, Today PnL, AI Diagnosis)
    const renderPortfolioCardContent = (alert: any) => {
        const text = alert.body || '';
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        
        let totalReturn = "";
        let totalProfit = "";
        let mvpText = "";
        let worstText = "";
        let supplyText = "";
        let disclaimer = "";

        interface PortfolioStockItem {
            name: string;
            cleanSymbol: string;
            qty: string;
            qtyNum: number;
            price: string;
            priceNum: number;
            dayChangeStr: string;
            dayChangeVal: number;
            dayChangePct: number;
            isDayUp: boolean;
            profitStr: string;
            profitNum: number;
            profitPctStr: string;
            profitPct: number;
            isProfitUp: boolean;
            avgBuyPrice: number;
            evalAmount: number;
            investAmount: number;
            todayProfitVal: number;
            subPurchases: string[];
            insight: string;
        }

        const stockItems: PortfolioStockItem[] = [];
        let currentItem: PortfolioStockItem | null = null;

        lines.forEach((line: string) => {
            const cleanLine = line.trim();

            if (cleanLine.startsWith('총 누적 수익률') || cleanLine.startsWith('총 수익률') || (cleanLine.includes('수익률:') && !cleanLine.startsWith('•') && !cleanLine.startsWith('↳'))) {
                totalReturn = cleanLine.replace(/^.*?수익률[:\s]*/, '').trim();
            } else if ((cleanLine.startsWith('💰 총 누적 수익') || cleanLine.startsWith('총 누적 수익') || cleanLine.startsWith('💰 총 수익:') || cleanLine.startsWith('총 수익:')) && !cleanLine.startsWith('↳') && !cleanLine.includes('주)')) {
                totalProfit = cleanLine.replace(/^.*?(?:총\s*누적\s*수익|총\s*수익)[:\s]*/, '').replace(/\(.*?\)/, '').trim();
            } else if (cleanLine.includes('오늘의 MVP') || (cleanLine.includes('🏆') && cleanLine.includes('MVP'))) {
                mvpText = cleanLine.replace(/^.*?MVP[:\s]*/, '').trim();
            } else if (cleanLine.includes('약세 종목') || (cleanLine.includes('⚠️') && cleanLine.includes('약세'))) {
                worstText = cleanLine.replace(/^.*?약세\s*종목[:\s]*/, '').trim();
            } else if (cleanLine.includes('수급 합산') || (cleanLine.includes('🌊') && cleanLine.includes('수급'))) {
                supplyText = cleanLine.replace(/^.*?수급\s*합산[:\s]*/, '').trim();
            } else if (cleanLine.startsWith('(') && cleanLine.endsWith(')')) {
                disclaimer = cleanLine;
            } else if (cleanLine.startsWith('•') || (cleanLine.includes(':') && !cleanLine.startsWith('↳') && !cleanLine.includes('[') && !cleanLine.includes('수익률') && !cleanLine.includes('수익:'))) {
                // 새로운 종목 행 파싱 (예: • 삼성중공업(7주): 21,350원 (▼251원 / ▼1.2%) 또는 2만 1,350원)
                const parts = cleanLine.split(':');
                const nameWithQty = parts[0].replace('•', '').trim();
                let stockName = nameWithQty;
                let stockQty = "";
                let qtyNum = 1;
                const qtyMatch = nameWithQty.match(/\(([\d\.]+주)\)/);
                if (qtyMatch) {
                    stockQty = qtyMatch[1];
                    stockName = nameWithQty.replace(/\([\d\.]+주\)/, '').trim();
                    const qn = parseFloat(stockQty.replace('주', ''));
                    if (!isNaN(qn) && qn > 0) qtyNum = qn;
                }

                const detailPart = parts.slice(1).join(':').trim();
                
                // 가격 파싱: "2만 1,350원", "21,350원", "$152.50", "약 21,350원" 등 완벽 지원
                let priceStr = "";
                const priceMatch = detailPart.match(/^([\d,]+만\s*[\d,]*원|약\s*[\d,]+만?\s*[\d,]*원|[\d,]+원|\$[\d,\.]+|[\d,]+)/);
                if (priceMatch) {
                    priceStr = priceMatch[1].trim();
                } else {
                    priceStr = detailPart.split('(')[0].trim();
                }

                // 만약 "2만 1,350원"처럼 한글 만이 섞여있다면 표준 "21,350원" 숫자로 변환 복원
                const manMatch = priceStr.match(/(\d+)만\s*([\d,]+)원/);
                if (manMatch) {
                    const fullVal = parseInt(manMatch[1]) * 10000 + parseInt(manMatch[2].replace(/,/g, ''));
                    priceStr = `${fullVal.toLocaleString()}원`;
                }

                const chgMatch = detailPart.match(/\((.*?)\)/);
                const dayChangeStr = chgMatch ? chgMatch[1] : "";
                
                let dayChangePct = 0;
                let isDayUp = false;
                const pctMatch = dayChangeStr.match(/([▲▼\-+]?[\d\.]+)%/);
                if (pctMatch) {
                    const clean = pctMatch[1].replace('▲', '+').replace('▼', '-').replace('+', '');
                    dayChangePct = parseFloat(clean) || 0;
                    isDayUp = dayChangePct >= 0;
                }

                let dayChangeVal = 0;
                const valMatch = dayChangeStr.match(/([▲▼\-+]?[\d,]+)원/);
                if (valMatch) {
                    const cleanVal = valMatch[1].replace(/[▲+]/g, '').replace('▼', '-').replace(/,/g, '');
                    dayChangeVal = parseFloat(cleanVal) || 0;
                }

                // 종목 심볼 매핑
                let cleanSym = "";
                const sIdx = watchlistNames.findIndex(n => n === stockName);
                if (sIdx !== -1 && watchlistSymbols[sIdx]) {
                    cleanSym = watchlistSymbols[sIdx].split('.')[0];
                }

                const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;

                currentItem = {
                    name: stockName,
                    cleanSymbol: cleanSym,
                    qty: stockQty,
                    qtyNum: qtyNum,
                    price: priceStr,
                    priceNum: priceNum,
                    dayChangeStr: dayChangeStr,
                    dayChangeVal: dayChangeVal,
                    dayChangePct: dayChangePct,
                    isDayUp: isDayUp,
                    profitStr: "",
                    profitNum: 0,
                    profitPctStr: "",
                    profitPct: 0,
                    isProfitUp: false,
                    avgBuyPrice: 0,
                    evalAmount: 0,
                    investAmount: 0,
                    todayProfitVal: 0,
                    subPurchases: [],
                    insight: ""
                };
                stockItems.push(currentItem);
            } else if (cleanLine.startsWith('↳') || cleanLine.includes('총 수익:')) {
                if (currentItem) {
                    const pClean = cleanLine.replace(/^.*?총\s*수익[:\s]*/, '').trim();
                    const pctMatch = pClean.match(/\((.*?)\)/);
                    if (pctMatch) {
                        currentItem.profitPctStr = pctMatch[1];
                        currentItem.profitStr = pClean.replace(/\(.*?\)/, '').trim();
                        currentItem.isProfitUp = !currentItem.profitPctStr.includes('-') && !currentItem.profitStr.includes('-');
                    } else {
                        currentItem.profitStr = pClean;
                        currentItem.isProfitUp = !currentItem.profitStr.includes('-');
                    }

                    // "5만 400원" 형태의 한글 만 단위를 숫자로 복원
                    let pNum = 0;
                    const pMan = currentItem.profitStr.match(/([+-]?\d+)만\s*([\d,]+)원/);
                    if (pMan) {
                        const isMinus = currentItem.profitStr.includes('-');
                        const rawVal = Math.abs(parseInt(pMan[1])) * 10000 + parseInt(pMan[2].replace(/,/g, ''));
                        pNum = isMinus ? -rawVal : rawVal;
                        currentItem.profitStr = `${pNum > 0 ? '+' : ''}${pNum.toLocaleString()}원`;
                    } else {
                        const isMinus = currentItem.profitStr.includes('-');
                        const rawVal = parseFloat(currentItem.profitStr.replace(/[^0-9.]/g, '')) || 0;
                        pNum = isMinus ? -rawVal : rawVal;
                    }
                    currentItem.profitNum = pNum;

                    const pPct = parseFloat(currentItem.profitPctStr.replace(/[^0-9.-]/g, '')) || 0;
                    currentItem.profitPct = pPct;

                    // 평가액, 원금, 평단가 계산
                    if (currentItem.priceNum > 0 && currentItem.qtyNum > 0) {
                        currentItem.evalAmount = Math.round(currentItem.priceNum * currentItem.qtyNum);
                        currentItem.investAmount = currentItem.evalAmount - currentItem.profitNum;
                        if (currentItem.investAmount > 0) {
                            currentItem.avgBuyPrice = Math.round(currentItem.investAmount / currentItem.qtyNum);
                        } else {
                            currentItem.avgBuyPrice = currentItem.priceNum;
                        }
                    }

                    // 당일 하루 손익 계산
                    if (currentItem.dayChangeVal !== 0 && currentItem.qtyNum > 0) {
                        currentItem.todayProfitVal = Math.round(currentItem.dayChangeVal * currentItem.qtyNum);
                    }

                    // 종목별 마감 인사이트 코멘트 생성
                    if (currentItem.isProfitUp) {
                        currentItem.insight = `수익 구간을 순항 중입니다. 평균 매수가(${currentItem.avgBuyPrice.toLocaleString()}원) 대비 안정적인 흐름이며, 분할 익절 전략 및 추세 지속 여부를 점검하세요.`;
                    } else if (currentItem.profitPct <= -20) {
                        currentItem.insight = `평균 매수가(${currentItem.avgBuyPrice.toLocaleString()}원) 대비 단기 낙폭 과대 구간입니다. 조급한 추가 매수보다는 지지선 확인 및 외국인·기관 메이저 수급 유입 전환을 확인하세요.`;
                    } else {
                        currentItem.insight = `단기 숨고르기 조정 국면입니다. 평균 매수가(${currentItem.avgBuyPrice.toLocaleString()}원) 근처 지지 여부와 거래량 회전율을 확인하며 차분히 대응하세요.`;
                    }
                }
            } else if (cleanLine.includes('차]') || cleanLine.startsWith('[')) {
                if (currentItem) {
                    currentItem.subPurchases.push(cleanLine);
                }
            }
        });

        if (!mvpText && stockItems.length > 0) {
            const sorted = [...stockItems].sort((a, b) => b.dayChangePct - a.dayChangePct);
            if (sorted[0] && sorted[0].dayChangePct > 0) {
                mvpText = `${sorted[0].name} (${sorted[0].dayChangePct > 0 ? '+' : ''}${sorted[0].dayChangePct}%)`;
            }
            if (sorted[sorted.length - 1] && sorted[sorted.length - 1].dayChangePct < 0 && sorted[sorted.length - 1] !== sorted[0]) {
                worstText = `${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].dayChangePct}%)`;
            }
        }

        // 전체 포트폴리오 메트릭 집계
        const totalEvalSum = stockItems.reduce((acc, cur) => acc + (cur.evalAmount || 0), 0);
        const totalInvestSum = stockItems.reduce((acc, cur) => acc + (cur.investAmount || 0), 0);
        const totalTodayPnL = stockItems.reduce((acc, cur) => acc + (cur.todayProfitVal || 0), 0);

        // 한글 "5만 400원" 형태의 총수익도 정상 포맷 복원
        let displayTotalProfit = totalProfit;
        const totManMatch = totalProfit.match(/([+-]?\d+)만\s*([\d,]+)원/);
        if (totManMatch) {
            const isMinus = totalProfit.includes('-');
            const rawVal = Math.abs(parseInt(totManMatch[1])) * 10000 + parseInt(totManMatch[2].replace(/,/g, ''));
            displayTotalProfit = `${isMinus ? '-' : '+'}${rawVal.toLocaleString()}원`;
        }

        const isNegative = totalReturn.includes('-') || totalProfit.includes('-');

        return (
            <div className="space-y-4">
                {/* 1. 상단 종합 자산 브리핑 벤토 카드 (정보량 3배 업그레이드) */}
                <div className="p-4 md:p-5 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-2xl space-y-3.5 shadow-xl">
                    {/* 상단 2분할 메인 KPI (수익률 + 평가손익) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-zinc-900/90 border border-white/5 rounded-xl space-y-1">
                            <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                                총 누적 수익률
                            </span>
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-lg md:text-2xl font-black font-mono tracking-tight ${
                                    isNegative ? 'text-blue-400' : 'text-red-400'
                                }`}>
                                    {totalReturn || '0.00%'}
                                </span>
                            </div>
                        </div>
                        <div className="p-3.5 bg-zinc-900/90 border border-white/5 rounded-xl space-y-1">
                            <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                누적 평가 손익
                            </span>
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-lg md:text-2xl font-black font-mono tracking-tight ${
                                    isNegative ? 'text-blue-400' : 'text-red-400'
                                }`}>
                                    {displayTotalProfit || '0원'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 하단 미니 서브 스탯 바 (총 평가액 vs 투자원금 & 당일 하루 손익) */}
                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-3">
                            {totalEvalSum > 0 && (
                                <div>
                                    <span className="text-gray-400 text-[11px]">총 평가액 </span>
                                    <span className="text-zinc-200 font-bold font-mono">{totalEvalSum.toLocaleString()}원</span>
                                </div>
                            )}
                            {totalInvestSum > 0 && (
                                <div className="text-gray-500">
                                    <span className="text-[11px]">원금 </span>
                                    <span className="font-mono text-zinc-400">{totalInvestSum.toLocaleString()}원</span>
                                </div>
                            )}
                        </div>

                        {totalTodayPnL !== 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-gray-400">오늘 하루 변동</span>
                                <span className={`font-black font-mono px-2 py-0.5 rounded-lg border text-[11px] ${
                                    totalTodayPnL > 0 
                                        ? 'bg-red-500/15 text-red-300 border-red-500/30' 
                                        : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                }`}>
                                    {totalTodayPnL > 0 ? '+' : ''}{totalTodayPnL.toLocaleString()}원
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. 오늘의 MVP & 약세 종목 */}
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

                {/* 3. 외인·기관 스마트머니 수급 합산 */}
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

                {/* 4. 종목별 마감 현황 (디테일 럭셔리 카드 리스트) */}
                {stockItems.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">종목별 상세 결산</p>
                            <span className="text-[11px] text-zinc-500 font-mono">총 {stockItems.length}개 종목</span>
                        </div>
                        
                        <div className="space-y-3">
                            {stockItems.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="p-4 md:p-5 bg-zinc-900/95 hover:bg-zinc-900 border border-white/10 hover:border-amber-500/30 rounded-2xl transition-all space-y-3.5 shadow-lg"
                                >
                                    {/* 상단 헤더: 종목명 + 보유 수량 뱃지 + 당일 마감 종가 (잘림 없이 크고 정확하게 표기) */}
                                    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-base md:text-lg font-black text-white">{item.name}</span>
                                            {item.qty && (
                                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                    {item.qty} 보유
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-base md:text-lg font-black font-mono text-zinc-100">
                                                {item.price || '종가 집계'}
                                            </div>
                                            {item.dayChangeStr && (
                                                <div className={`text-xs font-bold font-mono ${item.isDayUp ? 'text-red-400' : 'text-blue-400'}`}>
                                                    {item.dayChangeStr}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 디테일 스탯 3분할 칩 (평균 매수가, 총 평가금액, 당일 변동 손익 + 직관적 서브 설명) */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-white/5 text-center flex flex-col justify-between">
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-medium">내 평균단가</p>
                                                <p className="text-xs md:text-sm font-black font-mono text-zinc-200 mt-0.5">
                                                    {item.avgBuyPrice > 0 ? `${item.avgBuyPrice.toLocaleString()}원` : '-'}
                                                </p>
                                            </div>
                                            <p className="text-[9px] text-zinc-500 mt-1">내가 산 1주당 평균가</p>
                                        </div>
                                        <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-white/5 text-center flex flex-col justify-between">
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-medium">총 평가금액</p>
                                                <p className="text-xs md:text-sm font-black font-mono text-zinc-200 mt-0.5">
                                                    {item.evalAmount > 0 ? `${item.evalAmount.toLocaleString()}원` : '-'}
                                                </p>
                                            </div>
                                            <p className="text-[9px] text-zinc-500 mt-1">현재 시세 기준 내 주식</p>
                                        </div>
                                        <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-white/5 text-center flex flex-col justify-between">
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-medium">오늘 하루 손익</p>
                                                <p className={`text-xs md:text-sm font-black font-mono mt-0.5 ${
                                                    item.todayProfitVal > 0 ? 'text-red-400' : item.todayProfitVal < 0 ? 'text-blue-400' : 'text-zinc-400'
                                                }`}>
                                                    {item.todayProfitVal !== 0 ? `${item.todayProfitVal > 0 ? '+' : ''}${item.todayProfitVal.toLocaleString()}원` : '-'}
                                                </p>
                                            </div>
                                            <p className="text-[9px] text-zinc-500 mt-1">오늘 하루 계좌 변동</p>
                                        </div>
                                    </div>

                                    {/* 내 누적 평가손익 & 수익률 하이라이트 박스 (직관적 투자 설명 바 포함) */}
                                    {(item.profitStr || item.profitPctStr) && (
                                        <div className={`p-3.5 rounded-xl border space-y-2 transition-colors ${
                                            item.isProfitUp 
                                                ? 'bg-red-500/10 border-red-500/25 text-red-300' 
                                                : 'bg-blue-500/10 border-blue-500/25 text-blue-300'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-[10px] text-gray-400 font-medium">내 누적 평가손익</p>
                                                        <span className="text-[9px] text-gray-500 font-normal">(매수 이후 총 손익)</span>
                                                    </div>
                                                    <p className="text-base md:text-lg font-black font-mono tracking-tight mt-0.5">
                                                        {item.profitStr}
                                                    </p>
                                                </div>
                                                {item.profitPctStr && (
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-gray-400 font-medium mb-0.5">누적 수익률</p>
                                                        <span className={`text-xs md:text-sm font-black font-mono px-2.5 py-0.5 rounded-lg border inline-block ${
                                                            item.isProfitUp 
                                                                ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                                                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                                        }`}>
                                                            {item.profitPctStr}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                                                <span>투자원금 약 {item.investAmount > 0 ? `${(item.investAmount / 10000).toFixed(1)}만 원` : '-'} 기준</span>
                                                <span className={item.isProfitUp ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>
                                                    {item.isProfitUp ? '원금 대비 수익 실현 중' : '원금 대비 손실 조정 구간'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 디테일 마감 진단 가이드 */}
                                    {item.insight && (
                                        <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
                                            <span className="font-bold text-amber-300 shrink-0">💡 마감 진단</span>
                                            <span>{item.insight}</span>
                                        </div>
                                    )}

                                    {/* 종목별 빠른 액션 버튼 바 */}
                                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                                        <Link 
                                            href={item.cleanSymbol ? `/discovery?q=${item.cleanSymbol}` : `/discovery?q=${encodeURIComponent(item.name)}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-center py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                        >
                                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                            {item.name} 정밀 심층 분석
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Link>
                                        <Link 
                                            href="/watchlist"
                                            onClick={(e) => e.stopPropagation()}
                                            className="bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-white/10 text-center px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                                        >
                                            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                                            실시간 시세
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. 법적 고지 안내 */}
                <p className="text-[11px] text-gray-500 font-medium px-1">
                    {disclaimer || '(한국거래소 당일 정규장 종가 기준 단순 집계 통계 자료이며 투자 권유가 아닙니다)'}
                </p>

                {/* 6. 관심종목 포트폴리오 바로가기 액션 버튼 */}
                <div className="flex flex-wrap gap-2.5 pt-2 border-t border-white/10">
                    <Link 
                        href="/watchlist" 
                        className="flex-1 min-w-[140px] bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 text-amber-300 border border-amber-500/30 text-center py-2.5 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Crown className="w-4 h-4 text-amber-400" />
                        관심종목 포트폴리오 관리
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link 
                        href="/theme" 
                        className="bg-zinc-800/80 hover:bg-zinc-700/80 text-gray-300 border border-white/10 text-center px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Zap className="w-4 h-4 text-amber-400" />
                        주도 테마 맵
                    </Link>
                </div>
            </div>
        );
    };

    // Render Dedicated Morning Briefing Micro-Bento
    const renderMorningBriefingCardContent = (alert: any) => {
        const text = alert.body || '';
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const title = (alert.title || '').trim();

        // 1. 종목명 추출 (제목: "📰 삼성중공업 간추린 모닝 팩트" 또는 alert.symbol)
        let stockName = alert.symbol || alert.code || '';
        const titleMatch = title.match(/^(?:📰\s*)?([가-힣a-zA-Z0-9]+)\s*간추린\s*모닝/);
        if (titleMatch) {
            stockName = titleMatch[1];
        } else if (!stockName && title.includes('모닝 팩트')) {
            const m = title.replace('📰', '').replace('간추린', '').replace('모닝 팩트', '').replace(/[\[\]]/g, '').trim();
            if (m) stockName = m;
        }

        // 종목 코드(symbol) 정제 및 관심종목 매핑 보정
        const rawSymbol = alert.symbol || alert.code || '';
        let cleanSymbol = rawSymbol ? (rawSymbol.split('.')[0] || rawSymbol) : '';
        if (!cleanSymbol || !/^\d{6}$/.test(cleanSymbol)) {
            const foundIdx = watchlistNames.findIndex(n => n === stockName);
            if (foundIdx !== -1 && watchlistSymbols[foundIdx]) {
                cleanSymbol = watchlistSymbols[foundIdx].split('.')[0];
            }
        }

        // 2. 전일 종가 및 등락률 파싱
        let closePriceStr = "";
        let priceDiffStr = "";
        let changePctStr = "";
        let isPriceUp = false;

        // 3. 수급 데이터 파싱 (개인, 외인, 기관)
        let retailVol = "";
        let foreignerVol = "";
        let institutionVol = "";

        // 4. AI 요약 코멘트
        let aiSummary = "";

        // 5. 뉴스/팩트 리스트
        interface FactItem {
            tag: string;
            tagColor: string;
            text: string;
        }
        const facts: FactItem[] = [];

        lines.forEach((line: string) => {
            const clean = line.trim();

            // 종가 라인 파싱 (예: 📈 [전일 종가] 21,300원 (▼100원 / -0.47%) 또는 전일 종가: ...)
            if (clean.includes('전일 종가') || clean.includes('전일종가')) {
                const priceMatch = clean.match(/([\d,]+원?)/);
                if (priceMatch) closePriceStr = priceMatch[1];

                const diffMatch = clean.match(/\((.*?)\)/);
                if (diffMatch) {
                    const inner = diffMatch[1];
                    const parts = inner.split('/');
                    if (parts.length >= 2) {
                        priceDiffStr = parts[0].trim();
                        changePctStr = parts[1].trim();
                    } else {
                        changePctStr = inner.trim();
                    }
                    isPriceUp = !inner.includes('▼') && !inner.includes('-');
                }
            }
            // 수급 라인 파싱 (예: 📊 [전날 수급] 개인: 0주 | 외인: +98.3만주 | 기관: -90.5만주 또는 📌 전날 수급 개인: 0주 외인: +98.3만주 ...)
            else if (clean.includes('전날 수급') || clean.includes('전일 수급') || (clean.includes('개인:') && clean.includes('외인:'))) {
                const rMatch = clean.match(/개인[:\s]*([▲▼\-+]?[\d\.]+[만천]?주?)/);
                if (rMatch) retailVol = rMatch[1];

                const fMatch = clean.match(/외인[:\s]*([▲▼\-+]?[\d\.]+[만천]?주?)/);
                if (fMatch) foreignerVol = fMatch[1];

                const iMatch = clean.match(/기관[:\s]*([▲▼\-+]?[\d\.]+[만천]?주?)/);
                if (iMatch) institutionVol = iMatch[1];
            }
            // AI 요약 라인 파싱 (예: 🤖 삼성중공업 관련 주가 변동 및 노동조합 활동 소식 또는 📌 🤖 ...)
            else if (clean.includes('🤖')) {
                aiSummary = clean.replace(/^(?:📌|▪️|▪|\s)*🤖\s*/, '').trim();
            }
            // 그 외 일반 팩트/뉴스 라인
            else {
                let factText = clean.replace(/^(?:📌|▪️|▪|\s)+/, '').trim();
                if (factText && !factText.startsWith('※') && !factText.startsWith('(')) {
                    let tag = "핵심 이슈";
                    let tagColor = "bg-zinc-800 text-zinc-300 border-zinc-700";

                    if (/노조|임단협|투쟁|파업|경영진|대표|분쟁|소송/.test(factText)) {
                        tag = "노사·경영";
                        tagColor = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                    } else if (/수주|계약|공급|체결|납품|발주/.test(factText)) {
                        tag = "수주·계약";
                        tagColor = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                    } else if (/실적|매출|영업이익|흑자|적자|순이익|재무/.test(factText)) {
                        tag = "실적·재무";
                        tagColor = "bg-blue-500/15 text-blue-300 border-blue-500/30";
                    } else if (/변동|급등|급락|상승|하락|시황|거래량/.test(factText)) {
                        tag = "시황·변동";
                        tagColor = "bg-purple-500/15 text-purple-300 border-purple-500/30";
                    } else if (/개발|특허|기술|인증|승인|임상|신제품/.test(factText)) {
                        tag = "기술·혁신";
                        tagColor = "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
                    }

                    facts.push({ tag, tagColor, text: factText });
                }
            }
        });

        // alert 객체로부터 주가 정보 보정
        if (!closePriceStr && alert.current_price && alert.current_price > 0) {
            closePriceStr = `${alert.current_price.toLocaleString()}원`;
        }

        // 수급 밸런스 상태 분석
        const isFPlus = foreignerVol.includes('+') || (!foreignerVol.includes('-') && foreignerVol !== '0주' && foreignerVol !== '');
        const isFMinus = foreignerVol.includes('-');
        const isIPlus = institutionVol.includes('+') || (!institutionVol.includes('-') && institutionVol !== '0주' && institutionVol !== '');
        const isIMinus = institutionVol.includes('-');

        let supplyInsight = "전일 메이저 스마트머니 수급 현황";
        let supplyBadgeStyle = "bg-zinc-800/80 border-white/10 text-zinc-300";

        if (isFPlus && isIMinus) {
            supplyInsight = "⚡ 외국인 대량 순매수 유입 vs 기관 매도 공방";
            supplyBadgeStyle = "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-amber-500/30 text-amber-300";
        } else if (isFPlus && isIPlus) {
            supplyInsight = "🔥 외인·기관 쌍끌이 순매수 유입 (스마트머니 집중 매집)";
            supplyBadgeStyle = "bg-gradient-to-r from-red-500/15 via-emerald-500/10 to-transparent border-red-500/30 text-red-300";
        } else if (isFMinus && isIMinus) {
            supplyInsight = "⚠️ 외인·기관 동반 순매도 (단기 수급 이탈 주의)";
            supplyBadgeStyle = "bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent border-blue-500/30 text-blue-300";
        } else if (isFMinus && isIPlus) {
            supplyInsight = "🏛️ 기관 순매수 방어 vs 외국인 차익 실현";
            supplyBadgeStyle = "bg-gradient-to-r from-indigo-500/15 via-cyan-500/10 to-transparent border-indigo-500/30 text-indigo-300";
        } else if (foreignerVol || institutionVol) {
            supplyInsight = "📊 메이저 스마트머니 수급 변동성 포착";
            supplyBadgeStyle = "bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent border-cyan-500/30 text-cyan-300";
        }

        const getFactDetail = (factText: string, tag: string, fVol: string, iVol: string) => {
            if (/노조|임단협|투쟁|상경|파업/.test(factText)) {
                return {
                    context: "사측과의 임단협(임금·단체협약) 난항으로 기본급 인상 및 격려금 지급 등을 요구하며 노조 상경투쟁을 진행 중입니다.",
                    tip: "조선업 수주 호황기 속 단기 조업 차질 및 납기 일정 준수 여부와 노사 간 조기 타결 가능성을 주시할 필요가 있습니다."
                };
            }
            if (/경영진|대표|분쟁|소송|지분/.test(factText)) {
                return {
                    context: "경영권 지분 경쟁, 지배구조 개편 또는 소송 관련 이슈로 시장의 관심이 집중되고 있습니다.",
                    tip: "공시 진행 경과 및 법적 리스크 추이에 따라 단기 주가 변동성이 확대될 수 있으니 공시 원문을 확인하세요."
                };
            }
            if (/변동|급등|급락|상승|하락|시황|거래량/.test(factText)) {
                const hasF = fVol && fVol !== '0주';
                const hasI = iVol && iVol !== '0주';
                let contextText = "전일 외국인과 기관 등 메이저 자금의 수급 공방으로 단기 시세 변동성이 확대되었습니다.";
                if (hasF && hasI) {
                    contextText = `전일 외국인(${fVol})과 기관(${iVol}) 간의 팽팽한 매매 공방 속에 호가 변동성과 거래량이 크게 증가했습니다.`;
                } else if (hasF) {
                    contextText = `외국인 순매매(${fVol}) 유입에 따라 시세가 민감하게 반응하며 가격 변동이 발생했습니다.`;
                }
                return {
                    context: contextText,
                    tip: "장 초반 시초가 형성 후 외국인 매수세의 연속성 및 거래량 회전율을 필수적으로 점검하세요."
                };
            }
            if (/수주|계약|공급|체결|납품|발주/.test(factText)) {
                return {
                    context: "대규모 신규 수주·공급 계약 체결 건으로, 향후 건조 및 인도 일정에 따라 매출 가시성이 높아지고 있습니다.",
                    tip: "계약 규모의 전년 매출 대비 비중과 중장기 수익성 펀더멘털 개선 기여도를 점검하세요."
                };
            }
            if (/실적|매출|영업이익|흑자|적자|순이익|재무/.test(factText)) {
                return {
                    context: "분기 실적 및 영업이익 지표 관련 발표로, 고수익 선종 비중 확대 및 원가 개선 추세가 반영되고 있습니다.",
                    tip: "증권사 시장 컨센서스(전망치) 부합 여부와 향후 연간 흑자 폭 확대 가능성을 확인하세요."
                };
            }
            if (/개발|특허|기술|인증|승인|임상|신제품|친환경|LNG|암모니아/.test(factText)) {
                return {
                    context: "친환경 차세대 선박 및 핵심 독자 기술 경쟁력 확보와 관련된 연구개발/인증 성과입니다.",
                    tip: "글로벌 환경 규제 강화에 대응한 중장기 프리미엄 수주 경쟁력으로 작용할 수 있습니다."
                };
            }
            return {
                context: "해당 종목을 둘러싼 시장의 주요 이슈 및 언론·공시 팩트입니다.",
                tip: "단순 테마성 소식인지 본업 펀더멘털과 연결된 사안인지 공시 원문 및 뉴스 세부 내용을 확인하세요."
            };
        };

        return (
            <div className="space-y-3 text-left">
                {/* 1. 핵심 팩트 리스트 (이슈별 구체적 배경 설명 + 투자자 체크포인트 디테일 제공) */}
                {facts.length > 0 && (
                    <div className="space-y-2.5">
                        {facts.map((f, fIdx) => {
                            const detail = getFactDetail(f.text, f.tag, foreignerVol, institutionVol);
                            return (
                                <div key={fIdx} className="p-3.5 bg-zinc-900/90 border border-white/10 rounded-2xl space-y-2.5 shadow-sm">
                                    <div className="flex items-start gap-2.5">
                                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border shrink-0 mt-0.5 ${f.tagColor}`}>
                                            {f.tag}
                                        </span>
                                        <h4 className="text-sm md:text-base text-zinc-100 font-bold leading-snug">
                                            {f.text}
                                        </h4>
                                    </div>
                                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 space-y-1.5 text-left">
                                        <div className="flex items-start gap-2 text-xs leading-relaxed">
                                            <span className="font-bold text-amber-300/90 shrink-0">💡 배경</span>
                                            <span className="text-zinc-300">{detail.context}</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-xs leading-relaxed pt-1 border-t border-white/5">
                                            <span className="font-bold text-cyan-400/90 shrink-0">📌 체크</span>
                                            <span className="text-zinc-400">{detail.tip}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 3. 전날 수급 현황 (원래 알림의 4번째 줄: 외인, 기관, 개인 수급을 시원한 3분할 칩으로 표시) */}
                {(retailVol || foreignerVol || institutionVol) && (
                    <div className="p-3.5 bg-zinc-900/90 border border-white/10 rounded-2xl space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                                전날 메이저 수급 현황
                            </span>
                            <span className="text-[11px] font-bold text-amber-300">
                                {supplyInsight}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-0.5">
                            <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-white/5 text-center">
                                <p className="text-[10px] text-gray-400 font-medium">외국인</p>
                                <p className={`text-xs md:text-sm font-black font-mono mt-0.5 ${isFPlus ? 'text-red-400' : isFMinus ? 'text-blue-400' : 'text-zinc-300'}`}>
                                    {foreignerVol || '0주'}
                                </p>
                            </div>
                            <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-white/5 text-center">
                                <p className="text-[10px] text-gray-400 font-medium">기관계</p>
                                <p className={`text-xs md:text-sm font-black font-mono mt-0.5 ${isIPlus ? 'text-red-400' : isIMinus ? 'text-blue-400' : 'text-zinc-300'}`}>
                                    {institutionVol || '0주'}
                                </p>
                            </div>
                            <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-white/5 text-center">
                                <p className="text-[10px] text-gray-400 font-medium">개인</p>
                                <p className={`text-xs md:text-sm font-black font-mono mt-0.5 ${retailVol.includes('+') ? 'text-red-400' : retailVol.includes('-') ? 'text-blue-400' : 'text-zinc-300'}`}>
                                    {retailVol || '0주'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. 법적 고지 문구 (원래 알림 하단 면책 문구) */}
                <p className="text-[11px] text-gray-500 font-normal px-1">
                    ※ 객관적 공시·시세 팩트 전달이며 투자 권유가 아닙니다.
                </p>

                {/* 5. 프리미엄 액션 버튼 바 */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                    <Link
                        href={cleanSymbol ? `/discovery?q=${cleanSymbol}` : `/discovery`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 text-amber-300 border border-amber-500/30 text-center py-2.5 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        종목 정밀 심층 분석
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/watchlist"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-gray-200 border border-white/10 text-center py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                        실시간 시세 보기
                    </Link>
                    {cleanSymbol && (
                        <a
                            href={`https://m.stock.naver.com/item/news/${cleanSymbol}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 bg-zinc-800/80 hover:bg-zinc-700/80 text-gray-300 border border-white/10 rounded-2xl text-xs font-bold transition-all flex items-center justify-center shadow-sm active:scale-95 cursor-pointer"
                            title="네이버 증권 관련 뉴스"
                        >
                            <ExternalLink className="w-4 h-4 text-zinc-400" />
                        </a>
                    )}
                </div>
            </div>
        );
    };

    const renderAlertCard = (alert: any) => {
        const titleText = (alert.title || '').trim();
        const hasDisclosureKey = Boolean(
            titleText.includes("공시") || 
            titleText.includes("증자") || 
            titleText.includes("공급계약") || 
            titleText.includes("전환사채") || 
            titleText.includes("자사주") || 
            titleText.includes("실적") || 
            titleText.includes("배당") || 
            (alert as any).dart_url || 
            (alert.url && (alert.url.includes('dart') || alert.url.includes('disclosure')))
        );
        const isWhale = !hasDisclosureKey && (['whale_accumulation', 'whale_alert'].includes(alert.type) || titleText.includes("외국인") || titleText.includes("쓸어담은") || titleText.includes("세력") || titleText.includes("기관 순매수"));
        const isDisclosure = hasDisclosureKey || ['disclosure_alert', 'large_holding', 'disclosure', 'sec_insider_trading', 'sec_13f', 'sec_disclosure', 'insider_trading'].includes(alert.type);
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
        const isMorningBriefing = Boolean(
            alert.type === 'morning_briefing' ||
            titleText.includes('모닝 팩트') ||
            titleText.includes('간추린 모닝') ||
            ((alert.body || '').includes('전날 수급') && (alert.body || '').includes('🤖'))
        );

        // [0순위: 관리자 운영 및 시스템 보고서]
        if (isAdminAlert) {
            typeBadgeStyle = "bg-purple-500/25 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]";
            typeBadgeLabel = "👑 🛡️ 관리자 전용 운영 보고";
            cardBorderHover = "hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)]";
            accentBorder = "border-l-4 border-l-purple-500";
            defaultCta = { href: "/admin", label: "관리자 시스템 대시보드 바로가기", icon: Crown, style: "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40" };
        }
        // [0-1순위: 장전 모닝 팩트 브리핑]
        else if (isMorningBriefing) {
            typeBadgeStyle = "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
            typeBadgeLabel = "🌅 장전 모닝 팩트 브리핑";
            cardBorderHover = "hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]";
            accentBorder = "border-l-4 border-l-amber-400";
            defaultCta = { href: cleanSymbol ? `/discovery?q=${cleanSymbol}` : "/watchlist", label: "장전 관심종목 정밀 분석", icon: Sparkles, style: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30" };
        }
        // [1순위: DART 공시 / 내부자 거래 / 지분 공시] -> 명확하게 공시 뱃지 우선 부여
        else if (hasDisclosureKey || titleText.includes("공시") || alert.type === 'disclosure_alert' || alert.type === 'disclosure') {
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
        // [1-2순위: 장시작 시가 알림]
        else if ((alert.body || '').includes('관심종목 시가입니다') || (alert.body || '').includes('시가입니다') || titleText.includes('시가 알림') || titleText.includes('장시작')) {
            typeBadgeStyle = "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
            typeBadgeLabel = "☀️ 장시작 시가 알림";
            cardBorderHover = "hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]";
            accentBorder = "border-l-4 border-l-amber-400";
            defaultCta = { href: "/watchlist", label: "내 관심종목 실시간 시세 보기", icon: TrendingUp, style: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30" };
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
        else if (isWhale) {
            typeBadgeStyle = "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]";
            typeBadgeLabel = "🐳 외인·기관 수급 특보";
            cardBorderHover = "hover:border-cyan-500/40 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]";
            accentBorder = "border-l-4 border-l-cyan-400";
            defaultCta = { href: "/ranking", label: "실시간 외국인·기관 수급 순위 보기", icon: TrendingUp, style: "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30" };
        } 
        // [4순위: 뉴스 알림 속보 - 주도 테마 레이더보다 먼저 판정하여 오분류 방지]
        else if (['news_alert', 'news_naver', 'news_google', 'news'].includes(alert.type) || (alert.title && (alert.title.includes("뉴스") || alert.title.includes("헤드라인") || alert.title.includes("속보")))) {
            typeBadgeStyle = "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.2)]";
            typeBadgeLabel = "📰 실시간 뉴스 속보";
            cardBorderHover = "hover:border-sky-500/40 hover:shadow-[0_0_25px_rgba(14,165,233,0.15)]";
            accentBorder = "border-l-4 border-l-sky-400";
            defaultCta = { href: alert.url || `/discovery?q=${symbol}`, label: "뉴스 기사 원문 보기", icon: Globe, style: "bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30" };
        }
        // [5순위: 주도 테마 레이더]
        else if (combinedText.includes("테마") || combinedText.includes("지역화폐") || combinedText.includes("뜨거운 테마") || combinedText.includes("대장주") || combinedText.includes("급등주")) {
            typeBadgeStyle = "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
            typeBadgeLabel = "⚡ 실시간 주도 테마 레이더";
            cardBorderHover = "hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]";
            accentBorder = "border-l-4 border-l-amber-400";
            defaultCta = { href: "/theme", label: "주도 테마 맵 & 대장주 확인", icon: Zap, style: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30" };
        } 
        // [6순위: 기타 마켓 코인, 공모주, 시그널]
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
                    {(() => {
                        let t = (alert.title || '')
                            .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // 깨진 물음표 기호 제거
                            .replace(/^👤\s*/, '🚨 ') // 윈도우 등 특정 폰트 깨짐 방지 위해 👤를 🚨로 안전 대체
                            .trim();

                        // [보정] 본문이 시가 알림인데 급등 제목으로 잘못 붙은 경우 올바르게 교정
                        const bodyText = alert.body || '';
                        if (bodyText.includes('관심종목 시가입니다') || bodyText.includes('시가입니다') || t.includes('시가 알림')) {
                            return '☀️ [국내 장시작] 관심종목 시가 알림';
                        }
                        // 앞머리 이모지 중복 정리
                        t = t.replace(/^([👥🐋🚨🔔👤🏛️📈📉⚡🔥💰⚠️📊🎉✨])\s*([👥🐋🚨🔔👤🏛️📈📉⚡🔥💰⚠️📊🎉✨])/, '$2');
                        // 이모지가 없거나 제거된 경우 깔끔한 기본 이모지 부여
                        if (t.startsWith('[')) {
                            t = `🚨 ${t}`;
                        }
                        return t;
                    })()}
                </h3>

                {/* Body Content */}
                {isPortfolio ? (
                    renderPortfolioCardContent(alert)
                ) : isMorningBriefing ? (
                    renderMorningBriefingCardContent(alert)
                ) : (
                    <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-normal">
                        {renderFormattedBody(alert.body, alert)}
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
                        {(dartUrl || (alert.url && (alert.url.includes('dart') || alert.url.includes('sec')))) && (
                            <Link 
                                href={dartUrl || alert.url} 
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 min-w-[130px] bg-zinc-800/80 hover:bg-zinc-700/80 text-gray-200 border border-white/10 text-center py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                            >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                                공시 원문 보기
                            </Link>
                        )}
                    </div>
                ) : isWhale ? (
                    <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-white/10">
                        {cleanSymbol && (
                            <Link 
                                href={`/discovery?q=${cleanSymbol}`} 
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 min-w-[130px] bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-500/30 text-center py-2.5 rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                                종목 정밀 심층 분석
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        )}
                        <Link 
                            href="/ranking" 
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-[130px] bg-zinc-800/80 hover:bg-zinc-700/80 text-gray-200 border border-white/10 text-center py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                            <TrendingUp className="w-4 h-4 text-cyan-400" />
                            실시간 수급 순위 보기
                        </Link>
                    </div>
                ) : !isPortfolio && !isMorningBriefing && (
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
            const isPortfolioAlert = ['portfolio_summary', 'portfolio', 'market_summary', 'market', 'dividend_alert', 'morning_briefing'].includes(alert.type) ||
                titleText.includes('관심종목 결산') || titleText.includes('장마감 시황') || titleText.includes('마켓 장마감');
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
                            return (
                                <React.Fragment key={alert.id}>
                                    {renderAlertCard(alert)}
                                    {(idx === 2 || idx === 7) && (
                                        <div className="bg-zinc-950/80 border border-white/5 rounded-3xl p-4 flex flex-col items-center justify-center my-4 shadow-xl">
                                            <p className="text-[10px] text-zinc-500 mb-2 font-bold uppercase tracking-wider">스폰서 광고</p>
                                            <div className="block md:hidden">
                                                <KakaoAdFit adUnit="DAN-4lZ2zEzbyDJ1Yva6" adWidth="300" adHeight="250" />
                                            </div>
                                            <div className="hidden md:block">
                                                <KakaoAdFit adUnit="DAN-eeR4RhnpmQaeIlYm" adWidth="728" adHeight="90" />
                                            </div>
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
