'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { TrendingUp, Search, Eye, Sparkles, MapPin, UserCircle, Send } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface FomoItem {
    ticker: string;
    name: string;
    messageTemplate: string;
    type: 'view' | 'search' | 'analyze' | 'trend' | 'telegram';
    location?: string;
}

const LOCATIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '경기', '익명'];
const getRandomLocation = () => LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

const FALLBACK_ITEMS: Partial<FomoItem>[] = [
    { name: '삼성전자', ticker: '005930' },
    { name: 'SK하이닉스', ticker: '000660' },
    { name: '에코프로', ticker: '086520' },
    { name: 'NAVER', ticker: '035420' },
    { name: '알테오젠', ticker: '196170' },
    { name: '한미반도체', ticker: '042700' },
    { name: 'HLB', ticker: '028300' },
    { name: '초전도체 관련주', ticker: 'theme' },
    { name: 'AI 반도체 테마', ticker: 'theme' },
    { name: '실시간 속보방', ticker: 'telegram' },
];

const TEMPLATES = [
    { template: "[LOC]의 한 유저가 방금 [ITEM] 수익률을 확인했습니다.", type: 'view' },
    { template: "[LOC]의 유저가 [ITEM] 실시간 시그널을 조회했습니다.", type: 'search' },
    { template: "방금 누군가 [ITEM] AI 분석 리포트를 열람했습니다.", type: 'analyze' },
    { template: "현재 [ITEM]에 트래픽이 폭주하고 있습니다!", type: 'trend' },
    { template: "방금 [ITEM] 관련 긴급 속보가 공유되었습니다.", type: 'trend' },
    { template: "👤 방금 [LOC]의 누군가가 [ITEM] 텔레그램에 입장했습니다.", type: 'telegram' },
];

export default function FomoWidget() {
    const [currentItem, setCurrentItem] = useState<FomoItem | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [baseItems, setBaseItems] = useState<Partial<FomoItem>[]>(FALLBACK_ITEMS);

    useEffect(() => {
        const fetchHotStocks = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/community/hot-stocks`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.data && data.data.length > 0) {
                        const items = data.data.map((item: any) => ({
                            ticker: item.symbol,
                            name: item.name || `종목 ${item.symbol}`, 
                        }));
                        setBaseItems([...items, ...FALLBACK_ITEMS]);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch hot stocks", e);
            }
        };
        fetchHotStocks();
    }, []);

    useEffect(() => {
        const showRandomItem = () => {
            const randomItem = baseItems[Math.floor(Math.random() * baseItems.length)];
            const randomTemplate = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
            const loc = getRandomLocation();
            
            setCurrentItem({
                ticker: randomItem.ticker || '',
                name: randomItem.name || '',
                messageTemplate: randomTemplate.template,
                type: randomTemplate.type as any,
                location: loc,
            });
            setIsVisible(true);

            setTimeout(() => {
                setIsVisible(false);
            }, 5000); // 5초 동안 표시
        };

        const initialTimeout = setTimeout(() => {
            showRandomItem();
        }, 3000);

        const showInterval = setInterval(() => {
            // 무작위로 10초 ~ 20초 사이
            if (!isVisible) {
                setTimeout(showRandomItem, Math.random() * 5000);
            }
        }, 15000);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(showInterval);
        };
    }, [baseItems, isVisible]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'view': return <Eye className="w-5 h-5 text-purple-400" />;
            case 'search': return <Search className="w-5 h-5 text-blue-400" />;
            case 'analyze': return <Sparkles className="w-5 h-5 text-yellow-400" />;
            case 'trend': return <TrendingUp className="w-5 h-5 text-red-400" />;
            case 'telegram': return <Send className="w-5 h-5 text-blue-500" />;
            default: return <UserCircle className="w-5 h-5 text-indigo-400" />;
        }
    };

    return (
        <AnimatePresence>
            {isVisible && currentItem && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: -20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 20, x: -50 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="fixed bottom-6 left-6 md:left-[344px] z-[60] max-w-sm w-[calc(100%-3rem)] md:w-auto"
                >
                    <Link 
                        href={currentItem.ticker === 'telegram' ? 'https://t.me/stocktrend_live' : (currentItem.ticker === 'theme' ? '/themes' : `/stock/${currentItem.ticker}`)}
                        target={currentItem.ticker === 'telegram' ? '_blank' : undefined}
                    >
                        <div className="bg-black/85 backdrop-blur-md border border-cyan-500/30 shadow-[0_8px_30px_rgba(6,182,212,0.2)] rounded-2xl p-4 cursor-pointer hover:bg-slate-900/90 hover:border-cyan-400/50 transition-all flex items-start gap-3 group">
                            <div className="flex-shrink-0 mt-0.5 p-2 bg-slate-800/50 rounded-full group-hover:scale-110 transition-transform">
                                {getIcon(currentItem.type)}
                            </div>
                            <div className="flex flex-col">
                                <p 
                                    className="text-sm text-gray-200 leading-snug"
                                    dangerouslySetInnerHTML={{ 
                                        __html: currentItem.messageTemplate
                                            .replace('[LOC]', currentItem.location === '익명' ? '익명' : `<span class="text-gray-400">${currentItem.location}</span>`)
                                            .replace('[ITEM]', `<strong class="text-cyan-400">${currentItem.name}</strong>`)
                                    }}
                                />
                                <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                    방금 전 • 실시간 트래픽
                                </span>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
