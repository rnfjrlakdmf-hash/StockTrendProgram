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
    return null;
}
