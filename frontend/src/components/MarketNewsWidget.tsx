"use client";

import React, { useState, useEffect } from 'react';
import { Newspaper, Globe, ChevronRight, Loader2, Sparkles, TrendingUp, AlertTriangle, ExternalLink, Clock } from 'lucide-react';
import { API_BASE_URL } from "@/lib/config";

interface NewsItem {
    title: string;
    link: string;
    publisher: string;
    time: string;
}

// 주요 관련 종목 및 핵심 키워드 자동 추출
const extractKeywords = (title: string): string[] => {
    const targets = [
        '삼성전자', 'SK하이닉스', 'LG에너지솔루션', '현대차', '기아', '셀트리온', '삼성바이오로직스',
        '에코프로', '에코프로비엠', '카카오', 'NAVER', '한진칼', '포스코홀딩스', 'POSCO홀딩스',
        '엔비디아', '테슬라', '애플', '마이크로소프트', '알파벳', '구글', '메타', '브로드컴', 'TSMC',
        '코스피', '코스닥', '나스닥', 'S&P500', '환율', '국채금리'
    ];
    return targets.filter(k => title.includes(k)).slice(0, 2);
};

// 뉴스 심리 및 영향도 분석 태그
const getNewsSentiment = (title: string) => {
    const goodKeywords = ['급등', '상한가', '신고가', '최대실적', '흑자', '수주', '돌파', '폭등', '호실적', '상향', '매집', '호재', '배당'];
    const badKeywords = ['급락', '하한가', '신저가', '적자', '소송', '횡령', '하향', '폭락', '충격', '비상', '추락', '악재', '우려', '부담'];
    const macroKeywords = ['금리', '환율', '연준', 'Fed', '인플레', '유가', '전쟁', '관세', '물가', '실업률', '빅 이벤트'];

    if (goodKeywords.some(k => title.includes(k))) {
        return { label: '상승 모멘텀', style: 'text-rose-400 bg-rose-500/10 border-rose-500/25', icon: '🔥' };
    }
    if (badKeywords.some(k => title.includes(k))) {
        return { label: '하방 리스크', style: 'text-blue-400 bg-blue-500/10 border-blue-500/25', icon: '📉' };
    }
    if (macroKeywords.some(k => title.includes(k))) {
        return { label: '매크로 특보', style: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25', icon: '⚡' };
    }
    return { label: '핵심 포커스', style: 'text-amber-400 bg-amber-500/10 border-amber-500/25', icon: '🎯' };
};

export default function MarketNewsWidget() {
    const [news, setNews] = useState<{ domestic: NewsItem[], global: NewsItem[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState<string>('');

    const fetchNews = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/news`);
            if (!res.ok) return;
            const json = await res.json();
            if (json.status === "success" && json.data) {
                setNews(json.data);
                setLastSync(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
            }
        } catch (e) {
            console.error("Failed to fetch market news", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
        const interval = setInterval(fetchNews, 180000); // 3분 주기 자동 갱신
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="w-full h-64 bg-zinc-950/60 rounded-3xl animate-pulse flex flex-col items-center justify-center border border-white/10 gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-xs text-zinc-400 font-medium">실시간 국내외 마켓 뉴스 데이터를 수신 중입니다...</span>
            </div>
        );
    }

    if (!news) return null;

    const renderNewsList = (
        items: NewsItem[], 
        title: string, 
        subtitle: string,
        icon: React.ReactNode, 
        badgeText: string,
        badgeStyle: string
    ) => (
        <div className="flex-1 bg-zinc-950/80 backdrop-blur-xl rounded-3xl border border-white/10 p-5 md:p-6 shadow-2xl flex flex-col justify-between">
            {/* 상단 헤더 섹션 */}
            <div className="pb-4 mb-4 border-b border-white/10 flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-sm md:text-base font-black text-white tracking-tight flex items-center gap-2">
                                <span>{title}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                                    {badgeText}
                                </span>
                            </h3>
                            <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
                        </div>
                    </div>
                </div>

                {lastSync && (
                    <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-1 rounded-md border border-white/5 shrink-0 hidden sm:inline-block">
                        {lastSync} 갱신
                    </span>
                )}
            </div>

            {/* 뉴스 리스트 */}
            <div className="space-y-3">
                {items.slice(0, 6).map((item, idx) => {
                    const sentiment = getNewsSentiment(item.title);
                    const keywords = extractKeywords(item.title);
                    const redirectUrl = `/news-redirect?target=${encodeURIComponent(item.link)}&title=${encodeURIComponent(item.title)}&source=${encodeURIComponent(item.publisher)}`;

                    return (
                        <a 
                            key={idx} 
                            href={redirectUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="group p-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-amber-500/30 transition-all duration-200 cursor-pointer block relative overflow-hidden shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-start gap-3">
                                {/* 순번 번호 배지 */}
                                <span className="font-mono text-xs font-black text-zinc-500 group-hover:text-amber-400 transition-colors w-5 shrink-0 pt-0.5">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>

                                <div className="flex-1 min-w-0 space-y-2">
                                    {/* 뉴스 제목 */}
                                    <h4 className="text-xs sm:text-sm text-zinc-200 font-bold group-hover:text-white leading-snug line-clamp-2 transition-colors">
                                        {item.title}
                                    </h4>

                                    {/* 메타 정보 칩 라인 */}
                                    <div className="flex items-center justify-between gap-2 pt-0.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {/* 언론사 */}
                                            <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                {item.publisher}
                                            </span>

                                            {/* 감성/영향도 배지 */}
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${sentiment.style}`}>
                                                <span>{sentiment.icon}</span>
                                                <span>{sentiment.label}</span>
                                            </span>

                                            {/* 관련 포착 종목 태그 */}
                                            {keywords.map((kw, kIdx) => (
                                                <span key={kIdx} className="text-[10px] font-bold text-amber-300/90 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                                                    #{kw}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center text-zinc-500 group-hover:text-amber-400 transition-colors shrink-0">
                                            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-5 mt-6">
            {renderNewsList(
                news.domestic, 
                "한국 증시 실시간 핵심 뉴스", 
                "코스피·코스닥 수급 집중 및 시장 주도 테마 헤드라인",
                <Newspaper className="w-5 h-5 text-blue-400" />, 
                "국내 핫이슈",
                "bg-blue-500/15 text-blue-300 border-blue-500/30"
            )}
            {renderNewsList(
                news.global, 
                "글로벌 증시 & 경제 특보", 
                "월가 빅테크·FOMC 금리·환율·원자재 국제 경제 동향",
                <Globe className="w-5 h-5 text-purple-400" />, 
                "월스트리트",
                "bg-purple-500/15 text-purple-300 border-purple-500/30"
            )}
        </div>
    );
}
