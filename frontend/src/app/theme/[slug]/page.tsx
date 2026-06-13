import { API_BASE_URL } from '@/lib/config';
import { Metadata } from 'next';
import Link from 'next/link';
import { Layers, AlertTriangle, TrendingUp, ShieldAlert, ArrowLeft } from 'lucide-react';

export const revalidate = 21600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/seo/themes/${params.slug}?v=2`, { next: { revalidate: 21600 } });
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
                const title = `${data.name} 대장주 및 관련주 총정리 - StockTrend AI`;
                const description = data.description;
                
                const ogUrl = new URL(`${API_BASE_URL === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/api/og`);
                ogUrl.searchParams.set('title', data.name);
                ogUrl.searchParams.set('subtitle', 'AI가 분석한 테마별 대장주 및 매수 시그널');
                ogUrl.searchParams.set('theme', '🔥 핫 랭킹 테마');

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
                                alt: `${data.name} 테마 분석`,
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
        }
    } catch (e) {
        console.error("Metadata fetch error", e);
    }
    return {
        title: "테마주 분석 - StockTrend",
        description: "주식 테마 분석"
    };
}

export async function generateStaticParams() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/seo/themes`);
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
                return data.data.map((theme: any) => ({
                    slug: theme.slug,
                }));
            }
        }
    } catch (e) {
        console.error("Failed to fetch themes for static params", e);
    }
    return [];
}

export default async function ThemeDetailPage({ params }: { params: { slug: string } }) {
    let themeData = null;
    try {
        const res = await fetch(`${API_BASE_URL}/api/seo/themes/${params.slug}?v=2`, { next: { revalidate: 21600 } });
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
                themeData = data;
            }
        }
    } catch (e) {
        console.error("Failed to fetch theme detail", e);
    }

    if (!themeData) {
        return <div className="min-h-screen flex items-center justify-center text-white">테마 정보를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="min-h-screen bg-black pb-20">
            <div className="max-w-4xl mx-auto px-6 pt-24">
                <Link href="/theme" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> 테마 총람으로 돌아가기
                </Link>

                <div className="bg-gradient-to-br from-indigo-900/20 to-black border border-indigo-500/30 rounded-3xl p-8 md:p-12 relative overflow-hidden mb-8">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Layers className="w-64 h-64 text-indigo-400 -rotate-12 transform translate-x-12 -translate-y-12" />
                    </div>
                    
                    <h1 className="text-3xl md:text-5xl font-black text-indigo-100 mb-6 flex items-center gap-3 relative z-10">
                        <span className="text-indigo-500">#</span> {themeData.name}
                    </h1>
                    
                    <p className="text-lg md:text-xl text-gray-300 leading-relaxed font-medium relative z-10 mb-8">
                        {themeData.description}
                    </p>

                    <div className="flex items-start gap-4 bg-red-900/20 p-5 rounded-2xl border border-red-500/20 relative z-10">
                        <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="text-red-400 font-bold text-sm mb-2 uppercase tracking-wide">투자 리스크 (Risk Factor)</div>
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed">{themeData.risk_factor}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Leaders */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <TrendingUp className="text-red-400 w-6 h-6" /> 대장주 (Leaders)
                        </h2>
                        <div className="space-y-4">
                            {themeData.leaders.map((stock: any, i: number) => (
                                <Link href={`/stock/${stock.ticker}`} key={stock.ticker} className="block group">
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-red-500/30 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center font-bold text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg text-white group-hover:text-red-400 transition-colors">{stock.name}</div>
                                            <div className="text-sm text-gray-500 mt-1">{stock.ticker}</div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Followers */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <Layers className="text-blue-400 w-6 h-6" /> 관련주 (Related)
                        </h2>
                        <div className="space-y-4">
                            {themeData.followers.map((stock: any, i: number) => (
                                <Link href={`/stock/${stock.ticker}`} key={stock.ticker} className="block group">
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-blue-500/30 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{stock.name}</div>
                                            <div className="text-sm text-gray-500 mt-1">{stock.ticker}</div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* SEO Text */}
                <div className="mt-12 p-8 border-t border-white/10 text-gray-500 text-sm leading-relaxed">
                    본 페이지는 {themeData.name} 테마와 관련된 국내 증시(코스피, 코스닥) 상장 기업들의 정보를 모아놓은 페이지입니다. {themeData.name} 관련주, 대장주, 수혜주 정보를 실시간으로 확인하고 AI 기반의 투자 매력도를 분석해 보세요. StockTrend는 방대한 금융 데이터와 뉴스 플로우를 분석하여 객관적인 테마 동향을 제공합니다.
                </div>
            </div>
        </div>
    );
}
