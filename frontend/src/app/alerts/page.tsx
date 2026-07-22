"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, limit, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Link from "next/link";
import { ChevronRight, AlertCircle, Clock, CheckCircle2, XCircle, TrendingUp, TrendingDown, Eye, Calendar, Building2, Tag, Info, Database, BellRing } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import KakaoAdFit from "@/components/KakaoAdFit";

interface AlertItem {
    id: string;
    type: string;
    title: string;
    body: string;
    timestamp: any;
}

export default function AlertCenterPage() {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("all");
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
    const [watchlistNames, setWatchlistNames] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const { user } = useAuth();

    // 방문 시간 기록
    useEffect(() => {
        localStorage.setItem('last_alert_visit', new Date().toISOString());
        // Custom event to trigger header update
        window.dispatchEvent(new Event('alerts_visited'));
    }, []);

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const fetched: AlertItem[] = [];
                const alertsRef = collection(db, "alerts");
                
                // 사용자 맞춤형 알림과 전체 알림을 각각 가져와 프론트엔드에서 병합 (읽기 비용 최소화 및 누락 방지)
                const userId = user?.id || (user as any)?.uid;
                
                // Fetch the latest 300 alerts regardless of type to avoid composite index errors
                const qLatest = query(alertsRef, orderBy("timestamp", "desc"), limit(400));
                const snapLatest = await getDocs(qLatest);
                
                const allAlertsMap = new Map();
                snapLatest.forEach(doc => {
                    const data = doc.data();
                    const isGlobal = data.is_global === true;
                    const isTargeted = userId && data.target_users && Array.isArray(data.target_users) && data.target_users.includes(userId);
                    
                    if (isGlobal || isTargeted) {
                        allAlertsMap.set(doc.id, { id: doc.id, ...data });
                    }
                });

                // 시간순 정렬 (최신순)
                let sortedAlerts = Array.from(allAlertsMap.values());
                sortedAlerts.sort((a, b) => {
                    const timeA = a.timestamp?.seconds || 0;
                    const timeB = b.timestamp?.seconds || 0;
                    return timeB - timeA;
                });

                // ----------------- IMPORTANT -----------------
                // 뉴스 속보 도배 방지: 뉴스는 최대 15개까지만 노출하여 중요한 장마감/포트폴리오 알림이 밀리지 않도록 함
                let newsCount = 0;
                const filtered = [];
                for (const alert of sortedAlerts) {
                    if (['news_alert', 'news_naver', 'news_google'].includes(alert.type)) {
                        if (newsCount < 15) {
                            filtered.push(alert);
                            newsCount++;
                        }
                    } else {
                        filtered.push(alert);
                    }
                }
                
                // 최종 노출
                setAlerts(filtered.slice(0, 300)); // 탭 분류를 위해 전체 개수 증가

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
        
        // Wait for auth to initialize before fetching
        if (user !== undefined) {
            fetchAlerts();
            fetchWatchlist();
        }
    }, [user]);

    const renderAlertCard = (alert: AlertItem) => {
        let targetUrl = (alert as any).url || (alert as any).link;
        const symbol = (alert as any).symbol;
        const isDisclosure = alert.type === 'disclosure_alert' || alert.type === 'large_holding';

        if ((alert as any).news_url) {
            const params = new URLSearchParams();
            params.set("url", (alert as any).news_url);
            if (symbol) params.set("symbol", symbol);
            if (alert.title) params.set("title", alert.title);
            targetUrl = `/news-redirect?${params.toString()}`;
        }

        const cardContent = (
            <div className={`bg-[#0f1115] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 hover:bg-white/5 transition-colors w-full text-left ${!isDisclosure ? 'group' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            alert.type === 'crypto_bull' 
                                ? 'bg-orange-500/20 text-orange-400' 
                                : alert.type === 'whale_accumulation' 
                                ? 'bg-purple-500/20 text-purple-400'
                                : (alert.type === 'disclosure_alert' || alert.type === 'large_holding')
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : alert.type === 'ipo_alert'
                                ? 'bg-pink-500/20 text-pink-400'
                                : alert.type === 'admin_report'
                                ? 'bg-red-500/20 text-red-400'
                                : ['news_alert', 'news_naver', 'news_google'].includes(alert.type)
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                            {alert.type === 'crypto_bull' ? '🔥 코인 불장' : 
                             alert.type === 'whale_accumulation' ? '🐳 세력 포착' : 
                             (alert.type === 'disclosure_alert' || alert.type === 'large_holding') ? '📢 공시' :
                             alert.type === 'ipo_alert' ? '🎯 공모주' :
                             alert.type === 'admin_report' ? '👑 관리자' :
                             ['news_alert', 'news_naver', 'news_google'].includes(alert.type) ? '📰 뉴스' : '🔔 알림'}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                            {alert.timestamp && alert.timestamp.seconds
                                ? new Date(
                                      alert.timestamp.seconds * 1000
                                  ).toLocaleString("ko-KR", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  })
                                : "최근"}
                        </span>
                    </div>
                    {!isDisclosure && <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />}
                </div>
                <h3 className="text-md font-semibold text-gray-100 pr-6">
                    {alert.title}
                </h3>
                <p className={`text-sm text-gray-400 whitespace-pre-wrap leading-relaxed mt-1 pr-6 ${isDisclosure ? 'mb-4' : ''}`}>
                    {alert.body}
                </p>

                {isDisclosure && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-800/50">
                        {symbol && (
                            <Link href={`/stock/${symbol}`} className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-center py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                                AI 리포트 분석
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        )}
                        {((alert as any).dart_url || targetUrl) && ((alert as any).dart_url || targetUrl).startsWith("http") && (
                            <a href={(alert as any).dart_url || targetUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-center py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                                공시 원문 보기
                                <ChevronRight className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                )}
            </div>
        );

        if (isDisclosure) {
            return <div key={alert.id}>{cardContent}</div>;
        }

        if (targetUrl) {
            if (targetUrl.startsWith("http")) {
                return (
                    <a key={alert.id} href={targetUrl} target="_blank" rel="noopener noreferrer" className="block cursor-pointer">
                        {cardContent}
                    </a>
                );
            } else {
                return (
                    <Link key={alert.id} href={targetUrl} className="block cursor-pointer">
                        {cardContent}
                    </Link>
                );
            }
        } else if (symbol) {
            return (
                <Link key={alert.id} href={`/stock/${symbol}`} className="block cursor-pointer">
                    {cardContent}
                </Link>
            );
        }

        return <div key={alert.id} className="cursor-pointer">{cardContent}</div>;
    };

    // 관리자 여부 확인
    const isAdmin = user && ['rnfjrlakdmf@gmail.com', 'rnfjr@gmail.com'].includes((user as any).email?.toLowerCase());

    // 탭 구성
    const tabs = [
        { id: "all", label: "전체" },
        { id: "watchlist_news", label: "관심종목 뉴스" },
        { id: "watchlist_disclosure", label: "관심종목 공시" },
        { id: "disclosure", label: "공시" },
        { id: "portfolio", label: "내 관심종목" }
    ];
    if (isAdmin) {
        tabs.push({ id: "admin", label: "관리자 메뉴" });
    }

    // 카테고리 필터링 적용
    const filteredAlerts = alerts.filter(alert => {
        // 관리자 알림은 관리자 탭 또는 전체 탭에서만 보임 (일반 유저의 전체 탭에는 어차피 권한이 없어서 안 가져옴)
        if (['admin_report', 'ping_test'].includes(alert.type) && activeTab !== 'admin' && activeTab !== 'all') return false;

        const isNews = ['news_alert', 'news_naver', 'news_google'].includes(alert.type);
        const isDisclosure = alert.type === 'disclosure_alert';

        if (activeTab === "all") return true;
        if (activeTab === "admin") return ['admin_report', 'ping_test'].includes(alert.type);
        
        let symbolMatch = false;
        if ((alert as any).symbol && watchlistSymbols.includes((alert as any).symbol)) {
            symbolMatch = true;
        } else if (watchlistNames.length > 0) {
            // If symbol is missing or doesn't match, try matching by name in title or body
            const textToSearch = (alert.title + " " + alert.body).toLowerCase();
            for (const name of watchlistNames) {
                if (textToSearch.includes(name.toLowerCase())) {
                    symbolMatch = true;
                    break;
                }
            }
        }

        if (activeTab === "watchlist_news") {
            if (!isNews) return false;
            return symbolMatch;
        }
        
        if (activeTab === "watchlist_disclosure") {
            if (!isDisclosure) return false;
            return symbolMatch;
        }

        if (activeTab === "disclosure") return isDisclosure;
        
        if (activeTab === "portfolio") return ['portfolio_summary', 'price_alert', 'dividend_alert', 'morning_briefing'].includes(alert.type);
        
        return true;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE);
    const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen pb-10">
            <Header />

            <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <span className="text-2xl">🔔</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            알림 센터
                        </h1>
                        <p className="text-sm text-gray-400 mt-1">
                            놓친 중요한 투자 정보를 모아보세요
                        </p>
                    </div>
                </div>

                {/* 탭 버튼 영역 */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                activeTab === tab.id
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {!user && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-blue-400 font-semibold text-sm">개인 맞춤 알림을 받아보세요</h3>
                            <p className="text-gray-400 text-xs mt-1">로그인하시면 나의 관심종목 뉴스와 목표가 도달 알림을 받을 수 있습니다.</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : errorMsg ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-red-500/10 border border-red-500/20 rounded-3xl">
                        <span className="text-4xl mb-4">⚠️</span>
                        <h3 className="text-lg font-semibold text-red-400">
                            알림을 불러오지 못했습니다
                        </h3>
                        <p className="text-sm text-red-300 mt-2 max-w-md mx-auto">
                            {errorMsg}
                        </p>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-white/5 border border-white/10 rounded-3xl">
                        <span className="text-4xl mb-4">📭</span>
                        <h3 className="text-lg font-semibold text-gray-300">
                            해당 분류의 알림이 없습니다.
                        </h3>
                        <p className="text-sm text-gray-500 mt-2">
                            중요한 소식이 발생하면 가장 먼저 알려드릴게요!
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
                                        <div className="bg-black/30 border border-blue-500/10 rounded-2xl p-4 flex flex-col items-center justify-center my-6 shadow-xl">
                                            <p className="text-xs text-gray-500 mb-2 font-semibold">스폰서 광고</p>
                                            <KakaoAdFit adUnit="DAN-4lZ2zEzbyDJ1Yva6" adWidth="300" adHeight="250" />
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center space-x-2 mt-8 pt-4">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors text-sm"
                                >
                                    이전
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(currentPage - p) <= 2)
                                    .map((p, idx, arr) => (
                                        <React.Fragment key={p}>
                                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                <span className="text-gray-600 px-1">...</span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                                                    currentPage === p 
                                                    ? "bg-blue-500 text-white border border-blue-400/50" 
                                                    : "bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
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
                                    className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors text-sm"
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
