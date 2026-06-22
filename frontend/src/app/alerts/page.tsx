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
                
                // Firestore 복합 인덱스(Composite Index) 에러를 방지하기 위해 
                // 최신 알림 100개를 가져온 뒤 프론트엔드에서 필터링합니다.
                const q = query(
                    alertsRef,
                    orderBy("timestamp", "desc"),
                    limit(100)
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
