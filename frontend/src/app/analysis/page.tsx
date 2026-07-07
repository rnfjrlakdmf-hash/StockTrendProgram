import { Metadata } from 'next';
import ClientPage from './ClientPage';

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const resolvedParams = await searchParams;
    const symbol = typeof resolvedParams?.symbol === 'string' ? resolvedParams.symbol : 'global';
    
    return {
        title: `종목 분석 - ${symbol} | 스마트 투자 비서`,
        description: `${symbol}에 대한 실시간 주가 차트, 수급, 기술적 지표 종합 분석을 확인하세요.`,
        alternates: {
            canonical: symbol && symbol !== 'global' ? `https://stock-trend-program.co.kr/stock/${symbol}` : 'https://stock-trend-program.co.kr/analysis',
        }
    };
}

export default async function AnalysisPage({ searchParams }: Props) {
    // Next.js 15: await searchParams before use (though we only need it for metadata, ClientPage will use useSearchParams)
    await searchParams;
    return <ClientPage />;
}
