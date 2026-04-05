
"use client";

import { useState, useEffect } from "react";
import { Clock, Globe } from "lucide-react";

interface MarketTime {
    name: string;
    tz: string;
    openHour: number;
    openMinute: number;
    closeHour: number;
    closeMinute: number;
}

const MARKETS: MarketTime[] = [
    { name: "서울 (KRX)", tz: "Asia/Seoul", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 30 },
    { name: "뉴욕 (NYSE)", tz: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
    { name: "런던 (LSE)", tz: "Europe/London", openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 30 },
];

// Basic holidays (YYYY-MM-DD) for Korea (Sample for 2025-2026)
// In a real app, strict holiday management per country is needed.
const KR_HOLIDAYS = [
    "2025-01-01", "2025-01-27", "2025-01-28", "2025-01-29", // New Year, Logunar New Year
    "2025-03-03", // Independence Day (obs)
    "2025-05-05", // Children's Day
    "2025-05-06", // Buddha's Birthday
    "2025-06-06", // Memorial Day
    "2025-08-15", // Liberation Day
    "2025-10-03", // Foundation Day
    "2025-10-06", // Chuseok (start)
    "2025-10-07", // Chuseok
    "2025-10-08", // Chuseok
    "2025-10-09", // Hangeul Day
    "2025-12-25", // Christmas
];

export default function MarketClock() {
    const [times, setTimes] = useState<Record<string, Date>>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const updateTime = () => {
            const now = new Date();
            const newTimes: Record<string, Date> = {};

            MARKETS.forEach(m => {
                const str = new Intl.DateTimeFormat('en-US', {
                    timeZone: m.tz,
                    year: 'numeric', month: 'numeric', day: 'numeric',
                    hour: 'numeric', minute: 'numeric', second: 'numeric',
                    hour12: false
                }).format(now);

                newTimes[m.name] = new Date(str);
            });
            setTimes(newTimes);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) {
        return (
            <div className="mb-4 h-[64px] animate-pulse bg-white/5 rounded-lg border border-white/5" />
        );
    }

    return (
        <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2 px-1 opacity-70">
                <Globe className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Time</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {MARKETS.map((m) => {
                    const localTime = times[m.name];
                    if (!localTime) return null;

                    const hours = localTime.getHours();
                    const minutes = localTime.getMinutes();
                    const day = localTime.getDay(); // 0: Sun, 6: Sat

                    const totalMinutes = hours * 60 + minutes;
                    const openMinutes = m.openHour * 60 + m.openMinute;
                    const closeMinutes = m.closeHour * 60 + m.closeMinute;

                    // 1. Time Check
                    const isTimeOpen = totalMinutes >= openMinutes && totalMinutes < closeMinutes;

                    // 2. Weekend Check
                    const isWeekday = day !== 0 && day !== 6;

                    // 3. Holiday Check (Only applying KR logic for now or generic)
                    // Format localTime to YYYY-MM-DD
                    const year = localTime.getFullYear();
                    const month = String(localTime.getMonth() + 1).padStart(2, '0');
                    const d = String(localTime.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${d}`;

                    let isHoliday = false;
                    if (m.name.includes("KRX")) {
                        if (KR_HOLIDAYS.includes(dateStr)) isHoliday = true;
                    }
                    // Add Logic for US/UK holidays if needed, currently only KR requested context usually

                    const isOpen = isTimeOpen && isWeekday && !isHoliday;

                    return (
                        <div
                            key={m.name}
                            className={`
                                flex flex-col items-center justify-center p-2 rounded-lg border transition-all
                                ${isOpen
                                    ? 'bg-blue-900/20 border-blue-500/40 shadow shadow-blue-900/20'
                                    : 'bg-white/5 border-white/5 opacity-60'}
                            `}
                        >
                            <span className={`text-[10px] font-bold mb-0.5 ${isOpen ? 'text-blue-300' : 'text-gray-500'}`}>
                                {m.name.split(' ')[0]}
                            </span>
                            <div 
                                className={`font-mono font-bold leading-none ${isOpen ? 'text-white text-xs' : 'text-gray-500 text-[10px]'}`}
                                suppressHydrationWarning
                            >
                                {localTime.getHours().toString().padStart(2, '0')}:{localTime.getMinutes().toString().padStart(2, '0')}
                            </div>
                            {isOpen && <div className="w-1 h-1 rounded-full bg-green-500 mt-1 animate-pulse" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
