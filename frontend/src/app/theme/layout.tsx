import { Metadata } from 'next';

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://13.209.99.170:8000';
};

export const metadata: Metadata = {
    title: '이슈 테마 분석 - StockTrendProgram',
    description: 'AI가 분석한 현재 핫한 주식 테마와 관련 대장주, 리스크를 확인해보세요.',
    openGraph: {
        title: '이슈 테마 분석 - StockTrendProgram',
        description: 'AI가 분석한 현재 핫한 주식 테마와 관련 대장주, 리스크를 확인해보세요.',
        images: [
            {
                url: `${getApiBaseUrl() === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/api/og?title=${encodeURIComponent('이슈 테마 분석')}&subtitle=${encodeURIComponent('AI가 실시간으로 분석한 오늘의 핫 테마')}&theme=${encodeURIComponent('StockTrendProgram')}`,
                width: 1200,
                height: 630,
                alt: '테마 분석',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: '이슈 테마 분석 - StockTrendProgram',
        description: 'AI가 분석한 현재 핫한 주식 테마와 관련 대장주, 리스크를 확인해보세요.',
        images: [`${getApiBaseUrl() === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/api/og?title=${encodeURIComponent('이슈 테마 분석')}&subtitle=${encodeURIComponent('AI가 실시간으로 분석한 오늘의 핫 테마')}&theme=${encodeURIComponent('StockTrendProgram')}`],
    },
};

export default function ThemeLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
