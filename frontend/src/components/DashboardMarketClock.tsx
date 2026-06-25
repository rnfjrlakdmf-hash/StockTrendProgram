"use client";

import { useState, useEffect } from "react";
import { Clock, Globe, ArrowRight, ShieldCheck, Activity } from "lucide-react";

interface MarketTime {
    name: string;
    city: string;
    tz: string;
    openHour: number;
    openMinute: number;
    closeHour: number;
    closeMinute: number;
    flag: string;
    exchange: string;
}

const MARKETS: MarketTime[] = [
    { name: "대한민국", city: "서울", exchange: "KRX", tz: "Asia/Seoul", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 30, flag: "🇰🇷" },
    { name: "미국", city: "뉴욕", exchange: "NYSE", tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0, flag: "🇺🇸" },
    { name: "일본", city: "도쿄", exchange: "TSE", tz: "Asia/Tokyo", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 0, flag: "🇯🇵" },
    { name: "영국", city: "런던", exchange: "LSE", tz: "Europe/London", openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 30, flag: "🇬🇧" },
];

const FIXED_HOLIDAYS: Record<string, string[]> = {
    "대한민국": ["01-01", "03-01", "05-01", "05-05", "06-06", "08-15", "10-03", "10-09", "12-25"],
    "미국": ["01-01", "06-19", "07-04", "12-25"],
    "일본": ["01-01", "01-02", "01-03", "04-29", "05-03", "05-04", "05-05", "08-11", "11-03", "11-23"],
    "영국": ["01-01", "12-25", "12-26"]
};

const YEAR_SPECIFIC_HOLIDAYS: Record<string, string[]> = {
    "대한민국": [
        // 2025
        "2025-01-27", "2025-01-28", "2025-01-29", "2025-03-03", "2025-05-06", "2025-10-06", "2025-10-07", "2025-10-08",
        // 2026
        "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-02", "2026-05-25", "2026-09-24", "2026-09-25", "2026-09-26"
    ],
    "미국": [
        // 2025
        "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26", "2025-09-01", "2025-11-27",
        // 2026
        "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-09-07", "2026-11-26"
    ],
    "일본": [
        // 2025
        "2025-01-13", "2025-02-11", "2025-02-24", "2025-03-20", "2025-05-06", "2025-07-21", "2025-09-15", "2025-09-22", "2025-09-23", "2025-10-13", "2025-11-24",
        // 2026
        "2026-01-12", "2026-02-11", "2026-02-23", "2026-03-20", "2026-05-06", "2026-07-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-10-12", "2026-11-24"
    ],
    "영국": [
        // 2025
        "2025-04-18", "2025-04-21", "2025-05-05", "2025-05-26", "2025-08-25",
        // 2026
        "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31"
    ]
};

export default function DashboardMarketClock() {
    const [times, setTimes] = useState<Record<string, Date>>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const updateTime = () => {
            const now = new Date();
            const newTimes: Record<string, Date> = {};

            MARKETS.forEach(m => {
                try {
                    const str = new Intl.DateTimeFormat('en-US', {
                        timeZone: m.tz,
                        year: 'numeric', month: 'numeric', day: 'numeric',
                        hour: 'numeric', minute: 'numeric', second: 'numeric',
                        hour12: false
                    }).format(now);
                    newTimes[m.name] = new Date(str);
                } catch (e) {
                    newTimes[m.name] = now;
                }
            });
            setTimes(newTimes);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000); // 1초마다 실시간 갱신 (초시계용)
        return () => clearInterval(interval);
    }, []);

    if (!mounted) {
        return (
            <div className="w-full h-[180px] animate-pulse bg-white/[0.02] border border-white/5 rounded-3xl" />
        );
    }

    // Calculate active markets count
    let activeMarketsCount = 0;
    const marketStatuses = MARKETS.map(m => {
        const localTime = times[m.name];
        if (!localTime) return { 
            ...m, 
            isOpen: false, 
            formattedTime: "00:00:00", 
            formattedDate: "", 
            progress: 0, 
            isHoliday: false,
            hh: "00",
            mm: "00",
            ss: "00",
            hours: 0,
            minutes: 0,
            seconds: 0,
            isWeekday: false
        };

        const hours = localTime.getHours();
        const minutes = localTime.getMinutes();
        const seconds = localTime.getSeconds();
        const day = localTime.getDay(); // 0: Sun, 6: Sat

        const totalMinutes = hours * 60 + minutes;
        const openMinutes = m.openHour * 60 + m.openMinute;
        const closeMinutes = m.closeHour * 60 + m.closeMinute;

        const isTimeOpen = totalMinutes >= openMinutes && totalMinutes < closeMinutes;
        const isWeekday = day !== 0 && day !== 6;

        const year = localTime.getFullYear();
        const month = String(localTime.getMonth() + 1).padStart(2, '0');
        const d = String(localTime.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${d}`;
        const mmDd = `${month}-${d}`;

        let isHoliday = false;
        
        // 1. 고정 공휴일 체크 (MM-DD)
        const fixedList = FIXED_HOLIDAYS[m.name] || [];
        if (fixedList.includes(mmDd)) {
            isHoliday = true;
        }
        
        // 2. 대체 공휴일 및 변동 공휴일 체크 (YYYY-MM-DD)
        const yearList = YEAR_SPECIFIC_HOLIDAYS[m.name] || [];
        if (yearList.includes(dateStr)) {
            isHoliday = true;
        }

        const isOpen = isTimeOpen && isWeekday && !isHoliday;
        if (isOpen) activeMarketsCount++;

        // Format Time with leading zeros
        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');

        // Format Date
        const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
        const formattedDate = `${year}.${month}.${d} (${dayNames[day]})`;

        // Calculate progress percentage
        let progress = 0;
        if (totalMinutes >= openMinutes && totalMinutes <= closeMinutes) {
            const totalDuration = closeMinutes - openMinutes;
            const elapsed = totalMinutes - openMinutes;
            progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
        } else if (totalMinutes > closeMinutes) {
            progress = 100;
        }

        return {
            ...m,
            isOpen,
            hh,
            mm,
            ss,
            formattedDate,
            progress,
            hours,
            minutes,
            seconds,
            isWeekday,
            isHoliday
        } as MarketTime & {
            isOpen: boolean,
            hh: string,
            mm: string,
            ss: string,
            formattedDate: string,
            progress: number,
            hours: number,
            minutes: number,
            seconds: number,
            isWeekday: boolean,
            isHoliday: boolean
        };
    });

    return (
        <div className="w-full bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden group">
            {/* Background Decorative Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700 pointer-events-none" />

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse">
                        <Globe className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-white tracking-tight">글로벌 거래소 전광판</h3>
                            <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-md animate-pulse">
                                Time Sync
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">전 세계 주요 증시의 현재 운영 상태와 초단위 시간 정보입니다.</p>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2.5 bg-black/40 border border-white/5 rounded-2xl px-4 py-2 shadow-inner">
                    <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-green-400 animate-spin" />
                        <span className="text-xs font-black text-white">활성 시장</span>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <span className="text-xs font-black text-green-400">
                        {activeMarketsCount}개 거래소 개장중
                    </span>
                </div>
            </div>

            {/* Grid Clock Layout */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {marketStatuses.map((m) => {
                    return (
                        <div
                            key={m.name}
                            className={`
                                relative p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden
                                ${m.isOpen
                                    ? 'bg-gradient-to-br from-blue-950/20 via-blue-900/10 to-black/40 border-blue-500/30 shadow-[0_4px_20px_rgba(59,130,246,0.15)]'
                                    : 'bg-white/[0.01] border-white/5 opacity-70 hover:opacity-100'}
                            `}
                        >
                            {/* Neon Indicator line on top */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${m.isOpen ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-transparent'}`} />

                            {/* Market title */}
                            <div className="flex items-center justify-between mb-3 z-10">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg leading-none" role="img" aria-label={m.name}>
                                        {m.flag}
                                    </span>
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 leading-none mb-0.5">{m.name}</div>
                                        <div className="text-xs font-black text-white leading-none">{m.city} ({m.exchange})</div>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                    m.isOpen
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse'
                                        : m.isHoliday
                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                                            : 'bg-white/5 text-gray-500 border border-white/5'
                                }`}>
                                    {m.isOpen ? 'OPEN' : m.isHoliday ? 'HOLIDAY' : 'CLOSED'}
                                </span>
                            </div>

                            {/* Real-time Ticking Clock */}
                            <div className="my-3 z-10 flex flex-col items-center justify-center py-2 bg-black/30 border border-white/5 rounded-xl">
                                <div className="tabular-nums tracking-tight font-black text-2xl md:text-3xl text-white leading-none flex items-baseline">
                                    <span>{m.hh}</span>
                                    <span className="animate-pulse mx-0.5 text-blue-500">:</span>
                                    <span>{m.mm}</span>
                                    <span className="animate-pulse mx-0.5 text-blue-500">:</span>
                                    <span className="text-lg md:text-xl text-blue-400 font-extrabold ml-0.5 min-w-[20px] inline-block">{m.ss}</span>
                                </div>
                                <div className="text-[9px] text-gray-500 font-bold mt-1.5 tracking-wider">
                                    {m.formattedDate}
                                </div>
                            </div>

                            {/* Market trading hours & Progress */}
                            <div className="mt-2 z-10 space-y-1.5">
                                <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold">
                                    <span>운영 {String(m.openHour).padStart(2, '0')}:{String(m.openMinute).padStart(2, '0')} - {String(m.closeHour).padStart(2, '0')}:{String(m.closeMinute).padStart(2, '0')}</span>
                                    {m.isOpen && (
                                        <span className="text-blue-400 text-[8px] animate-pulse">
                                            진행률 {Math.round(m.progress)}%
                                        </span>
                                    )}
                                </div>

                                {/* Progress bar */}
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className={`h-full transition-all duration-1000 ${
                                            m.isOpen
                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-400 animate-pulse'
                                                : 'bg-gray-700'
                                        }`}
                                        style={{ width: `${m.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
