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
        <div className="flex-1 bg-[#1c1c1e]/40 backdrop-blur-md rounded-2xl border border-white/5 p-5 shadow-lg">
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 ${theme}`}>
                {icon} {title}
            </h3>
            <div className="space-y-4">
                {items.map((item, idx) => (
                    <a 
                        key={idx} 
                        href={item.link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="group flex flex-col gap-1 cursor-pointer"
                    >
                        <h4 className="text-sm text-gray-200 font-bold group-hover:text-white transition-colors leading-snug line-clamp-2">
                            {item.title}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                            <div className="flex items-center gap-2">
                                <span>{item.publisher}</span>
                                {getNewsBadge(item.title)}
                            </div>
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row gap-6 mt-6">
            {renderNewsList(news.domestic, "한국 증시 주요 뉴스", <Newspaper className="w-4 h-4" />, "text-blue-400")}
            {renderNewsList(news.global, "글로벌 경제 특보", <Globe className="w-4 h-4" />, "text-purple-400")}
        </div>
    );
}
