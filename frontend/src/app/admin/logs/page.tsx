"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase";
import { Loader2, AlertCircle, CheckCircle, Info, ServerCrash, RefreshCw } from "lucide-react";

// 환경변수나 하드코딩된 관리자 이메일 목록
const ADMIN_EMAILS = ['rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'];

interface SystemLog {
  id: number;
  level: string;
  component: string;
  message: string;
  details: string;
  created_at: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // 배포 환경과 로컬 환경 URL 분기
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/admin/logs?limit=100`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success") {
          setLogs(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
        fetchLogs();
      } else {
        router.push('/'); // 권한 없으면 메인으로 튕기기
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const getLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return <ServerCrash className="w-5 h-5 text-red-500" />;
      case 'WARNING': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'INFO': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">ERROR</span>;
      case 'WARNING': return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">WARNING</span>;
      case 'INFO': return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">INFO</span>;
      default: return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full font-medium">{level}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-gray-100 p-6 pt-24">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ServerCrash className="w-6 h-6 text-indigo-500" />
              시스템 오류 & 알림 모니터링
            </h1>
            <p className="text-gray-400 text-sm mt-1">백그라운드 서비스 및 푸시 알림 발송 현황을 실시간으로 확인합니다.</p>
          </div>
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#222222] text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">ID</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">레벨</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">시간 (KST)</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">컴포넌트</th>
                  <th className="px-4 py-3 font-medium">메시지</th>
                  <th className="px-4 py-3 font-medium">상세 에러 (Details)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      최근 기록된 시스템 로그가 없습니다.
                    </td>
                  </tr>
                )}
                {logs.map((log) => {
                  // 시간을 보기 좋게 포맷팅 (UTC -> KST 추정 또는 로컬 타임 적용)
                  const dateObj = new Date(log.created_at + 'Z'); 
                  const dateStr = isNaN(dateObj.getTime()) ? log.created_at : dateObj.toLocaleString('ko-KR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit', second:'2-digit'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-[#222222]/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">#{log.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getLevelIcon(log.level)}
                          {getLevelBadge(log.level)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3 text-indigo-400 font-medium whitespace-nowrap">{log.component}</td>
                      <td className="px-4 py-3 font-medium text-gray-200">{log.message}</td>
                      <td className="px-4 py-3">
                        {log.details ? (
                          <div className="max-w-md max-h-24 overflow-y-auto bg-black/40 p-2 rounded text-xs font-mono text-red-400 border border-red-900/30 break-all">
                            {log.details}
                          </div>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
