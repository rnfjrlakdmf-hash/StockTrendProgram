'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';

interface WhaleEvent {
    id: string;
    corp: string;
    title: string;
    code: string;
    timestamp: any;
}

export default function WhaleSiren() {
    const [currentEvent, setCurrentEvent] = useState<WhaleEvent | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [mountedTime, setMountedTime] = useState<number>(0);

    useEffect(() => {
        setMountedTime(Date.now());
        // 사용자가 화면을 클릭하면 사운드 재생 권한 획득
        const handleInteract = () => setHasInteracted(true);
        window.addEventListener('click', handleInteract, { once: true });
        
        // 사이렌 사운드 프리로드 (오픈소스 또는 기본 알림음)
        audioRef.current = new Audio('https://www.soundjay.com/buttons/sounds/beep-01a.mp3');
        audioRef.current.volume = 0.5;

        return () => window.removeEventListener('click', handleInteract);
    }, []);

    useEffect(() => {
        let isChecking = false;

        const checkLatestEvent = async () => {
            if (isChecking) return;
            isChecking = true;
            try {
                const res = await fetch(`${API_BASE_URL}/api/live_events/latest`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.status === 'success' && json.data) {
                        const data = json.data;
                        let isRecent = true;
                        if (data.timestamp) {
                            if (Date.now() - data.timestamp > 60000) {
                                isRecent = false;
                            }
                        }

                        // 이미 띄운 이벤트면 스킵
                        if (isRecent && (!currentEvent || currentEvent.id !== data.id)) {
                            setCurrentEvent({
                                id: data.id,
                                corp: data.corp,
                                title: data.title,
                                code: data.code,
                                timestamp: data.timestamp
                            });

                            if (!isMuted && hasInteracted && audioRef.current) {
                                audioRef.current.play().catch(e => console.log('Audio play failed:', e));
                            }

                            setTimeout(() => {
                                setCurrentEvent(null);
                            }, 8000);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch whale event", e);
            } finally {
                isChecking = false;
            }
        };

        // 처음 1회 실행 후 5초마다 폴링
        checkLatestEvent();
        const interval = setInterval(checkLatestEvent, 5000);

        return () => clearInterval(interval);
    }, [isMuted, hasInteracted, currentEvent]);

    return (
        <AnimatePresence>
            {currentEvent && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="fixed top-20 right-6 z-[100] max-w-sm w-[calc(100%-3rem)] md:w-96"
                >
                    <div className="relative overflow-hidden bg-gradient-to-r from-red-900/90 to-red-800/90 backdrop-blur-xl border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.5)] rounded-2xl p-5 cursor-pointer">
                        {/* 경찰차 경광등 효과 (Blinking Background) */}
                        <motion.div
                            animate={{ opacity: [0, 0.4, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-transparent to-red-500/30 pointer-events-none"
                        />
                        
                        <div className="relative flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <motion.div
                                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.5 }}
                                >
                                    <AlertTriangle className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                                </motion.div>
                            </div>
                            
                            <Link href={`/discovery?q=${currentEvent.code}`} className="flex-1">
                                <div className="flex flex-col">
                                    <span className="text-red-300 font-bold text-xs tracking-wider uppercase mb-1">
                                        🚨 세력 포착 라이브
                                    </span>
                                    <h3 className="text-white font-extrabold text-lg leading-tight mb-1">
                                        {currentEvent.corp}
                                    </h3>
                                    <p className="text-red-100 text-sm leading-snug line-clamp-2">
                                        {currentEvent.title}
                                    </p>
                                </div>
                            </Link>

                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsMuted(!isMuted);
                                }}
                                className="flex-shrink-0 p-2 rounded-full hover:bg-white/10 transition-colors text-white/70"
                                title={isMuted ? "소리 켜기" : "소리 끄기"}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
