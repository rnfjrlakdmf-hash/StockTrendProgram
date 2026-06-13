import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from "@/components/Header";
import FomoWidget from "@/components/FomoWidget";
import StockDiscussionBoard from "@/components/StockDiscussionBoard";
import StockVotingBoard from "@/components/StockVotingBoard";

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://13.209.99.170:8000';
};

async function getStockInfo(ticker: string) {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/seo/stock-info/${ticker}`, {
            next: { revalidate: 21600 } // Cache for 6 hours
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function generateMetadata({ params }: { params: { ticker: string } }): Promise<Metadata> {
    const data = await getStockInfo(params.ticker);
    
    if (!data || data.status === 'error') {
        return {
            title: '종목 분석 - StockTrendProgram',
        };
    }
    
    const name = data.name || params.ticker;
    const title = `${name}(${params.ticker}) 주가 동향 및 기업 요약 - StockTrendProgram`;
    const description = `AI가 분석한 ${name} 주식의 핵심 비즈니스 요약, 실시간 가격, PER/PBR 등 객관적 지표 현황입니다.`;
    
    // OG Image URL 생성
    const ogUrl = new URL(`${getApiBaseUrl() === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/api/og`);
    ogUrl.searchParams.set('title', name);
    ogUrl.searchParams.set('subtitle', '지금 당장 확인해야 할 AI 매수 시그널 포착!');
    ogUrl.searchParams.set('theme', '오늘의 특징주');

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [
                {
                    url: ogUrl.toString(),
                    width: 1200,
                    height: 630,
                    alt: `${name} 분석 차트`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogUrl.toString()],
        },
    };
}

export default async function StockSeoPage({ params }: { params: { ticker: string } }) {
    const data = await getStockInfo(params.ticker);
    
    if (!data || data.status === 'error') {
        notFound();
    }

    const name = data.name || params.ticker;
    const price = data.price?.toLocaleString() || 'N/A';
    const prevClose = data.previousClose?.toLocaleString() || 'N/A';
    const pbr = data.pbr?.toFixed(2) || 'N/A';
    const per = data.per?.toFixed(2) || 'N/A';
    const divYield = data.dividendYield ? (data.dividendYield * 100).toFixed(2) + '%' : 'N/A';

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Header />
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
                        {name} ({params.ticker})
                    </h1>
                    <p className="text-xl text-slate-400 font-medium mb-8">AI 심층 기업 현황 리포트</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="text-sm text-slate-400 mb-1">현재가</div>
                            <div className="text-2xl font-bold text-white">{price}원</div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="text-sm text-slate-400 mb-1">PER</div>
                            <div className="text-2xl font-bold text-blue-400">{per}</div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="text-sm text-slate-400 mb-1">PBR</div>
                            <div className="text-2xl font-bold text-purple-400">{pbr}</div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="text-sm text-slate-400 mb-1">배당수익률</div>
                            <div className="text-2xl font-bold text-emerald-400">{divYield}</div>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <h2 className="text-2xl font-bold border-b border-slate-800 pb-2 mb-4">📈 비즈니스 요약</h2>
                        <p className="text-slate-300 leading-relaxed text-lg">
                            {data.summary}
                        </p>
                        
                        <h2 className="text-2xl font-bold border-b border-slate-800 pb-2 mt-10 mb-4">💡 주요 지표 브리핑 (Programmatic SEO)</h2>
                        <ul className="space-y-3 text-slate-300">
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">✓</span>
                                <span>{name}의 현재가는 {price}원으로 직전 종가({prevClose}원) 대비 변동폭을 기록하고 있습니다.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">✓</span>
                                <span>PER {per} 수준으로 해당 업종의 객관적인 밸류에이션 지표를 나타내고 있습니다.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">✓</span>
                                <span>본 페이지는 단순 정보 제공 목적이며, 투자를 권유하거나 특정 종목을 추천하지 않습니다.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Stock Voting Board */}
                <div className="mb-8">
                    <StockVotingBoard ticker={params.ticker} stockName={name} />
                </div>

                {/* Stock Discussion Board */}
                <StockDiscussionBoard ticker={params.ticker} name={name} />
            </main>

            {/* FOMO Widget */}
            <FomoWidget />
        </div>
    );
}
