"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, limit, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
                
                // Firestore 복합 인덱스(Composite Index) 에러를 방지하기 위해 
                // 최신 알림을 넉넉히 가져온 뒤 프론트엔드에서 필터링합니다. (뉴스 속보가 많아 500개로 상향)
                const q = query(
                    alertsRef,
                    orderBy("timestamp", "desc"),
                    limit(500)
                );
                
                const snapshot = await getDocs(q);
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const isGlobal = data.is_global === true || data.is_global === undefined; // 과거 데이터 호환성
                    const isTargetedToMe = user && data.target_users && Array.isArray(data.target_users) && data.target_users.includes(user.uid);
                    
                    if (user) {
                        if (isGlobal || isTargetedToMe) {
                            fetched.push({ id: doc.id, ...data } as AlertItem);
                        }
                    } else {
                        if (isGlobal) {
                            fetched.push({ id: doc.id, ...data } as AlertItem);
                        }
                    }
                });
                
                setAlerts(fetched.slice(0, 50));

                setErrorMsg(null);
            } catch (err: any) {
                console.error("Failed to fetch alerts:", err);
                setErrorMsg(err.message || "알림을 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        }
        
        // Wait for auth to initialize before fetching
        if (user !== undefined) {
            fetchAlerts();
        }
    }, [user]);

    const renderAlertCard = (alert: AlertItem) => {
        const cardContent = (
            <div className="bg-[#0f1115] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 hover:bg-white/5 transition-colors w-full text-left group">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            alert.type === 'crypto_bull' 
                                ? 'bg-orange-500/20 text-orange-400' 
                                : alert.type === 'whale_accumulation' 
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-blue-500/20 text-blue-400'
                        }`}>
                            {alert.type === 'crypto_bull' ? '🔥 코인 불장' : 
                             alert.type === 'whale_accumulation' ? '🐳 세력 포착' : '알림'}
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
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                </div>
                <h3 className="text-md font-semibold text-gray-100 pr-6">
                    {alert.title}
                </h3>
                <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed mt-1 pr-6">
                    {alert.body}
                </p>
            </div>
        );

        let targetUrl = (alert as any).url;
        if ((alert as any).news_url) {
            const params = new URLSearchParams();
            params.set("url", (alert as any).news_url);
            if ((alert as any).symbol) params.set("symbol", (alert as any).symbol);
            if (alert.title) params.set("title", alert.title);
            targetUrl = `/news-redirect?${params.toString()}`;
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
        } else if ((alert as any).symbol) {
            return (
                <Link key={alert.id} href={`/stock/${(alert as any).symbol}`} className="block cursor-pointer">
                    {cardContent}
                </Link>
            );
        }

        return <div key={alert.id} className="cursor-pointer">{cardContent}</div>;
    };

    return (
        <div className="min-h-screen pb-10">
            <Header />

            <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
                <div className="flex items-center space-x-3 mb-8">
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

                {!user && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
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
                ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-white/5 border border-white/10 rounded-3xl">
                        <span className="text-4xl mb-4">📭</span>
                        <h3 className="text-lg font-semibold text-gray-300">
                            아직 도착한 알림이 없습니다.
                        </h3>
                        <p className="text-sm text-gray-500 mt-2">
                            중요한 소식이 발생하면 가장 먼저 알려드릴게요!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alerts.map((alert) => renderAlertCard(alert))}
                    </div>
                )}
            </div>
        </div>
    );
}
