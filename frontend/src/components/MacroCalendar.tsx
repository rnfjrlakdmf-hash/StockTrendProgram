"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import { CalendarDays, AlertTriangle, Loader2 } from "lucide-react";

interface EconomicEvent {
    event: string;
    importance: string;
    time: string;
}

interface CalendarDay {
    date: string;
    day: string;
    events: EconomicEvent[];
}

export default function MacroCalendar() {
    const [calendar, setCalendar] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCalendar = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/market/calendar`);
                const json = await res.json();
                if (json.status === "success" && Array.isArray(json.data)) {
                    // [Fix] Group flat list by date
                    const grouped: { [key: string]: EconomicEvent[] } = {};
                    json.data.forEach((evt: any) => {
                        if (!grouped[evt.date]) grouped[evt.date] = [];
                        // Normalize importance
                        const importance = (evt.impact || "").toLowerCase() === "high" ? "High" : "Medium";
                        grouped[evt.date].push({
                            event: evt.event,
                            time: evt.time,
                            importance: importance
                        });
                    });

                    // Convert to array
                    const calendarData: CalendarDay[] = Object.keys(grouped).sort().map(date => {
                        const d = new Date(date);
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        return {
                            date: date,
                            day: days[d.getDay()],
                            events: grouped[date]
                        };
                    });

                    setCalendar(calendarData);
                }
            } catch (err) {
                console.error("Failed to fetch calendar", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCalendar();

        const interval = setInterval(fetchCalendar, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="text-center p-4"><Loader2 className="animate-spin text-gray-400" /></div>;

    const importantEvents = calendar.flatMap(day =>
        day.events.filter(e => e.importance === 'High').map(e => ({ ...e, date: day.date, day: day.day }))
    );

    return (
        <div className="rounded-3xl border border-white/5 bg-black/40 p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-6">
                <CalendarDays className="h-5 w-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white">이번 주 주요 경제 일정</h2>
            </div>

            {/* Vertical Agenda View (Calendar Style) */}
            <div className="space-y-4">
                {calendar.map((day, idx) => {
                    const isTodayChk = new Date().toISOString().slice(0, 10) === day.date;
                    const hasHighImpact = day.events.some(e => e.importance === 'High');

                    return (
                        <div key={idx} className={`rounded-xl border ${isTodayChk ? 'bg-blue-900/10 border-blue-500/50' : 'bg-white/5 border-white/5'} overflow-hidden transition-all hover:bg-white/10`}>
                            {/* Day Header */}
                            <div className={`px-4 py-2 flex items-center justify-between ${isTodayChk ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold ${['Saturday', 'Sunday'].includes(day.day) ? 'text-red-400' : 'text-gray-200'}`}>
                                        {day.day}
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono">{day.date}</span>
                                </div>
                                {isTodayChk && <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">TODAY</span>}
                            </div>

                            {/* Events List */}
                            <div className="p-3 space-y-2">
                                {day.events.length > 0 ? (
                                    day.events.map((evt, eIdx) => (
                                        <div key={eIdx} className="flex items-start gap-3 text-sm p-2 rounded hover:bg-black/20">
                                            {/* Time & Impact Indicator */}
                                            <div className="flex flex-col items-center min-w-[50px]">
                                                <span className={`text-xs font-mono font-bold ${evt.importance === 'High' ? 'text-red-400' : 'text-gray-400'}`}>
                                                    {evt.time}
                                                </span>
                                                {evt.importance === 'High' && (
                                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="High Impact"></span>
                                                )}
                                            </div>

                                            {/* Event Name */}
                                            <div className={`flex-1 break-words ${evt.importance === 'High' ? 'font-bold text-white' : 'text-gray-300'}`}>
                                                {evt.event}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-xs text-gray-600 py-2 italic">
                                        주요 일정 없음
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> High Impact
                </div>
            </div>
        </div>
    );
}
