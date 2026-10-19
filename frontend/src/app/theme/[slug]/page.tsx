import { API_BASE_URL } from '@/lib/config';
import { Metadata } from 'next';
import Link from 'next/link';
import { Layers, AlertTriangle, TrendingUp, ShieldAlert, ArrowLeft } from 'lucide-react';
import SeoContentBlock from '@/components/SeoContentBlock';

export const revalidate = 21600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    try {
        const res = await fetch(`${API_BASE_URL}/api/seo/themes/${resolvedParams.slug}?v=2`, { next: { revalidate: 21600 } });
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
                const title = `[특징테마] ${data.name} 대장주 및 관련주 수혜주 총정리 | 스마트 투자 비서`;
                const description = data.description;
                
                const ogUrl = new URL(`${API_BASE_URL === 'http://13.209.99.170:8000' ? 'https://stock-trend-program.co.kr' : 'http://localhost:3000'}/api/og`);
                ogUrl.searchParams.set('title', data.name);
                ogUrl.searchParams.set('subtitle', 'AI가 분석한 테마별 대장주 및 매수 시그널');
                ogUrl.searchParams.set('theme', '🔥 핫 랭킹 테마');

                return {
                    title,
                    description,
                    alternates: {
                        canonical: `/theme/${resolvedParams.slug}`,
                    },
                    keywords: [data.name, `${data.name} 대장주`, `${data.name} 관련주`, `${data.name} 수혜주`, `${data.name} 테마주`, "주식 테마 분석"],
                    openGraph: {
                        title,
                        description,
                        url: `/theme/${resolvedParams.slug}`,
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
    const fallbackName = decodeURIComponent(resolvedParams?.slug || '인기 테마').replace(/[-_]/g, ' ');
    return {
        title: `[테마주] ${fallbackName} 관련주 및 수혜주 AI 분석 | 스마트 투자 비서`,
        description: `${fallbackName} 테마의 핵심 관련주, 대장주 및 최신 수급 모멘텀 분석 정보를 확인하세요.`,
        alternates: {
            canonical: `/theme/${resolvedParams?.slug}`,
        },
    };
}

export async function generateStaticParams() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${API_BASE_URL}/api/seo/themes`, { signal: controller.signal });
        clearTimeout(timeoutId);
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

export default async function ThemeDetailPage({ params }: Props) {
    let themeData = null;
    const resolvedParams = await params;
    try {
        const res = await fetch(`${API_BASE_URL}/api/seo/themes/${resolvedParams.slug}?v=2`, { next: { revalidate: 21600 } });
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
                        <span className="text-indigo-500">#</span> {themeData.name} 대장주 및 관련주 분석
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
                <div className="mt-12 p-8 border-t border-white/10 text-gray-400 text-sm leading-relaxed space-y-4">
                    <h3 className="text-lg font-bold text-white">
                        {themeData.name} 섹터 밸류체인 및 실전 투자 체크리스트
                    </h3>
                    <p>
                        본 페이지는 {themeData.name} 테마와 관련된 국내 증시(코스피, 코스닥) 상장 기업들의 밸류체인과 대장주·관련주 분류를 정리한 섹터 리포트입니다. 테마주 투자 시에는 단순 뉴스 모멘텀에만 의존하기보다 실제 해당 사업부에서 유의미한 매출 비중(최소 15~20% 이상)과 수주 잔고가 발생하고 있는지 금융감독원 전자공시시스템(DART) 분기보고서를 통해 반드시 교차 검증해야 합니다.
                    </p>
                    <p>
                        특히 섹터 순환매(Sector Rotation) 국면에서는 시가총액과 거래대금이 가장 먼저 집중되는 <strong>대장주(Leaders)</strong>가 20일·50일 이동평균선을 돌파하며 추세를 선도하고, 이후 후발주(Followers)로 온기가 확산되는 패턴이 나타납니다. 대장주의 외국인·기관 연속 순매수 기조가 꺾이거나 거래량이 급감할 경우 섹터 전체의 차익실현 매물이 출회될 수 있으므로 리스크 요인을 상시 점검하시기 바랍니다.
                    </p>
                </div>
            </div>
            <SeoContentBlock
                asH1={false}
                pageTitle={`${themeData.name} 테마 수급 분석 방법론 및 퀀트 검증 가이드`}
                pageDescription={`${themeData.name} 대장주 및 밸류체인 기업의 재무 건전성(PER·PBR·ROE), 외국인·기관 수급 추적, 그리고 테마 변동성 방어 전략을 안내합니다.`}
            />
        </div>
    );
}
