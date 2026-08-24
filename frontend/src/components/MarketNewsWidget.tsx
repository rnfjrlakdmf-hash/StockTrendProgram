"use client";

import React, { useState, useEffect } from 'react';
import { Newspaper, Globe, ChevronRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from "@/lib/config";

interface NewsItem {
    title: string;
    link: string;
    publisher: string;
    time: string;
}

export default function MarketNewsWidget() {
    const [news, setNews] = useState<{ domestic: NewsItem[], global: NewsItem[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchNews = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/news`);
            if (!res.ok) return;
            const json = await res.json();
            if (json.status === "success" && json.data) {
                setNews(json.data);
            }
        } catch (e) {
            console.error("Failed to fetch market news", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
        // Refresh every 5 minutes
        const interval = setInterval(fetchNews, 300000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="w-full h-48 bg-white/5 rounded-2xl animate-pulse flex items-center justify-center border border-white/5">
                <Loader2 className="w-6 h-6 text-gray-700 animate-spin" />
            </div>
        );
    }

    if (!news) return null;

    const getNewsBadge = (title: string) => {
        const goodKeywords = ['무상증자', '수주', '계약', '흑자', '상향', '배당', '공급', '특허', '자사주', '최대실적', '돌파', '상한가', '영업익', '영업이익', '↑', '급등', 'MOU', '체결'];
        const badKeywords = ['유상증자', '하향', '적자', '횡령', '배임', '소송', '상장폐지', '정지', '지연', '해지', '처분', '블록딜', '하한가', '급락', '↓', '매각'];
        
        if (goodKeywords.some(k => title.includes(k))) {
            return <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] rounded border border-red-500/20 font-black tracking-widest">호재</span>;
        }
        if (badKeywords.some(k => title.includes(k))) {
            return <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] rounded border border-blue-500/20 font-black tracking-widest">악재</span>;
        }
        return <span className="px-1.5 py-0.5 bg-gray-500/10 text-gray-400 text-[9px] rounded border border-gray-500/20 font-black tracking-widest">특징</span>;
    };

    const renderNewsList = (items: NewsItem[], title: string, icon: React.ReactNode, theme: string) => (
        <div className="flex-1 bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-white/10 p-5 md:p-6 shadow-xl">
            <h3 className={`text-sm md:text-base font-black flex items-center gap-2 mb-4 pb-3 border-b border-white/5 ${theme}`}>
                {icon} <span>{title}</span>
            </h3>
            <div className="space-y-3.5">
                {items.map((item, idx) => (
                    <a 
                        key={idx} 
                        href={item.link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="group flex flex-col gap-1.5 p-2.5 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 cursor-pointer"
                    >
                        <h4 className="text-xs sm:text-sm text-gray-200 font-bold group-hover:text-white transition-colors leading-snug line-clamp-2">
                            {item.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-medium">{item.publisher}</span>
                                {getNewsBadge(item.title)}
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-gray-400" />
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row gap-5 mt-6">
            {renderNewsList(news.domestic, "한국 증시 실시간 주요 뉴스", <Newspaper className="w-4 h-4 text-blue-400" />, "text-white")}
            {renderNewsList(news.global, "글로벌 증시 & 경제 특보", <Globe className="w-4 h-4 text-purple-400" />, "text-white")}
        </div>
    );
}
