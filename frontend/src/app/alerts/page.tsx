"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, limit, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";

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

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const fetched: AlertItem[] = [];
                const alertsRef = collection(db, "alerts");

                if (user) {
                    // 로그인 유저: 공용 알림(is_global == true) + 개인 알림(target_users 배열에 내 UID 포함)
                    const globalQuery = query(
                        alertsRef,
                        where("is_global", "==", true),
                        orderBy("timestamp", "desc"),
                        limit(30)
                    );
                    const userQuery = query(
                        alertsRef,
                        where("target_users", "array-contains", user.uid),
                        orderBy("timestamp", "desc"),
                        limit(30)
                    );

                    const [globalSnap, userSnap] = await Promise.all([getDocs(globalQuery), getDocs(userQuery)]);
                    
                    const map = new Map<string, AlertItem>();
                    globalSnap.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() } as AlertItem));
                    userSnap.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() } as AlertItem));
                    
                    // 합친 후 정렬
                    const combined = Array.from(map.values()).sort((a, b) => {
                        const timeA = a.timestamp?.toMillis?.() || 0;
                        const timeB = b.timestamp?.toMillis?.() || 0;
                        return timeB - timeA;
                    });
                    
                    setAlerts(combined.slice(0, 50));
                } else {
                    // 비로그인 유저: 공용 알림만
                    const globalQuery = query(
                        alertsRef,
                        where("is_global", "==", true),
                        orderBy("timestamp", "desc"),
                        limit(50)
                    );
                    const globalSnap = await getDocs(globalQuery);
                    globalSnap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as AlertItem));
                    setAlerts(fetched);
                }

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
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="bg-[#0f1115] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors"
                            >
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
                                </div>
                                <h3 className="text-md font-semibold text-gray-100">
                                    {alert.title}
                                </h3>
                                <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed mt-1">
                                    {alert.body}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
