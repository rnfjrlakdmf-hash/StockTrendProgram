import { Metadata } from 'next';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import Header from "@/components/Header";

export const metadata: Metadata = {
    title: "글로벌 주식 종목 전체 디렉토리 | 스마트 투자 비서",
    description: "코스피, 코스닥, 미국 주식, ETF 등 전 종목의 AI 분석 리포트를 확인하세요. 주가 전망, 외국인 수급 현황, 배당금 정보를 한눈에 볼 수 있는 종목 총람입니다.",
};

export const revalidate = 86400; // 24 hours

export default async function DirectoryPage({
    searchParams,
}: {
    searchParams: { page?: string; market?: string };
}) {
    let allStocks: any[] = [];
    try {
        const res = await fetch(`${API_BASE_URL}/api/seo/stocks`, { next: { revalidate: 86400 } });
        if (res.ok) {
            const data = await res.json();
            if (data && data.data && Array.isArray(data.data)) {
                allStocks = data.data;
            }
        }
    } catch (e) {
        console.error("Failed to fetch stocks for directory:", e);
    }

    const currentMarket = searchParams.market || 'ALL';
    const currentPage = parseInt(searchParams.page || '1', 10);
    const ITEMS_PER_PAGE = 500;

    // 1. Filter by market
    let filteredStocks = allStocks;
    if (currentMarket !== 'ALL') {
        filteredStocks = allStocks.filter(s => s.market === currentMarket);
    }

    // 2. Sort by name
    filteredStocks.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // 3. Paginate
    const totalPages = Math.ceil(filteredStocks.length / ITEMS_PER_PAGE) || 1;
    const safePage = Math.max(1, Math.min(currentPage, totalPages));
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    const paginatedStocks = filteredStocks.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const markets = [
        { id: 'ALL', name: '전체 종목' },
        { id: 'KOSPI', name: '코스피' },
        { id: 'KOSDAQ', name: '코스닥' },
        { id: 'US', name: '미국 주식' },
        { id: 'ETF', name: 'ETF' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Header title="종목 디렉토리" subtitle="전 종목 AI 분석 리포트" />
            
            <div className="pt-12 pb-12 px-4 max-w-7xl mx-auto">
                <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-4">
                    글로벌 주식 종목 총람 (A-Z)
                </h1>
                <p className="text-slate-400 mb-8 text-lg">
                    스마트 투자 비서가 제공하는 전 종목 AI 주가 전망 및 핵심 분석 리포트를 확인하세요. 
                    (총 {filteredStocks.length.toLocaleString()}개 종목)
                </p>

                {/* Market Tabs */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {markets.map(m => (
                        <Link
                            key={m.id}
                            href={`/directory?market=${m.id}&page=1`}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                currentMarket === m.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            {m.name}
                        </Link>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-12">
                    {paginatedStocks.map((stock: any) => (
                        <Link 
                            key={stock.ticker} 
                            href={`/stock/${stock.ticker}`}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-blue-500/50 hover:bg-slate-800 transition-all group block"
                        >
                            <div className="text-sm font-bold text-slate-200 group-hover:text-blue-400 truncate">
                                {stock.name || stock.ticker}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex justify-between">
                                <span>{stock.ticker}</span>
                                {stock.market && <span className="opacity-50">{stock.market}</span>}
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-8">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const p = idx + 1;
                            const isCurrent = p === safePage;
                            return (
                                <Link
                                    key={p}
                                    href={`/directory?market=${currentMarket}&page=${p}`}
                                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                                        isCurrent 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    {p}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
