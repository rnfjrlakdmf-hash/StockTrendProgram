import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, CalendarDays } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    streak?: number;
}

export default function AttendanceModal({ isOpen, onClose, userId, streak = 0 }: AttendanceModalProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    useEffect(() => {
        if (!isOpen || !userId) return;

        const fetchLogs = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/user/attendance/logs?user_id=${userId}&year=${year}&month=${month}`);
                const data = await res.json();
                if (data.status === 'success') {
                    setLogs(data.logs || []);
                }
            } catch (err) {
                console.error("Failed to fetch attendance logs", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();
    }, [isOpen, userId, year, month]);

    if (!isOpen) return null;

    // Calendar generation logic
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
    
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        return {
            dayNum,
            dateStr,
            isAttended: logs.includes(dateStr),
            isToday: dateStr === todayStr
        };
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/20 rounded-full blur-2xl"></div>
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex justify-center mb-3">
                        <div className="bg-white/20 p-3 rounded-full backdrop-blur-md shadow-lg relative z-10">
                            <CalendarDays className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1 relative z-10">출석체크 달력</h2>
                    <p className="text-blue-100 text-sm relative z-10">매일 출석하고 무료 코인을 받으세요!</p>
                </div>

                {/* Calendar Body */}
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">{year}년 {month}월</h3>
                        <div className="text-sm font-medium text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20 shadow-inner">
                            이번 달 {logs.length}일 출석
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-400 mb-2">
                        <div className="text-red-400">일</div>
                        <div>월</div>
                        <div>화</div>
                        <div>수</div>
                        <div>목</div>
                        <div>금</div>
                        <div className="text-blue-400">토</div>
                    </div>
                    
                    {/* Streak Info */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🔥</span>
                            <span className="text-blue-100 font-medium">현재 연속 출석: {streak}일</span>
                        </div>
                        <div className="text-sm text-blue-400">
                            {streak % 7 === 0 && streak > 0 
                                ? "🎉 오늘 보너스 달성!" 
                                : `다음 보너스까지 ${7 - (streak % 7)}일`}
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        
                        {blanks.map(b => (
                            <div key={`blank-${b}`} className="aspect-square"></div>
                        ))}
                        
                        {days.map(d => (
                            <div 
                                key={d.dayNum} 
                                className={`
                                    relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm font-medium transition-all duration-300
                                    ${d.isAttended ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-white shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'bg-gray-800/50 border border-white/5 text-gray-500'}
                                    ${d.isToday && !d.isAttended ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900' : ''}
                                `}
                            >
                                <span className={d.isAttended ? 'opacity-30' : ''}>{d.dayNum}</span>
                                
                                {d.isAttended && (
                                    <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-500 ease-out">
                                        <CheckCircle2 className="w-6 h-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-800 border-t border-white/5 text-center">
                    <button 
                        onClick={onClose}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
