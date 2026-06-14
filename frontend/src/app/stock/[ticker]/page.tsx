import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from "@/components/Header";
import StockDiscussionBoard from "@/components/StockDiscussionBoard";
import StockVotingBoard from "@/components/StockVotingBoard";
import KakaoShareButton from "@/components/KakaoShareButton";

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
    
    if (data.price && data.previousClose) {
        const changePercent = ((data.price - data.previousClose) / data.previousClose) * 100;
        const sign = changePercent > 0 ? '+' : '';
        ogUrl.searchParams.set('change', `${sign}${changePercent.toFixed(2)}%`);
    }

    return {
        title,
        description,
        keywords: [name, `${name} 주가`, `${name} 전망`, `${name} 배당`, `${name} 목표가`, `${name} 실적`, "AI 주식 분석", params.ticker],
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
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FinancialProduct",
        "name": name,
        "description": `AI가 분석한 ${name} 주식의 핵심 비즈니스 요약 및 객관적 지표 현황입니다.`,
        "provider": {
            "@type": "Organization",
            "name": "StockTrendProgram",
            "url": "https://stock-trend-program.co.kr"
        },
        "offers": {
            "@type": "Offer",
            "price": data.price || 0,
            "priceCurrency": "KRW"
        }
    };

    // Calculate dynamic change for Share button imageUrl if needed
    const shareOgUrl = new URL(`${getApiBaseUrl() === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/api/og`);
    shareOgUrl.searchParams.set('title', name);
    shareOgUrl.searchParams.set('subtitle', '지금 당장 확인해야 할 AI 매수 시그널 포착!');
    shareOgUrl.searchParams.set('theme', '오늘의 특징주');
    if (data.price && data.previousClose) {
        const changePercent = ((data.price - data.previousClose) / data.previousClose) * 100;
        const sign = changePercent > 0 ? '+' : '';
        shareOgUrl.searchParams.set('change', `${sign}${changePercent.toFixed(2)}%`);
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Header />
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl relative">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                            {name} ({params.ticker})
                        </h1>
                        <KakaoShareButton 
                            title={`[종목 분석] ${name} (${params.ticker})`}
                            description={`AI가 분석한 ${name} 주식의 핵심 비즈니스 요약, 실시간 가격, PER/PBR 현황을 확인해보세요!`}
                            url={`https://stock-trend-program.co.kr/stock/${params.ticker}`}
                            imageUrl={shareOgUrl.toString()}
                            className="bg-[#FEE500] hover:bg-[#FEE500]/90 text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full md:w-auto shadow-lg shadow-[#FEE500]/10"
                            buttonText="분석 결과 보기"
                        />
                    </div>
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

                {/* 배당 정보 섹션 (해외주식/배당주) */}
                {(data.exDividendDate || data.paymentDate || data.dividendYield > 0) && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl">
                        <h2 className="text-2xl font-bold border-b border-slate-800 pb-2 mb-6">💰 {name} 배당 정보</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                                <div className="text-sm text-slate-400 mb-2">다음 배당락일 (Ex-Dividend)</div>
                                <div className="text-xl font-bold text-white">
                                    {data.exDividendDate ? data.exDividendDate : "예정된 배당락일 없음"}
                                </div>
                                <div className="text-xs text-slate-500 mt-2">이 날짜 전까지 매수해야 배당을 받습니다.</div>
                            </div>
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                                <div className="text-sm text-slate-400 mb-2">배당 지급일 (Payment Date)</div>
                                <div className="text-xl font-bold text-blue-400">
                                    {data.paymentDate ? data.paymentDate : "미정"}
                                </div>
                                <div className="text-xs text-slate-500 mt-2">실제로 계좌에 배당금이 입금되는 날입니다.</div>
                            </div>
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                                <div className="text-sm text-slate-400 mb-2">예상 배당 수익률 (연간)</div>
                                <div className="text-xl font-bold text-emerald-400">
                                    {data.dividendYield ? (data.dividendYield * 100).toFixed(2) + '%' : "N/A"}
                                </div>
                                <div className="text-xs text-slate-500 mt-2">현재 주가 대비 1년간 받는 배당금의 비율입니다.</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Internal Linking for SEO (Related Stocks) */}
                {data.relatedStocks && data.relatedStocks.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 shadow-2xl">
                        <h2 className="text-2xl font-bold border-b border-slate-800 pb-2 mb-6">🔗 시장 인기 테마 및 연관 주식</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {data.relatedStocks.map((rs: any, idx: number) => (
                                <Link href={`/stock/${rs.ticker}`} key={idx} className="block group">
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50 transition-all duration-300">
                                        <div className="text-sm font-bold text-white group-hover:text-blue-400">{rs.name}</div>
                                        <div className="text-xs text-slate-400 mt-1">{rs.ticker}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stock Voting Board */}
                <div className="mb-8">
                    <StockVotingBoard ticker={params.ticker} stockName={name} />
                </div>

                {/* Stock Discussion Board */}
                <StockDiscussionBoard ticker={params.ticker} name={name} />
            </main>

        </div>
    );
}
