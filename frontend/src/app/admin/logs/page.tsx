"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, AlertCircle, CheckCircle, Info, ServerCrash, RefreshCw, Bell, TrendingUp, Zap } from "lucide-react";

const ADMIN_EMAILS = ['rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'];

interface SystemLog {
  id: number;
  level: string;
  component: string;
  message: string;
  details: string;
  created_at: string;
}

interface Stats {
  total: number;
  info: number;
  warning: number;
  error: number;
  successRate: number;
}

export default function AdminLogsPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const router = useRouter();

  const fetchLogs = async () => {
    setLoading(true);
    try {
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
    if (!authLoading) {
      if (currentUser && currentUser.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) {
        setIsAdmin(true);
        fetchLogs();
      } else {
        alert("접근 권한이 없습니다.");
        router.push('/');
      }
    }
  }, [currentUser, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // 통계 계산
  const stats: Stats = {
    total: logs.length,
    info: logs.filter(l => l.level.toUpperCase() === 'INFO').length,
    warning: logs.filter(l => l.level.toUpperCase() === 'WARNING').length,
    error: logs.filter(l => l.level.toUpperCase() === 'ERROR').length,
    successRate: logs.length > 0
      ? Math.round((logs.filter(l => l.level.toUpperCase() === 'INFO').length / logs.length) * 100)
      : 0,
  };

  // 컴포넌트별 그룹핑
  const byComponent: Record<string, { info: number; warning: number; error: number }> = {};
  logs.forEach(log => {
    if (!byComponent[log.component]) byComponent[log.component] = { info: 0, warning: 0, error: 0 };
    const lvl = log.level.toUpperCase();
    if (lvl === 'INFO') byComponent[log.component].info++;
    else if (lvl === 'WARNING') byComponent[log.component].warning++;
    else if (lvl === 'ERROR') byComponent[log.component].error++;
  });

  // 오류/경고만 따로 (중요 이슈)
  const issues = logs.filter(l => l.level.toUpperCase() !== 'INFO');

  const formatDate = (created_at: string) => {
    const d = new Date(created_at + 'Z');
    return isNaN(d.getTime()) ? created_at : d.toLocaleString('ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#111111] text-gray-100 p-4 pt-24">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ServerCrash className="w-5 h-5 text-indigo-400" />
              시스템 오류 &amp; 알림 모니터링
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">최근 3일간 알림 발송 현황 요약</p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* 요약 통계 카드 4개 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                  <Bell className="w-3.5 h-3.5" />총 발송
                </div>
                <div className="text-2xl font-bold text-white">{stats.total}<span className="text-sm text-gray-500 font-normal ml-1">건</span></div>
              </div>
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-green-400 text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />성공률
                </div>
                <div className="text-2xl font-bold text-green-400">{stats.successRate}<span className="text-sm font-normal ml-0.5">%</span></div>
              </div>
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-yellow-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />경고
                </div>
                <div className="text-2xl font-bold text-yellow-400">{stats.warning}<span className="text-sm text-gray-500 font-normal ml-1">건</span></div>
              </div>
              <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-red-400 text-xs">
                  <ServerCrash className="w-3.5 h-3.5" />오류
                </div>
                <div className="text-2xl font-bold text-red-400">{stats.error}<span className="text-sm text-gray-500 font-normal ml-1">건</span></div>
              </div>
            </div>

            {/* 컴포넌트별 현황 */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />서비스별 발송 현황
              </h2>
              {Object.keys(byComponent).length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">기록된 데이터가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(byComponent).map(([comp, cnt]) => {
                    const total = cnt.info + cnt.warning + cnt.error;
                    const rate = Math.round((cnt.info / total) * 100);
                    return (
                      <div key={comp} className="flex items-center gap-3">
                        <div className="w-36 text-xs text-gray-400 shrink-0 truncate">{comp}</div>
                        <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${rate === 100 ? 'bg-green-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 shrink-0 w-20 text-right">
                          <span className="text-green-400">{cnt.info}</span>
                          {cnt.warning > 0 && <span className="text-yellow-400 ml-1">/{cnt.warning}⚠</span>}
                          {cnt.error > 0 && <span className="text-red-400 ml-1">/{cnt.error}✗</span>}
                          <span className="text-gray-600 ml-1">({rate}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 이슈 (경고/오류)만 표시 */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />주의 필요 항목
                {issues.length > 0 && (
                  <span className="ml-auto bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">{issues.length}건</span>
                )}
              </h2>
              {logs.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">기록된 데이터가 없습니다.</p>
              ) : issues.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400 text-sm py-3 justify-center">
                  <CheckCircle className="w-4 h-4" />모든 알림이 정상 발송되었습니다.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {issues.slice(0, 20).map(log => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-2 bg-black/30 rounded-lg cursor-pointer hover:bg-black/50 transition-colors"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      {log.level.toUpperCase() === 'ERROR'
                        ? <ServerCrash className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        : <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-indigo-400 font-medium">{log.component}</span>
                          <span className="text-gray-600">{formatDate(log.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-0.5 truncate">{log.message}</p>
                        {expandedId === log.id && log.details && (
                          <div className="mt-1.5 bg-black/60 p-2 rounded text-xs font-mono text-red-300 break-all border border-red-900/30">
                            {log.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 최근 정상 발송 요약 */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />최근 발송 내역 (최신 10건)
              </h2>
              {logs.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">기록된 데이터가 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {logs.slice(0, 10).map(log => {
                    const lvl = log.level.toUpperCase();
                    return (
                      <div key={log.id} className="flex items-center gap-3 text-xs py-1 border-b border-gray-800/50 last:border-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${lvl === 'ERROR' ? 'bg-red-500' : lvl === 'WARNING' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        <span className="text-indigo-400 w-28 shrink-0 truncate">{log.component}</span>
                        <span className="text-gray-400 flex-1 truncate">{log.message}</span>
                        <span className="text-gray-600 shrink-0">{formatDate(log.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
