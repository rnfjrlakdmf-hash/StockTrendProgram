import KakaoRevenueAd from '@/components/KakaoRevenueAd';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from "@/components/Header";
import StockDiscussionBoard from "@/components/StockDiscussionBoard";
import StockVotingBoard from "@/components/StockVotingBoard";
import KakaoShareButton from "@/components/KakaoShareButton";
import ReportDownloadButton from "@/components/ReportDownloadButton";
import OnDemandAiAnalysis from "@/components/OnDemandAiAnalysis";
import PremiumContent from "@/components/PremiumContent";
import RiskGaugeWidget from "@/components/RiskGaugeWidget";
import MtsOrderButton from "@/components/MtsOrderButton";
import EasyFinancialReader from "@/components/EasyFinancialReader";
import FiveStepStockReport from "@/components/FiveStepStockReport";
import ViralCopyButton from "@/components/ViralCopyButton";


const getApiBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://13.209.99.170:8000';
};

export const dynamic = 'force-dynamic';

async function getStockInfo(ticker: string) {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/seo/stock-info/${ticker}`, {
            cache: 'no-store'
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

type Props = { params: Promise<{ ticker: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const decodedTicker = decodeURIComponent(resolvedParams.ticker);
    const data = await getStockInfo(resolvedParams.ticker);
    
    if (!data || data.status === 'error') {
        return {
            title: `[종목 분석] ${decodedTicker} 주가 시세 및 AI 투자 진단 (${decodedTicker}) | 스마트 투자 비서`,
            description: `실시간 ${decodedTicker} 주가 시세와 기술적 차트 지표, 외국인·기관 수급 동향 및 AI 매매 시그널 정보를 무료로 확인하세요.`,
            alternates: {
                canonical: `/stock/${decodedTicker}`,
            },
        };
    }
    
    const name = data.name || decodedTicker;
    const title = `[급등주] ${name} 주가 전망 및 AI 모멘텀 분석 (${decodedTicker}) | 스마트 투자 비서`;
    const description = `최신 ${name} 주가, 배당금 정보부터 외국인/기관 수급 분석까지. AI가 제공하는 실시간 매수/매도 시그널과 향후 전망을 무료로 확인하세요.`;
    
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
        alternates: {
            canonical: `/stock/${decodedTicker}`,
        },
        keywords: [name, `${name} 주가`, `${name} 전망`, `${name} 배당`, `${name} 분석`, `${name} 실적`, "AI 주식 분석", decodedTicker],
        openGraph: {
            title,
            description,
            url: `/stock/${decodedTicker}`,
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

export default async function StockSeoPage({ params }: Props) {
    const resolvedParams = await params;
    const decodedTicker = decodeURIComponent(resolvedParams.ticker);
    const data = await getStockInfo(resolvedParams.ticker);
    
    if (!data || data.status === 'error') {
        notFound();
    }

    const name = data.name || decodedTicker;
    const price = data.price?.toLocaleString() || 'N/A';
    const prevClose = data.previousClose?.toLocaleString() || 'N/A';
    const pbr = data.pbr?.toFixed(2) || 'N/A';
    const per = data.per?.toFixed(2) || 'N/A';
    const divYield = data.dividendYield ? (data.dividendYield * 100).toFixed(2) + '%' : 'N/A';

    // 퀀트 지표 수치 계산
    const priceNum = typeof data.price === 'number' ? data.price : 0;
    const prevCloseNum = typeof data.previousClose === 'number' ? data.previousClose : 0;
    const priceDiff = priceNum && prevCloseNum ? priceNum - prevCloseNum : 0;
    const priceDiffRate = prevCloseNum > 0 ? ((priceDiff / prevCloseNum) * 100).toFixed(2) : '0.00';
    const isUp = priceDiff > 0;
    const isDown = priceDiff < 0;
    const perNum = typeof data.per === 'number' ? data.per : 0;
    const pbrNum = typeof data.pbr === 'number' ? data.pbr : 0;
    const divNum = typeof data.dividendYield === 'number' ? data.dividendYield : 0;
    const jsonLd = [
        {
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
        },
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": `${name} 주가 전망은 어떤가요?`,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": `현재 ${name}의 주가는 ${price}원이며, PER은 ${per}, PBR은 ${pbr}입니다. 스마트 투자 비서 AI가 분석한 세부 전망을 페이지에서 확인하세요.`
                    }
                },
                {
                    "@type": "Question",
                    "name": `${name} 배당수익률은 얼마인가요?`,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": `${name}의 현재 배당수익률은 ${divYield}입니다. 배당 투자 전략에 참고하세요.`
                    }
                }
            ]
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "종목 디렉토리",
                    "item": "https://stock-trend-program.co.kr/directory"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": name,
                    "item": `https://stock-trend-program.co.kr/stock/${decodedTicker}`
                }
            ]
        }
    ];

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
                <RiskGaugeWidget symbol={decodedTicker} />
                <div className="my-4"><KakaoRevenueAd type="banner" /></div>
                
                {/* 5단계 AI 퀀트 정밀 진단 리포트 */}
                <FiveStepStockReport ticker={decodedTicker} stockName={name} initialPrice={data.price} />

                <div id="ai-report-capture" className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 sm:p-8 md:p-10 mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                    {/* 은은한 네온 앰비언트 글로우 백그라운드 */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 mb-8 border-b border-slate-800/80">
                        <div className="w-full">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-purple-500/15 border border-blue-400/30 text-blue-300 mb-3 shadow-inner">
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                <span>AI INSTITUTIONAL RESEARCH | 정밀 퀀트 분석</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                                {name} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 font-black">주가 전망 및 퀀트 분석</span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-400">
                                <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 font-mono text-xs text-slate-300">
                                    종목코드 {decodedTicker}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    실시간 지표 연동
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-56 shrink-0">
                            <MtsOrderButton stockName={name} symbol={decodedTicker} className="w-full" />
                            <ViralCopyButton
                                stockName={name}
                                ticker={decodedTicker}
                                price={price}
                                per={per}
                                pbr={pbr}
                                url={`https://stock-trend-program.co.kr/stock/${resolvedParams.ticker}`}
                            />
                            <KakaoShareButton 
                                title={`[종목 분석] ${name} (${decodedTicker})`}
                                description={`AI가 분석한 ${name} 주식의 핵심 비즈니스 요약, 실시간 가격, PER/PBR 현황을 확인해보세요!`}
                                url={`https://stock-trend-program.co.kr/stock/${resolvedParams.ticker}`}
                                imageUrl={shareOgUrl.toString()}
                                className="bg-[#FEE500] hover:bg-[#FEE500]/90 text-black px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full shadow-lg shadow-[#FEE500]/10"
                                buttonText="카카오톡으로 공유"
                            />
                            <ReportDownloadButton targetId="ai-report-capture" fileName={name} />
                        </div>
                    </div>

                    <PremiumContent>
                        {/* 핵심 지표 4대 카드 */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base sm:text-lg font-bold text-slate-200 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block" />
                                    핵심 투자 지표 요약
                                </h2>
                                <span className="text-xs text-slate-400">네이버 증권 & 거래소 공시 기준</span>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                                {/* 현재가 */}
                                <div className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-700/70 shadow-lg hover:border-blue-500/40 transition-all duration-300">
                                    <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-400 mb-2">
                                        <span>실시간 현재가</span>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${isUp ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20' : isDown ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' : 'text-slate-400 bg-slate-700/50'}`}>
                                            {isUp ? `+${priceDiffRate}%` : isDown ? `${priceDiffRate}%` : '0.00%'}
                                        </span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                        {price}<span className="text-sm font-normal text-slate-400 ml-1">원</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                        <span>전일비</span>
                                        <span className={isUp ? 'text-rose-400 font-semibold' : isDown ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
                                            {isUp ? `▲ ${priceDiff.toLocaleString()}원` : isDown ? `▼ ${Math.abs(priceDiff).toLocaleString()}원` : '- 0원'}
                                        </span>
                                    </div>
                                </div>

                                {/* PER */}
                                <div className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-700/70 shadow-lg hover:border-indigo-500/40 transition-all duration-300">
                                    <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-400 mb-2">
                                        <span>PER (주가수익비율)</span>
                                        <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                                            {perNum > 0 && perNum < 10 ? '저평가 매력' : perNum >= 10 && perNum <= 25 ? '적정 밸류' : perNum > 25 ? '성장 프리미엄' : '지표 산출'}
                                        </span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-black text-indigo-400 tracking-tight">
                                        {per}<span className="text-sm font-normal text-slate-400 ml-1">배</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-2 truncate">
                                        기업 순이익 대비 주가 수준
                                    </div>
                                </div>

                                {/* PBR */}
                                <div className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-700/70 shadow-lg hover:border-purple-500/40 transition-all duration-300">
                                    <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-400 mb-2">
                                        <span>PBR (순자산비율)</span>
                                        <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                            {pbrNum > 0 && pbrNum < 1 ? '자산가치 저평가' : pbrNum >= 1 ? '자산가치 반영' : '지표 산출'}
                                        </span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-black text-purple-400 tracking-tight">
                                        {pbr}<span className="text-sm font-normal text-slate-400 ml-1">배</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-2 truncate">
                                        순자산 장부가치 대비 배수
                                    </div>
                                </div>

                                {/* 배당수익률 */}
                                <div className="relative group overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-700/70 shadow-lg hover:border-emerald-500/40 transition-all duration-300">
                                    <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-slate-400 mb-2">
                                        <span>배당수익률</span>
                                        <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                            {divNum >= 0.04 ? '고배당 인컴' : divNum > 0 ? '현금 배당주' : '성장 재투자'}
                                        </span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                                        {divYield}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-2 truncate">
                                        연간 환산 예상 현금 배당
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 비즈니스 요약 섹션 */}
                        <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-800/40 to-slate-900/90 border border-slate-700/60 p-6 sm:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                            
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-700/60">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-bold">
                                        🏢
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                        핵심 비즈니스 모델 및 기업 개요
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-medium text-slate-300">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    <span>FnGuide & WiseReport 공시 검증</span>
                                </div>
                            </div>

                            <div className="text-slate-200 leading-relaxed text-base sm:text-[17px] font-normal space-y-3">
                                {data.summary && data.summary.length > 20 ? (
                                    data.summary.split(/(?<=[.!?])\s+/).filter(Boolean).map((sentence: string, idx: number) => (
                                        <p key={idx} className="leading-relaxed text-slate-300">
                                            {sentence}
                                        </p>
                                    ))
                                ) : (
                                    <p className="text-slate-300 leading-relaxed">
                                        {`${name} 기업의 핵심 비즈니스 요약 및 주요 실적 현황입니다. 인공지능 기반 분석을 통해 실시간 주가 동향과 객관적 가치 평가 정보를 제공하고 있습니다.`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* AI 3대 퀀트 진단 브리핑 */}
                        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 sm:p-8">
                            <div className="flex items-center gap-2.5 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-bold">
                                    ⚡
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                        AI 3대 퀀트 정밀 진단 브리핑
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-0.5">가격 모멘텀, 밸류에이션, 주주환원 3단계 입체 분석</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {/* 모멘텀 */}
                                <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">01 모멘텀</span>
                                        <span className="text-xs text-slate-400">가격 추세</span>
                                    </div>
                                    <h3 className="font-bold text-white text-base mb-2">가격 모멘텀 진단</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        현재가는 <strong className="text-white">{price}원</strong>으로, 직전 종가({prevClose}원) 대비 
                                        {priceNum && prevCloseNum 
                                            ? (priceNum > prevCloseNum 
                                                ? <span className="text-rose-400 font-semibold"> 상승세를 기록하며 매수 우위의 단기 강세 흐름</span> 
                                                : (priceNum < prevCloseNum 
                                                    ? <span className="text-blue-400 font-semibold"> 하락세를 보이며 기술적 숨고르기 양상</span> 
                                                    : <span className="text-slate-300 font-semibold"> 보합권에서 방향성을 탐색</span>))
                                            : ' 변동성을 기록 중'}을 나타내고 있습니다.
                                    </p>
                                </div>

                                {/* 밸류에이션 */}
                                <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 hover:border-purple-500/30 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">02 밸류에이션</span>
                                        <span className="text-xs text-slate-400">가치 평가</span>
                                    </div>
                                    <h3 className="font-bold text-white text-base mb-2">가치 평가 매트릭스</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        현재 <strong className="text-indigo-300">PER {per}배</strong>, <strong className="text-purple-300">PBR {pbr}배</strong> 수준입니다.
                                        {perNum > 0 && perNum < 10 && ' 기업 실적 대비 주가가 저평가 구간에 머물러 있어 가치주로서의 가격 메리트가 두드러집니다.'}
                                        {pbrNum > 0 && pbrNum < 1 && ' 장부가치보다 낮은 시가총액을 형성하고 있어 밸류업 관점의 재평가 여력이 기대됩니다.'}
                                        {(!perNum || perNum >= 10) && (!pbrNum || pbrNum >= 1) && ' 향후 영업이익 성장률 및 동종 업종 피어그룹과의 멀티플 비교 관찰이 유효합니다.'}
                                    </p>
                                </div>

                                {/* 주주환원 & 배당 */}
                                <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/50 hover:border-emerald-500/30 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">03 주주환원</span>
                                        <span className="text-xs text-slate-400">인컴 흐름</span>
                                    </div>
                                    <h3 className="font-bold text-white text-base mb-2">주주환원 매력도</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {divNum > 0 ? (
                                            <>
                                                예상 배당수익률은 <strong className="text-emerald-300">{divYield}</strong> 수준으로, 안정적인 현금 흐름 창출과 주가 하방 지지력을 뒷받침할 수 있습니다.
                                                {divNum >= 0.04 && ' (고배당 방어주로서의 포트폴리오 편입 매력 부각)'}
                                            </>
                                        ) : (
                                            '현재 배당 분배보다는 기업의 미래 신성장 동력 확보 및 설비·R&D 재투자에 집중하는 전형적인 성장 추구형 펀더멘털입니다.'
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* 법적 면책 알림 */}
                            <div className="flex items-start sm:items-center gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                                <span className="text-base shrink-0">🛡️</span>
                                <span className="leading-relaxed">
                                    본 AI 리포트는 객관적인 금융 데이터와 통계 알고리즘에 기초한 투자 참고 정보이며, 특정 종목에 대한 투자 권유나 매수/매도를 유도하지 않습니다. 자본시장법 준수 하에 최종 투자 책임은 본인에게 있습니다.
                                </span>
                            </div>
                        </div>
                    </PremiumContent>
                </div>

                {/* AI 초보자 맞춤형 재무제표 3분 완벽 해설기 */}
                <EasyFinancialReader 
                    stockName={name}
                    ticker={decodedTicker}
                    price={data.price}
                    per={data.per}
                    pbr={data.pbr}
                    dividendYield={data.dividendYield}
                    marketCap={data.marketCap}
                    financials={data.financials}
                />

                {/* On-Demand AI Analysis Section */}
                <PremiumContent>
                    <OnDemandAiAnalysis ticker={decodedTicker} stockName={name} />
                </PremiumContent>

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
                    <div className="mb-6"><KakaoRevenueAd type="box" /></div>
                    <StockVotingBoard ticker={decodedTicker} stockName={name} />
                </div>
            </main>
            
            <section className="bg-slate-900 border-t border-slate-800">
                <StockDiscussionBoard ticker={decodedTicker} name={name} />
            </section>

        </div>
    );
}
