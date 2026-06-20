"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

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

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const q = query(
                    collection(db, "alerts"),
                    orderBy("timestamp", "desc"),
                    limit(50)
                );
                const snapshot = await getDocs(q);
                const fetched: AlertItem[] = [];
                snapshot.forEach((doc) => {
                    fetched.push({ id: doc.id, ...doc.data() } as AlertItem);
                });
                setAlerts(fetched);
            } catch (err) {
                console.error("Failed to fetch alerts:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchAlerts();
    }, []);

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

                        {loading ? (
                            <div className="flex items-center justify-center h-48">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className="text-center py-20 bg-gray-800/30 rounded-2xl border border-gray-700/50">
                                <span className="text-4xl block mb-4 opacity-50">📭</span>
                                <h3 className="text-lg font-medium text-gray-300">
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
                                        className="p-5 bg-gray-800/40 hover:bg-gray-800/80 transition-colors rounded-2xl border border-gray-700/50 flex flex-col space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                {alert.type === "crypto_surge" ? (
                                                    <span className="px-2 py-1 text-xs font-bold bg-orange-500/20 text-orange-400 rounded-md">
                                                        코인 불장
                                                    </span>
                                                ) : alert.type === "whale_alert" ? (
                                                    <span className="px-2 py-1 text-xs font-bold bg-purple-500/20 text-purple-400 rounded-md">
                                                        세력 포착
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs font-bold bg-blue-500/20 text-blue-400 rounded-md">
                                                        알림
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-500">
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
                                        <p className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">
                                            {alert.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    </div>
        </div>
    );
}
