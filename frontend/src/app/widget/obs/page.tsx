"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Zap, BellRing } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

interface Alert {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  body: string;
}

export default function ObsWidgetPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchLatestAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/alerts/history`);
        const data = await res.json();
        
        if (data.status === "success" && data.data) {
          // 최신 3개 알림만 유지
          setAlerts(data.data.slice(0, 3));
        }
      } catch (e) {
        console.error("OBS Widget Error:", e);
      }
    };

    fetchLatestAlerts();
    // 10초마다 폴링하여 새로운 공시/뉴스 확인
    const interval = setInterval(fetchLatestAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  // OBS용 투명 배경 설정 (크로마키 없이도 OBS browser source에서 작동)
  return (
    <div className="min-h-screen bg-transparent text-white p-4 font-sans flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      {/* 워터마크 (우상단) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full border border-white/20">
        <Zap className="w-4 h-4 text-blue-400" />
        <span className="font-black text-sm text-white/90 tracking-wider">StockTrend AI</span>
      </div>

      {/* 알림 리스트 (아래에서 위로 쌓임) */}
      <div className="flex flex-col-reverse gap-3 max-w-lg">
        {alerts.map((alert, idx) => {
          // 최신 항목(idx 0)은 강조 처리
          const isLatest = idx === 0;
          
          return (
            <div 
              key={alert.id || idx} 
              className={`animate-in slide-in-from-right-8 fade-in duration-500 rounded-xl p-4 border shadow-2xl backdrop-blur-md relative overflow-hidden
                ${isLatest 
                  ? 'bg-gradient-to-r from-red-900/80 to-black border-red-500 shadow-red-500/20' 
                  : 'bg-black/80 border-white/10'}`}
            >
              {isLatest && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
              )}
              
              <div className="flex items-start gap-3 relative z-10">
                <div className={`mt-0.5 shrink-0 ${isLatest ? 'text-red-400 animate-bounce' : 'text-gray-400'}`}>
                  {isLatest ? <BellRing className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isLatest ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-gray-300'}`}>
                      {alert.type === 'disclosure_alert' ? 'DART 세력포착' : '속보'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(alert.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <h3 className={`font-bold leading-tight mb-1 ${isLatest ? 'text-white text-lg' : 'text-gray-200 text-base'}`}>
                    {alert.title}
                  </h3>
                  {isLatest && (
                    <p className="text-sm text-gray-400 line-clamp-2 leading-snug">
                      {alert.body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
