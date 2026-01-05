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
                if (json.status === "success") {
                    setCalendar(json.data);
                }
            } catch (err) {
                console.error("Failed to fetch calendar", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCalendar();
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

            {/* Highlight Section (Next High Impact) */}
            {importantEvents.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-blue-900/20 border border-blue-500/30">
                    <h3 className="text-blue-200 font-bold mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-blue-400" />
                        주목해야 할 일정 (High Impact)
                    </h3>
                    <ul className="space-y-2">
                        {importantEvents.slice(0, 2).map((evt, idx) => (
                            <li key={idx} className="text-sm text-gray-200 flex justify-between items-center">
                                <span>{evt.event}</span>
                                <span className="text-xs bg-black/40 px-2 py-1 rounded text-gray-400">{evt.day} {evt.time}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Weekly Timeline */}
            <div className="space-y-4">
                {calendar.map((day, idx) => (
                    <div key={idx} className={`relative pl-4 border-l-2 ${day.events.some(e => e.importance === 'High') ? 'border-red-400' : 'border-white/10'}`}>
                        <div className="mb-2">
                            <span className="text-sm font-bold text-white">{day.day}</span>
                            <span className="text-xs text-gray-500 ml-2">{day.date}</span>
                        </div>
                        {day.events.length > 0 ? (
                            <ul className="space-y-2">
                                {day.events.map((evt, eIdx) => (
                                    <li key={eIdx} className="text-sm flex items-start gap-2">
                                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${evt.importance === 'High' ? 'bg-red-400' : 'bg-gray-500'}`} />
                                        <div>
                                            <div className="text-gray-300">{evt.event}</div>
                                            <div className="text-xs text-gray-500">{evt.time}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-600">주요 일정 없음</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
