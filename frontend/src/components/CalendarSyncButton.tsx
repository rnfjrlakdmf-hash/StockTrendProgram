"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoginModal from '@/components/LoginModal';

interface CalendarSyncButtonProps {
    stockName: string;
}

export default function CalendarSyncButton({ stockName }: CalendarSyncButtonProps) {
    const { user } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);

    const handleClick = () => {
        if (!user) {
            setShowLoginModal(true);
        } else {
            const text = encodeURIComponent(`[STOCK AI] ${stockName} 실적 및 배당일 체크`);
            window.open(`https://calendar.google.com/calendar/r/eventedit?text=${text}`, '_blank');
        }
    };

    return (
        <>
            <button
                onClick={handleClick}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 md:gap-2 transition-colors border border-gray-600 shadow-lg"
            >
                <span className="hidden md:inline">🗓 캘린더 연동</span>
                <span className="inline md:hidden">🗓 연동</span>
            </button>
            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </>
    );
}
