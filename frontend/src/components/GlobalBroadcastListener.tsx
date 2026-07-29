"use client";

import { useEffect, useState } from "react";
import { onSnapshot, collection, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { X, BellRing } from "lucide-react";

export default function GlobalBroadcastListener() {
    const [mounted, setMounted] = useState(false);
    const [popupAlert, setPopupAlert] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !db) return;
        const alertsRef = collection(db, "alerts");
        // 복합 인덱스 및 시간차(Clock Skew) 문제를 완벽히 회피하기 위해
        // 가장 최근 1개만 구독하되, 첫 로딩(초기 데이터)은 무시하고 이후 새로 추가된 것만 팝업을 띄웁니다.
        let isInitialLoad = true;
        const q = query(
            alertsRef,
            orderBy("timestamp", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isInitialLoad) {
                isInitialLoad = false;
                return; // 최초 로딩 시 팝업 방지
            }
            
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    
                    // 클라이언트 단에서 is_global 및 타겟 여부 확인
                    const isGlobal = data.is_global === true;
                    
                    let userId = typeof window !== 'undefined' ? localStorage.getItem('fcm_guest_id') : null;
                    if (!userId && typeof window !== 'undefined') {
                        try {
                            const storedUser = localStorage.getItem('stock_user');
                            if (storedUser) {
                                const parsed = JSON.parse(storedUser);
                                userId = parsed.id || parsed.uid;
                            }
                        } catch(e){}
                    }

                    const isTargeted = userId && data.target_users && Array.isArray(data.target_users) && data.target_users.includes(userId);

                    if (isGlobal || isTargeted) {
                        setPopupAlert({ id: change.doc.id, ...data });
                        
                        // 5초 후 자동 닫힘
                        setTimeout(() => {
                            setPopupAlert(null);
                        }, 5000);
                    }
                }
            });
        }, (error) => {
            console.error("[GlobalBroadcast] Firestore listener error:", error);
        });

        return () => unsubscribe();
    }, [mounted]);

    if (!mounted || !popupAlert) return null;

    const handleClick = () => {
        if (popupAlert.url) {
            router.push(popupAlert.url);
        } else if (popupAlert.news_url) {
            window.open(popupAlert.news_url, '_blank');
        } else if (popupAlert.symbol) {
            router.push(`/discovery?q=${popupAlert.symbol}`);
        }
        setPopupAlert(null);
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div 
                className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl rounded-2xl p-4 border border-blue-500/30 flex items-start gap-3 cursor-pointer relative overflow-hidden group hover:border-blue-500/50 transition-all"
                onClick={handleClick}
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-500"></div>
                
                <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-full shrink-0">
                    <BellRing className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">
                            실시간 핫이슈
                        </span>
                    </div>
                    <h4 className="text-gray-900 dark:text-white font-bold text-sm leading-tight truncate">
                        {popupAlert.title}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 line-clamp-2 leading-relaxed">
                        {popupAlert.body}
                    </p>
                </div>

                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setPopupAlert(null);
                    }}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
