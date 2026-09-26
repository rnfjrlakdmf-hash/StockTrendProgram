import { Metadata } from 'next';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { 
  Trophy, Calculator, Zap, Shield, BookOpen, Newspaper
} from 'lucide-react';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

async function getLatestTheoryPosts() {
  try {
    const res = await fetch('https://stock-trend-program.co.kr/api/theory/posts?page=1&limit=6', {
      next: { revalidate: 300 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.posts) ? data.posts.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: '스마트 투자 비서 | AI 주식 분석, 실시간 수급 및 공시 알림',
  description: '금융감독원 DART 및 미국 SEC 공시 기반 실시간 알림, AI 퀀트 가치평가(PER/PBR/ROE), 외국인·기관 수급 추적 및 46대 필수 주식 투자 가이드를 100% 무료로 제공합니다.',
  alternates: {
    canonical: '/',
  },
};

const INVESTMENT_GUIDES = [
  { href: '/guide/per', title: 'PER (주가수익비율)', desc: '적정 PER 기준과 실전 가치평가' },
  { href: '/guide/pbr', title: 'PBR (주가순자산비율)', desc: '장부가치 대비 저평가 판단 지표' },
  { href: '/guide/roe', title: 'ROE (자기자본이익률)', desc: '워런 버핏이 강조한 자본 효율성' },
  { href: '/guide/rsi', title: 'RSI (상대강도지수)', desc: '과매수·과매도 반등 타점 포착' },
  { href: '/guide/macd', title: 'MACD 추세 분석', desc: '이동평균 수렴확산과 골든크로스' },
  { href: '/guide/bollinger-band', title: '볼린저 밴드', desc: '표준편차 밴드 스퀴즈와 돌파' },
  { href: '/guide/moving-average', title: '이동평균선(MA)', desc: '단기·장기 추세선 매매 타이밍' },
  { href: '/guide/dividend-yield', title: '배당수익률 분석', desc: '안정적인 고배당주 포트폴리오' },
  { href: '/guide/short-selling', title: '공매도 & 숏스퀴즈', desc: '외인·기관 대차잔고와 수급 구조' },
  { href: '/guide/dart', title: 'DART 전자공시', desc: '공급계약 및 내부자 거래 분석' },
  { href: '/guide/fomc', title: 'FOMC & 기준금리', desc: '미국 연준 통화정책과 주가 상관관계' },
  { href: '/guide/rebalancing', title: '포트폴리오 리밸런싱', desc: '자산배분과 변동성 리스크 관리' },
];

const FAQS = [
  {
    q: '스마트 투자 비서의 AI 주식 분석은 어떻게 작동하나요?',
    a: '한국거래소(KRX), 금융감독원 DART, 미국 SEC EDGAR에서 수집한 방대한 원천 데이터를 기반으로 다중 팩터(재무 건전성, 밸류에이션, 외인·기관 수급, 기술적 보조지표, 뉴스 감성)를 정량적으로 종합 분석하여 누구나 알기 쉬운 종합 점수와 핵심 요약 리포트를 산출합니다.',
  },
  {
    q: '실시간 주가 및 DART 공시 알림 서비스는 무료인가요?',
    a: '네, 100% 무료로 제공됩니다. 관심 종목의 장중 급등락, 대규모 공급계약 체결, 최대주주 및 임원 내부자 거래, 시간외 거래 가격 변동 정보를 스마트폰 푸시 알림과 실시간 웹 알림 센터를 통해 즉시 받아보실 수 있습니다.',
  },
  {
    q: '주식 초보자도 활용하기 쉬운가요?',
    a: '어려운 재무제표와 복잡한 공시 원문을 초보자의 눈높이에 맞춰 직관적인 게이지 차트와 3줄 요약 팩트로 변환하여 제공합니다. 또한 46대 필수 주식 용어 사전과 매일 업데이트되는 실전 투자 칼럼을 통해 체계적으로 공부하실 수 있습니다.',
  },
  {
    q: '외국인 및 기관 투자자의 수급 추적이 왜 중요한가요?',
    a: '주식 시장에서 막대한 자금력을 가진 외국인 투자자와 국내 기관(스마트 머니)의 순매수·순매도 동향은 주가의 중장기 방향성을 결정짓는 핵심 수급 엔진입니다. 스마트 투자 비서는 당일 장중 대량 매집 종목과 슈퍼개미의 지분 변동을 실시간으로 추적합니다.',
  },
  {
    q: '미국 주식(나스닥, S&P 500, NYSE)도 지원되나요?',
    a: '네, 애플, 엔비디아, 테슬라 등 미국 주요 상장 기업의 실시간 정규장 시세뿐만 아니라 프리마켓(Pre-market), 애프터마켓(After-market) 시간외 거래 시세와 미국 증권거래위원회(SEC) Form 4 내부자 거래 공시를 지원합니다.',
  },
  {
    q: '유사투자자문이나 종목 추천 행위를 하나요?',
    a: '아닙니다. 스마트 투자 비서는 자본시장법을 엄격히 준수하며 특정 종목의 매수·매도를 권유하거나 1:1 투자 자문을 하지 않습니다. 공공 기관의 객관적인 팩트 데이터를 투자자가 스스로 판단할 수 있도록 정리해 드리는 순수 정보 제공 플랫폼입니다.',
  },
];

export default async function Home() {
  const latestTheoryPosts = await getLatestTheoryPosts();
  const featuredBlogPosts = STATIC_POSTS.slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://stock-trend-program.co.kr/#website",
        "url": "https://stock-trend-program.co.kr",
        "name": "스마트 투자 비서",
        "description": "AI 기반 실시간 주식 데이터 분석 및 DART 공시 알림 플랫폼",
        "publisher": {
          "@type": "Organization",
          "name": "StockTrend Research Team",
          "url": "https://stock-trend-program.co.kr"
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://stock-trend-program.co.kr/#faq",
        "mainEntity": FAQS.map(faq => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.a
          }
        }))
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. 클라이언트 인터랙티브 대시보드 */}
      <HomeClient />

      {/* 2. 하단 서비스 가이드 & 신뢰성 섹션 (고품격 에디토리얼 레이아웃) */}
      <div className="bg-gradient-to-b from-[#09090b] via-[#06070a] to-[#040406] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-12">

          {/* [애드센스 핵심 에디토리얼 섹션 1] 최신 1타 강사 차트·주식 스터디 칼럼 (SSR 본문 발췌 노출) */}
          {latestTheoryPosts.length > 0 && (
            <section className="bg-zinc-900/60 border border-emerald-500/25 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-400" /> 최신 연재 · 1타 강사의 매일 차트 &amp; 주식 스터디
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    실전 캔들 차트(SVG), 수치 비교 그래프, 1,000만 원 실전 계산 시뮬레이션으로 배우는 오리지널 투자 교육 칼럼입니다.
                  </p>
                </div>
                <Link href="/theory" className="text-xs font-black text-emerald-300 hover:text-emerald-200 bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 rounded-xl self-start sm:self-center">
                  전체 70+편 강의 보기 →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {latestTheoryPosts.map((post: any) => {
                  const plainDesc = String(post.summary || post.content || '')
                    .replace(/<[^>]*>?/gm, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 145);
                  const slug = post.slug || post.id;
                  return (
                    <Link
                      key={slug}
                      href={`/theory/${encodeURIComponent(slug)}`}
                      className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div className="space-y-2">
                        <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          실전 차트·그래프 스터디
                        </span>
                        <h3 className="text-sm md:text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                          {post.title}
                        </h3>
                        <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                          {plainDesc}...
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400">
                        강의 전문 읽기 →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* [애드센스 핵심 에디토리얼 섹션 2] 전문가 심층 경제·가치투자 리서치 칼럼 (SSR 정적 원고 노출) */}
          <section className="bg-zinc-900/60 border border-blue-500/25 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-blue-400" /> 심층 금융 리서치 &amp; 거시경제 분석 칼럼
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  재무제표 독해법, 금리·환율 사이클, 기업 밸류에이션(PER·PBR·ROE), 절세 전략을 깊이 있게 다룬 전문 칼럼입니다.
                </p>
              </div>
              <Link href="/blog" className="text-xs font-black text-blue-300 hover:text-blue-200 bg-blue-500/15 border border-blue-500/30 px-4 py-2 rounded-xl self-start sm:self-center">
                전체 칼럼 아카이브 →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredBlogPosts.map((post) => {
                const plainDesc = String(post.excerpt || post.content || '')
                  .replace(/<[^>]*>?/gm, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 145);
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${encodeURIComponent(post.slug)}`}
                    className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-blue-500/50 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-2">
                      <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {post.category || '심층 투자 칼럼'}
                      </span>
                      <h3 className="text-sm md:text-base font-extrabold text-white group-hover:text-blue-300 transition-colors leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                        {plainDesc}...
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-blue-400">
                      리서치 전문 읽기 →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 실시간 인기 스마트 금융 도구 4선 */}
          <section className="bg-gradient-to-br from-purple-950/20 via-zinc-900/60 to-blue-950/20 border border-purple-500/20 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" /> 실시간 인기 퀀트 금융 도구
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  투자자들의 수익률을 극대화하는 핵심 분석 시뮬레이터와 VIP 리더보드입니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link 
                href="/ranking"
                className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/30 hover:border-amber-400/60 transition-all group space-y-2 block"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full">VIP 랭킹</span>
                </div>
                <h3 className="text-white font-black text-base group-hover:text-amber-300 transition-colors">주식 고수 랭킹</h3>
                <p className="text-gray-400 text-xs leading-relaxed">전국 고수들의 관심종목 실시간 수익률과 명예의 전당 TOP 100</p>
              </Link>

              <Link 
                href="/calculator"
                className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 hover:border-blue-400/60 transition-all group space-y-2 block"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-blue-400/20 text-blue-300">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black bg-blue-400/20 text-blue-300 px-2 py-0.5 rounded-full">시뮬레이터</span>
                </div>
                <h3 className="text-white font-black text-base group-hover:text-blue-300 transition-colors">스마트 물타기 계산기</h3>
                <p className="text-gray-400 text-xs leading-relaxed">추가 매수 시 평단가 인하 효과와 원금 회복 탈출 시나리오 산출</p>
              </Link>

              <Link 
                href="/signals"
                className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 hover:border-red-400/60 transition-all group space-y-2 block"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-orange-400/20 text-orange-300">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black bg-orange-400/20 text-orange-300 px-2 py-0.5 rounded-full">실시간</span>
                </div>
                <h3 className="text-white font-black text-base group-hover:text-orange-300 transition-colors">글로벌 마켓 시그널</h3>
                <p className="text-gray-400 text-xs leading-relaxed">외인·기관 대량 수급 변동 및 DART 공시 실시간 레이더 감지</p>
              </Link>

              <Link 
                href="/portfolio"
                className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-400/60 transition-all group space-y-2 block"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-emerald-400/20 text-emerald-300">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">AI 진단</span>
                </div>
                <h3 className="text-white font-black text-base group-hover:text-emerald-300 transition-colors">포트폴리오 자산 진단</h3>
                <p className="text-gray-400 text-xs leading-relaxed">6대 팩터 모델 기반 보유 종목의 변동성과 분산도 정밀 진단</p>
              </Link>
            </div>
          </section>

          {/* 1. 실시간 전문가 마켓 리포트 (최신 블로그 피드) */}
          <section className="space-y-4 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black tracking-wider uppercase mb-1">
                  DAILY MARKET INTELLIGENCE
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  📰 전문가 실시간 마켓 리포트
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  국내외 증시 마감 시황, 외인·기관 수급 집중주, 글로벌 거시경제 동향을 매일 심층 분석합니다.
                </p>
              </div>
              <Link 
                href="/blog" 
                className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-bold transition-all shrink-0 self-start sm:self-auto"
              >
                전체 리포트 200+ 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link 
                href="/blog" 
                className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 hover:border-blue-500/40 transition-all group space-y-3 block"
              >
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">미국 증시 시황</span>
                  <span>매일 업데이트</span>
                </div>
                <h3 className="text-white font-bold text-base group-hover:text-blue-400 transition-colors line-clamp-2">
                  글로벌 거시경제 지표 및 뉴욕 증시 빅테크 수급 분석
                </h3>
                <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed">
                  S&amp;P 500, 나스닥 100 지수 변동 요인과 미 연준 FOMC 금리 향방, 엔비디아·애플 등 핵심 주도주 거래 동향을 상세히 전해드립니다.
                </p>
              </Link>

              <Link 
                href="/blog" 
                className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 hover:border-emerald-500/40 transition-all group space-y-3 block"
              >
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">국내 증시 수급</span>
                  <span>매일 업데이트</span>
                </div>
                <h3 className="text-white font-bold text-base group-hover:text-emerald-400 transition-colors line-clamp-2">
                  코스피·코스닥 외국인·기관 순매수 집중 종목 브리핑
                </h3>
                <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed">
                  반도체, 2차전지, 바이오 등 주요 주도 섹터의 자금 유입 현황과 메이저 세력의 평단가 대비 수익률 통계를 분석합니다.
                </p>
              </Link>

              <Link 
                href="/blog" 
                className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10 hover:border-purple-500/40 transition-all group space-y-3 block"
              >
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold">DART 전자공시</span>
                  <span>실시간 속보</span>
                </div>
                <h3 className="text-white font-bold text-base group-hover:text-purple-400 transition-colors line-clamp-2">
                  금융감독원 핵심 수주 공시 및 내부자 지분 변동 추적
                </h3>
                <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed">
                  매출액 대비 대규모 단일판매 공급계약, 최대주주 및 임원 주식 매수 공시 등 주가 모멘텀을 유발하는 팩트를 선별 전달합니다.
                </p>
              </Link>
            </div>
          </section>

          {/* 2. 스마트 투자 비서 4대 핵심 가치 & 플랫폼 소개 */}
          <section className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">스마트 투자 비서 4대 핵심 분석 엔진</h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                국내외 증시 실시간 수급과 공시 팩트를 정량적으로 분석하여 개인 투자자의 정보 비대칭을 해소합니다.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
                <div className="text-xs font-black text-blue-400">01. 수급·공시 레이더</div>
                <h3 className="text-white font-bold text-sm">실시간 스마트머니 포착</h3>
                <p className="text-gray-400 text-xs leading-relaxed">외인·기관 순매수 집중주 및 DART 공급계약·내부자 지분 변동 공시 실시간 감지</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
                <div className="text-xs font-black text-emerald-400">02. 퀀트 밸류에이션</div>
                <h3 className="text-white font-bold text-sm">AI 정량 재무 스코어링</h3>
                <p className="text-gray-400 text-xs leading-relaxed">PER, PBR, ROE, RSI, MACD 등 20개 이상의 핵심 지표를 종합한 객관적 평가 점수</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
                <div className="text-xs font-black text-purple-400">03. 주도 테마 맵</div>
                <h3 className="text-white font-bold text-sm">실시간 섹터 자금 흐름</h3>
                <p className="text-gray-400 text-xs leading-relaxed">인공지능, 2차전지, 바이오, 로봇 등 시장을 주도하는 테마와 대장주 실시간 추적</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
                <div className="text-xs font-black text-amber-400">04. 리스크 사전 감지</div>
                <h3 className="text-white font-bold text-sm">대차·신용 위험 경고</h3>
                <p className="text-gray-400 text-xs leading-relaxed">대차잔고, 신용융자 잔고율, 공매도 비중을 분석하여 급락 위험성을 사전에 경고</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link href="/about" className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                플랫폼 신뢰성 및 데이터 정책 자세히 보기 →
              </Link>
            </div>
          </section>

          {/* 3. 주식 투자 실전 가이드 - 필수 금융 지식 46선 (시각적 정식 렌더링) */}
          <section className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white">
                  📚 주식 투자 실전 백과 - 필수 금융 지식 46선
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  워런 버핏의 밸류에이션부터 기술적 차트 보조지표까지 초보자도 쉽게 배울 수 있는 실전 백과사전입니다.
                </p>
              </div>
              <Link 
                href="/guide" 
                className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold transition-all shrink-0 self-start sm:self-auto"
              >
                전체 46개 가이드 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {INVESTMENT_GUIDES.map(({ href, title, desc }) => (
                <Link 
                  key={href} 
                  href={href}
                  className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/5 hover:border-purple-500/40 transition-all group block"
                >
                  <h3 className="text-white text-xs font-black group-hover:text-purple-400 transition-colors truncate">
                    {title}
                  </h3>
                  <p className="text-gray-400 text-[11px] mt-1 leading-relaxed line-clamp-2">
                    {desc}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* 4. 공공 데이터 수집 기준 및 E-E-A-T 신뢰성 선언 */}
          <section className="bg-gradient-to-br from-zinc-900/80 to-black border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              🏛️ 공공 데이터 수집 기준 및 신뢰성 정책 (Data Integrity)
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              스마트 투자 비서는 금융감독원 전자공시시스템(Open DART), 한국거래소(KRX) 정보데이터시스템, 미국 증권거래위원회(SEC EDGAR) 등 공신력 있는 공식 공공 데이터만을 정량 분석합니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5">
                <div className="text-xs font-bold text-emerald-400 mb-1">✓ 100% 공식 API 연동</div>
                <p className="text-gray-400 text-xs">금융감독원 및 거래소 인가 파이프라인을 통해 왜곡 없는 순수 원천 데이터만을 수집합니다.</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5">
                <div className="text-xs font-bold text-blue-400 mb-1">✓ 객관적 정량 분석 지향</div>
                <p className="text-gray-400 text-xs">주관적 루머나 찌라시를 배제하고, 재무제표 팩트와 실체결 수급 통계에 기반한 객관적 지표만을 산출합니다.</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5">
                <div className="text-xs font-bold text-purple-400 mb-1">✓ 완전 무료 &amp; 안전한 정보</div>
                <p className="text-gray-400 text-xs">불법 리딩방 권유나 유료 결제 없이, 건전한 금융 생태계 조성을 위해 모든 핵심 인프라를 평생 무료로 개방합니다.</p>
              </div>
            </div>
          </section>

          {/* 5. 자주 묻는 질문 (FAQ 아코디언/카드) */}
          <section className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="text-xl md:text-2xl font-black text-white">
              ❓ 자주 묻는 질문 (FAQ)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {FAQS.map(({ q, a }, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-2">
                  <h3 className="text-white text-xs sm:text-sm font-bold flex items-start gap-2">
                    <span className="text-blue-400 font-black shrink-0">Q.</span>
                    <span>{q}</span>
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed pl-5">
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. 정식 카카오 애드핏 배너 (클로킹/자동리프레시 제거, 구글 애드센스 정책 100% 준수) */}
          <KakaoRevenueAd type="banner" />

        </div>
      </div>
    </>
  );
}
