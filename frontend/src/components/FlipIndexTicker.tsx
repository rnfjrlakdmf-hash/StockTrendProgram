'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface MarketIndex {
    name: string;
    value: string;
    change: string;
    percent: string;
    direction: 'Up' | 'Down' | 'Equal';
}

const IndexCard = ({ data }: { data: MarketIndex }) => {
    const isUp = data.direction === 'Up';
    const isDown = data.direction === 'Down';
    
    // Choose color based on direction
    const colorClass = isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-gray-400';
    const bgClass = isUp ? 'bg-red-500/10 border-red-500/20' : isDown ? 'bg-blue-500/10 border-blue-500/20' : 'bg-gray-500/10 border-gray-500/20';
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, rotateX: -90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -10, rotateX: 90 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
            className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg border backdrop-blur-sm min-w-[80px] shadow-sm ${bgClass}`}
        >
            <div className="text-[8px] uppercase font-black tracking-tighter text-gray-400 mb-0 opacity-80">
                {data.name}
            </div>
            
            <div className="flex items-center gap-1 overflow-hidden">
                <span className="text-xs md:text-sm font-black text-white whitespace-nowrap">
                    {data.value}
                </span>
            </div>
            
            <div className={`flex items-center gap-0.5 text-[8px] font-bold ${colorClass}`}>
                {isUp ? <TrendingUp size={8} /> : isDown ? <TrendingDown size={8} /> : <Minus size={8} />}
                <span>{data.percent}</span>
            </div>
        </motion.div>
    );
};

export default function FlipIndexTicker() {
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchIndices = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/market/indices`);
            const json = await res.json();
            if (json.status === 'success') {
                setIndices(Array.isArray(json.data) ? json.data : []);
            }
        } catch (err) {
            console.error("Failed to fetch market indices:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndices();
        const interval = setInterval(fetchIndices, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading && (!Array.isArray(indices) || indices.length === 0)) {
        return (
            <div className="flex items-center gap-3 px-6 h-12">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-24 h-full bg-white/5 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center px-4 overflow-hidden pointer-events-none md:pointer-events-auto">
            <div className="flex items-center gap-3 perspective-1000">
                <AnimatePresence mode="wait">
                    {indices.map((index, i) => (
                        <IndexCard key={index.name} data={index} />
                    ))}
                </AnimatePresence>
            </div>
            
            <style jsx>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </div>
    );
}
