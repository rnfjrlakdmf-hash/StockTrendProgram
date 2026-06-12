import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from "@/components/Header";

const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
    return {
        title: `${name}(${params.ticker}) 주가 전망 및 배당금 완벽 분석 - StockTrendProgram`,
        description: `월스트리트 출신 AI 애널리스트가 분석한 ${name} 주식의 핵심 전망, 실시간 가격, PER/PBR, 그리고 목표가 및 배당금 요약입니다.`,
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
                    <p className="text-xl text-slate-400 font-medium mb-8">AI 심층 종목 리포트 및 주가 전망</p>
                    
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
                        <h2 className="text-2xl font-bold border-b border-slate-800 pb-2 mb-4">📈 핵심 비즈니스 요약</h2>
                        <p className="text-slate-300 leading-relaxed text-lg">
                            {data.summary}
                        </p>
                        
                        <h2 className="text-2xl font-bold border-b border-slate-800 pb-2 mt-10 mb-4">💡 AI 투자 포인트 (Programmatic SEO)</h2>
                        <ul className="space-y-3 text-slate-300">
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">✓</span>
                                <span>{name}의 현재가는 {price}원으로 직전 종가({prevClose}원) 대비 변동성을 보이고 있습니다.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">✓</span>
                                <span>PER {per} 수준으로 동종 업계 대비 밸류에이션 매력을 점검할 필요가 있습니다.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-400 mr-2">✓</span>
                                <span>검색엔진 최적화(SEO)를 통해 유입된 투자자들에게 제공되는 실시간 요약 페이지입니다.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}
