import { Metadata } from 'next';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import Header from "@/components/Header";

export const metadata: Metadata = {
    title: "국내 주식 종목 전체 디렉토리 | 스마트 투자 비서",
    description: "코스피, 코스닥 상장된 전 종목의 AI 분석 리포트를 확인하세요. 주가 전망, 목표가, 배당금 정보를 한눈에 볼 수 있는 종목 총람(Sitemap)입니다.",
};

export const revalidate = 86400; // 24 hours

export default async function DirectoryPage() {
    let stocks = [];
    try {
        const res = await fetch(`${API_BASE_URL}/api/seo/stocks`, { next: { revalidate: 86400 } });
        if (res.ok) {
            const data = await res.json();
            if (data && data.data && Array.isArray(data.data)) {
                stocks = data.data;
            }
        }
    } catch (e) {
        console.error("Failed to fetch stocks for directory:", e);
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <Header title="종목 디렉토리" subtitle="전 종목 AI 분석 리포트" />
            
            <div className="pt-12 pb-12 px-4 max-w-7xl mx-auto">
                <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-4">
                    국내 주식 종목 총람 (A-Z)
                </h1>
                <p className="text-slate-400 mb-12 text-lg">
                    스마트 투자 비서가 제공하는 전 종목 AI 주가 전망 및 핵심 분석 리포트를 확인하세요. 구글 검색엔진 최적화를 위한 HTML 사이트맵입니다.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {stocks.map((stock: any) => (
                        <Link 
                            key={stock.ticker} 
                            href={`/stock/${stock.ticker}`}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-blue-500/50 hover:bg-slate-800 transition-all group block"
                        >
                            <div className="text-sm font-bold text-slate-200 group-hover:text-blue-400 truncate">
                                {stock.name || stock.ticker}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {stock.ticker}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
