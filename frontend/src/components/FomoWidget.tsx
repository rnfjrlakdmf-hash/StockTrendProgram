'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';

interface FomoItem {
    ticker: string;
    name: string;
    message: string;
}

const FALLBACK_ITEMS: FomoItem[] = [
    { ticker: '005930', name: '삼성전자', message: '방금 누군가 AI 리포트를 확인했습니다!' },
    { ticker: '000660', name: 'SK하이닉스', message: '실시간 검색 급등 종목입니다.' },
    { ticker: '086520', name: '에코프로', message: '방금 새로운 종토방 댓글이 달렸습니다!' },
    { ticker: '035420', name: 'NAVER', message: '외국인 매수세 알림이 발생했습니다.' },
    { ticker: '035720', name: '카카오', message: '방금 누군가 포트폴리오에 추가했습니다.' },
];

export default function FomoWidget() {
    const [currentItem, setCurrentItem] = useState<FomoItem | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hotStocks, setHotStocks] = useState<FomoItem[]>(FALLBACK_ITEMS);

    useEffect(() => {
        const fetchHotStocks = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/community/hot-stocks`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.data && data.data.length > 0) {
                        const items = data.data.map((item: any) => ({
                            ticker: item.symbol,
                            name: `종목 ${item.symbol}`, 
                            message: '현재 커뮤니티 반응이 가장 뜨거운 종목입니다!'
                        }));
                        setHotStocks([...items, ...FALLBACK_ITEMS]);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch hot stocks", e);
            }
        };
        fetchHotStocks();
    }, []);

    useEffect(() => {
        // Initial delay before showing the first popup
        const initialTimeout = setTimeout(() => {
            showRandomItem();
        }, 3000);

        const showInterval = setInterval(() => {
            showRandomItem();
        }, 20000); // Show every 20 seconds

        const showRandomItem = () => {
            const randomItem = hotStocks[Math.floor(Math.random() * hotStocks.length)];
            setCurrentItem(randomItem);
            setIsVisible(true);

            setTimeout(() => {
                setIsVisible(false);
            }, 6000);
        };

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(showInterval);
        };
    }, [hotStocks]);

    return (
        <AnimatePresence>
            {isVisible && currentItem && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 20, x: 50 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="fixed bottom-6 right-6 z-50"
                >
                    <Link href={`/stock/${currentItem.ticker}`}>
                        <div className="bg-slate-800/90 backdrop-blur-md border border-indigo-500/30 shadow-2xl rounded-2xl p-4 cursor-pointer hover:bg-slate-700/90 transition-colors flex items-center gap-4 max-w-sm">
                            <div className="flex-shrink-0 w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                                <span className="text-xl">🔥</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">
                                    <span className="text-indigo-400 font-bold">{currentItem.name}</span>
                                    <span className="text-slate-400 text-xs ml-2">({currentItem.ticker})</span>
                                </p>
                                <p className="text-xs text-slate-300 mt-1">{currentItem.message}</p>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
