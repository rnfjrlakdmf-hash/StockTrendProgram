import { Metadata } from 'next';
import ClientPage from './ClientPage';

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const resolvedParams = await searchParams;
    const symbol = typeof resolvedParams?.symbol === 'string' ? resolvedParams.symbol : 'global';
    
    return {
        title: `기업 펀더멘탈 및 재무 지표 분석 - ${symbol} | 스마트 투자 비서`,
        description: `${symbol}에 대한 재무제표 건전성, 밸류에이션(PER·PBR·ROE), 기술적 보조지표 통계 분석을 확인하세요.`,
        robots: {
            index: false,
            follow: true,
        },
        alternates: {
            canonical: symbol && symbol !== 'global' ? `https://stock-trend-program.co.kr/stock/${symbol}` : 'https://stock-trend-program.co.kr/analysis',
        }
    };
}

export default async function AnalysisPage({ searchParams }: Props) {
    await searchParams;
    return <ClientPage />;
}
