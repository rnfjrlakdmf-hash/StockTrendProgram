import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI 증권사 리서치센터 목표주가 브리핑 & 실시간 외국인·기관 수급 | 스마트 투자 비서',
    description: '국내 증권사 애널리스트 최신 종목 리포트 목표주가 요약, 나스닥 100 선물 실시간 시세, 원/달러 환율, 미국 10대 빅테크(엔비디아·테슬라·브로드컴·애플) 및 외국인·기관 수급을 매일 3줄로 쉽게 정리해 드립니다.',
    keywords: [
        '증권사 리포트 요약',
        '오늘의 목표주가',
        '외국인 기관 수급',
        '나스닥 선물 실시간',
        '원달러 환율 전망',
        '미국 빅테크 주가',
        '엔비디아 주가 전망',
        '브로드컴 목표주가',
        '두산에너빌리티 목표주가',
        '삼성전자 주가 전망',
        'SK하이닉스 목표주가',
        '주식 시황 브리핑',
        '스마트 투자 비서'
    ],
    alternates: {
        canonical: '/ceo-office',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
        },
    },
    openGraph: {
        title: 'AI 증권사 리서치센터 목표주가 브리핑 & 실시간 외국인·기관 수급',
        description: '제도권 증권사 리포트 목표주가 컨센서스와 글로벌 선물·환율·빅테크 수급을 한눈에 확인하세요.',
        url: 'https://stock-trend-program.co.kr/ceo-office',
        type: 'website',
    },
};

export default function CeoOfficeLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
