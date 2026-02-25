"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { API_BASE_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
import { RefreshCw, Calendar, DollarSign, BarChart3, ChevronLeft, ChevronRight, Star } from "lucide-react";

interface CalendarEvent {
    symbol: string;
    name: string;
    type: "earnings" | "dividend" | "ipo";
    date: string;
    detail?: string;
    amount?: string;
}

export default function FinanceCalendarPage() {
    const router = useRouter();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"earnings" | "dividend" | "ipo">("earnings");

    // 이번 달 기준
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const fetchCalendar = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/calendar/events`);
            const json = await res.json();
            if (json.status === "success") {
                setEvents(json.data || []);
            }
        } catch (err) {
            console.error("Calendar fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCalendar(); }, []);

    const filterEvents = (type: string) => events.filter(e => e.type === type);

    const getMonthName = (date: Date) => {
        return date.toLocaleString("ko-KR", { year: "numeric", month: "long" });
    };

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const getEventsForDay = (day: number) => {
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return events.filter(e => e.date === dateStr);
    };

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

    const isToday = (day: number) => {
        const now = new Date();
        return now.getFullYear() === currentMonth.getFullYear() &&
            now.getMonth() === currentMonth.getMonth() &&
            now.getDate() === day;
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case "earnings": return "📊";
            case "dividend": return "💰";
            case "ipo": return "🆕";
            default: return "📅";
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case "earnings": return "border-blue-500/40 bg-blue-500/10";
            case "dividend": return "border-green-500/40 bg-green-500/10";
            case "ipo": return "border-purple-500/40 bg-purple-500/10";
            default: return "border-gray-500/40 bg-gray-500/10";
        }
    };

    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    return (
        <div className="min-h-screen pb-20 text-white bg-black">
            <Header title="투자 캘린더" subtitle="실적 발표 · 배당 · IPO 일정" />

            <div className="max-w-5xl mx-auto p-4 space-y-6">

                {/* Tabs */}
                <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
                    <button onClick={() => setActiveTab("earnings")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "earnings" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg" : "text-gray-400"}`}>
                        📊 실적 발표
                    </button>
                    <button onClick={() => setActiveTab("dividend")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "dividend" ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg" : "text-gray-400"}`}>
                        💰 배당 일정
                    </button>
                    <button onClick={() => setActiveTab("ipo")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "ipo" ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg" : "text-gray-400"}`}>
                        🆕 IPO
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6">
                    {/* Month Nav */}
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-xl font-black">{getMonthName(currentMonth)}</h3>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map(d => (
                            <div key={d} className={`text-center text-xs font-bold py-2 ${d === "일" ? "text-red-400" : d === "토" ? "text-blue-400" : "text-gray-500"}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for first week */}
                        {Array.from({ length: firstDay }, (_, i) => (
                            <div key={`empty-${i}`} className="min-h-[60px] md:min-h-[80px]" />
                        ))}

                        {/* Day cells */}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const dayEvents = getEventsForDay(day);
                            const dayOfWeek = (firstDay + i) % 7;
                            const filteredEvents = dayEvents.filter(e => e.type === activeTab);

                            return (
                                <div
                                    key={day}
                                    className={`min-h-[60px] md:min-h-[80px] rounded-xl p-1.5 border transition-colors ${isToday(day)
                                        ? "border-orange-500/50 bg-orange-500/10"
                                        : filteredEvents.length > 0
                                            ? "border-white/10 bg-white/5 hover:bg-white/10"
                                            : "border-transparent"
                                        }`}
                                >
                                    <span className={`text-xs font-bold ${isToday(day)
                                        ? "text-orange-400"
                                        : dayOfWeek === 0 ? "text-red-400" : dayOfWeek === 6 ? "text-blue-400" : "text-gray-300"
                                        }`}>
                                        {day}
                                    </span>
                                    <div className="space-y-0.5 mt-1">
                                        {filteredEvents.slice(0, 2).map((ev, j) => (
                                            <div
                                                key={j}
                                                className={`text-[9px] md:text-[10px] truncate rounded px-1 py-0.5 cursor-pointer border ${getEventColor(ev.type)}`}
                                                onClick={() => router.push(`/discovery?q=${ev.symbol}`)}
                                                title={`${ev.name} - ${ev.detail || ev.type}`}
                                            >
                                                {getEventIcon(ev.type)} {ev.name}
                                            </div>
                                        ))}
                                        {filteredEvents.length > 2 && (
                                            <span className="text-[9px] text-gray-500">+{filteredEvents.length - 2}개</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming Events List */}
                <div className="space-y-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-400" />
                        다가오는 {activeTab === "earnings" ? "실적 발표" : activeTab === "dividend" ? "배당" : "IPO"} 일정
                    </h3>

                    {loading ? (
                        <div className="text-center py-8 text-gray-500">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                            로딩 중...
                        </div>
                    ) : filterEvents(activeTab).length === 0 ? (
                        <p className="text-center text-gray-500 py-8 bg-white/5 rounded-2xl">
                            등록된 {activeTab === "earnings" ? "실적 발표" : activeTab === "dividend" ? "배당" : "IPO"} 일정이 없습니다.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {filterEvents(activeTab).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 15).map((ev, i) => {
                                const dDay = Math.ceil((new Date(ev.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div
                                        key={i}
                                        className={`border rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer ${getEventColor(ev.type)}`}
                                        onClick={() => router.push(`/discovery?q=${ev.symbol}`)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{getEventIcon(ev.type)}</span>
                                                <div>
                                                    <h4 className="font-bold text-sm">{ev.name} <span className="text-gray-500 text-xs">{ev.symbol}</span></h4>
                                                    <p className="text-xs text-gray-400">{ev.detail || ""}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-mono text-gray-300">{ev.date}</div>
                                                <span className={`text-xs font-bold ${dDay <= 3 ? "text-red-400" : dDay <= 7 ? "text-yellow-400" : "text-gray-400"}`}>
                                                    {dDay > 0 ? `D-${dDay}` : dDay === 0 ? "오늘" : `D+${Math.abs(dDay)}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <p className="text-center text-[10px] text-gray-600 mt-4">
                    * 일정은 예정일이며 변경될 수 있습니다. 정확한 정보는 각 기업 IR 페이지를 확인하세요.
                </p>
            </div>
        </div>
    );
}
