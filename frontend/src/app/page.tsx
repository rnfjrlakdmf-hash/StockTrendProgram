import { Metadata } from 'next';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { 
  Trophy, Calculator, Zap, Shield, BookOpen, Newspaper, GraduationCap, BarChart3
} from 'lucide-react';
import KakaoRevenueAd from '@/components/KakaoRevenueAd';

export const revalidate = 300;

async function getLatestTheoryPosts() {
  const staticSlugSet = new Set(STATIC_POSTS.slice(0, 13).map(p => p.slug));
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('https://stock-trend-program.co.kr/api/theory/posts?page=1&limit=10', {
      next: { revalidate: 300 },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.posts) && data.posts.length > 0) {
        const filtered = data.posts.filter((p: any) => !staticSlugSet.has(p.slug || p.id));
        if (filtered.length >= 6) {
          return filtered.slice(0, 6);
        }
      }
    }
  } catch {
    // API 장애 시 정적 이론 전용 슬라이스(13~19) 사용 (/blog 칼럼과 100% 분리)
  }

  return STATIC_POSTS.slice(13, 19).map(p => ({
    id: p.id,
    title: p.title,
    content: p.content,
    summary: p.content.replace(/<[^>]*>?/gm, ' ').substring(0, 150),
    slug: p.slug || p.id,
    createdAt: p.createdAt,
    tags: p.tags
  }));
}

export const metadata: Metadata = {
  title: '스마트 투자 비서 | 금융 리서치 칼럼 · 기업 재무제표 분석 · 주식 투자 아카데미',
  description: '거시경제 시황 분석 칼럼, PER·PBR·ROE 기업 재무제표 밸류에이션 연구, 46대 필수 금융 용어 백과사전, 금융감독원 DART 및 미국 SEC 공시 해설을 무료로 제공하는 금융 교육·리서치 미디어입니다.',
  keywords: [
    '금융 리서치 칼럼', '기업 재무제표 분석', '주식 투자 백과사전', '거시경제 시황 분석',
    'DART 전자공시 해설', 'PER PBR ROE 계산법', '기술적 보조지표 강의', '배당주 투자 전략',
    'ETF 자산배분 가이드', 'FOMC 금리 분석', '스마트 투자 비서'
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

const INVESTMENT_GUIDES = [
  { href: '/guide/per', title: 'PER (주가수익비율)', desc: '기업 순이익 대비 적정 주가 산출과 업종별 밸류에이션 비교 방법론' },
  { href: '/guide/pbr', title: 'PBR (주가순자산비율)', desc: '순자산 장부가치 대비 저평가 여부와 청산가치 안전마진 평가' },
  { href: '/guide/roe', title: 'ROE (자기자본이익률)', desc: '워런 버핏이 중시한 자기자본 대비 이익 창출 효율성과 듀퐁 분석' },
  { href: '/guide/eps', title: 'EPS (주당순이익)', desc: '주당순이익 성장 추이와 희석주당순이익을 통한 수익성 검증' },
  { href: '/guide/rsi', title: 'RSI (상대강도지수)', desc: '가격 상승·하락 압력의 상대적 강도와 다이버전스 통계 해석법' },
  { href: '/guide/macd', title: 'MACD 추세 지표', desc: '단기·장기 지수이동평균 수렴·확산 원리와 히스토그램 국면 분석' },
  { href: '/guide/bollinger-band', title: '볼린저 밴드', desc: '이동평균선과 표준편차를 활용한 가격 변동성 구간 통계 측정' },
  { href: '/guide/moving-average', title: '이동평균선(MA)', desc: '5일·20일·60일·120일 기간별 평균 체결가와 정배열·역배열 구조' },
  { href: '/guide/golden-cross', title: '골든크로스 & 데드크로스', desc: '단기·장기 이동평균선 교차 현상의 통계적 의미와 속임수 판별법' },
  { href: '/guide/volume', title: '거래량 수급 분석', desc: '가격 변동 국면별 거래량 추이와 기관·외국인 수급 집중도 해석' },
  { href: '/guide/dividend-yield', title: '배당수익률과 배당성향', desc: '잉여현금흐름(FCF) 기반 배당 지속가능성과 인컴 포트폴리오 설계' },
  { href: '/guide/ex-dividend-date', title: '배당기준일과 배당락', desc: '결산·분기 배당 권리 확정 구조와 배당락일 이론 가격 변동 계산' },
  { href: '/guide/short-selling', title: '공매도 & 대차잔고', desc: '대차거래 체결 메커니즘과 공매도 비중 데이터를 읽는 법' },
  { href: '/guide/dart', title: 'DART 전자공시 독해법', desc: '사업보고서, 분기보고서, 단일판매·공급계약 공시 핵심 체크리스트' },
  { href: '/guide/disclosure', title: '유상증자·무상증자 해설', desc: '자본 조달 방식(제3자배정·주주배정)에 따른 지분가치 희석 효과 분석' },
  { href: '/guide/fomc', title: 'FOMC와 통화정책', desc: '미국 연방준비제도 기준금리 결정 구조와 점도표(Dot Plot) 해석' },
  { href: '/guide/interest-rate', title: '금리 사이클과 자산배분', desc: '국채 수익률 곡선(장단기 금리차)과 거시경제 경기 순환 국면 분석' },
  { href: '/guide/inflation', title: '인플레이션(CPI·PCE)', desc: '소비자물가지수·근원물가 추이가 기업 영업이익률과 할인율에 미치는 영향' },
  { href: '/guide/etf', title: 'ETF 구조와 추적오차', desc: '상장지수펀드(ETF)의 순자산가치(NAV), 괴리율, 총보수(TER) 비교 기준' },
  { href: '/guide/value-investing', title: '가치투자(Value Investing)', desc: '벤저민 그레이엄의 안전마진 개념과 내재가치 추정 프레임워크' },
  { href: '/guide/growth-investing', title: '성장주 밸류에이션(PEG)', desc: '매출·영업이익 고성장 기업의 PEG 지표 및 현금흐름할인법(DCF) 기초' },
  { href: '/guide/stop-loss', title: '손실 제한과 변동성 관리', desc: '손익비(Risk-Reward Ratio) 설계와 최대낙폭(MDD) 통제 원칙' },
  { href: '/guide/averaging-down', title: '분할 매수와 평단가 계산', desc: '코스트 애버리징(Cost Averaging)의 수학적 원리와 비중 관리 원칙' },
  { href: '/guide/rebalancing', title: '포트폴리오 리밸런싱', desc: '주식·채권·현금 자산배분 비율 유지와 정기 리밸런싱 효과 분석' },
];

const FAQS = [
  {
    q: '스마트 투자 비서는 어떤 콘텐츠와 데이터를 제공하나요?',
    a: '스마트 투자 비서는 한국거래소(KRX), 금융감독원 전자공시시스템(Open DART), 미국 증권거래위원회(SEC EDGAR)의 공식 데이터를 바탕으로 작성된 거시경제 시황 칼럼, 46대 필수 주식 용어 백과사전, 재무제표·보조지표 아카데미 강의, 그리고 정량적 수급 통계 도구를 무료로 제공합니다.',
  },
  {
    q: '제공되는 금융 칼럼과 아카데미 교육 자료는 모두 무료인가요?',
    a: '네, 모든 거시경제 리서치 칼럼, 70편 이상의 차트·재무 스터디 아카데미, 46대 주식 투자 백과사전 및 배당·평단가 계산기는 별도의 유료 결제 없이 100% 무료로 열람하실 수 있습니다.',
  },
  {
    q: '주식 입문자도 이해할 수 있도록 쉽게 구성되어 있나요?',
    a: '네. 어려운 회계·재무제표 용어(PER, PBR, ROE, 영업현금흐름 등)와 거시경제 지표(FOMC, CPI, 국채 금리 등)를 구체적인 계산 예시와 시각적 도표를 곁들여 기초부터 체계적으로 학습할 수 있도록 집필하였습니다.',
  },
  {
    q: '기업 공시(DART·SEC)와 수급 데이터는 어떤 기준으로 분석하나요?',
    a: '주관적인 풍문이나 루머를 배제하고, 금융감독원 DART에 공시된 정식 사업보고서·공급계약 수치와 거래소의 기관·외국인 순매수 통계만을 정량적으로 요약하여 정보 비대칭 해소를 돕습니다.',
  },
  {
    q: '유사투자자문이나 종목 추천을 하는 사이트인가요?',
    a: '아닙니다. 스마트 투자 비서는 자본시장과 금융투자업에 관한 법률을 엄격히 준수하며, 1:1 투자 자문이나 특정 종목의 매수·매도 추천 행위를 일절 하지 않는 순수 금융 교육·데이터 리서치 미디어입니다.',
  },
  {
    q: '콘텐츠의 저작권과 편집 원칙은 어떻게 관리되나요?',
    a: '모든 아카데미 강의와 리서치 칼럼은 스마트 투자 비서 수석 리서치팀의 자체 집필 및 팩트 검증(Fact-Check) 절차를 거쳐 발행되며, 출처가 명확한 공공 통계만을 인용합니다.',
  },
];

export default async function Home() {
  const latestTheoryPosts = await getLatestTheoryPosts();
  const featuredBlogPosts = STATIC_POSTS.slice(0, 9);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://stock-trend-program.co.kr/#website",
        "url": "https://stock-trend-program.co.kr",
        "name": "스마트 투자 비서",
        "description": "거시경제 금융 리서치 칼럼, 기업 재무제표 분석 및 주식 투자 아카데미 플랫폼",
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

      {/* 1. 상단 에디토리얼 금융 리서치 & 투자 아카데미 매거진 허브 (SSR Above-the-Fold) */}
      <div className="bg-gradient-to-b from-[#07090e] via-[#090b10] to-[#06070a] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-12 space-y-10">

          {/* 매거진 헤더 & 주요 섹션 바로가기 */}
          <header className="rounded-3xl bg-gradient-to-br from-blue-950/40 via-zinc-900/80 to-emerald-950/30 border border-white/10 p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-black tracking-wide">
                  <GraduationCap className="w-4 h-4 text-blue-400" />
                  <span>FINANCIAL RESEARCH &amp; INVESTMENT ACADEMY</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  스마트 투자 비서 · 금융 리서치 &amp; 투자 교육 아카데미
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed">
                  한국거래소(KRX)·금융감독원(DART)·미국 SEC 공시 데이터에 기반한 <strong>거시경제 심층 칼럼</strong>, <strong>실전 재무·차트 아카데미(70+강)</strong>, 그리고 <strong>필수 금융 용어 백과사전(46선)</strong>을 무료로 제공하는 정통 금융 리서치 미디어입니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <Link
                  href="/blog"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black transition-all shadow-lg shadow-blue-600/20"
                >
                  📰 마켓 리서치 칼럼
                </Link>
                <Link
                  href="/theory"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-black transition-all"
                >
                  📘 차트·재무 아카데미
                </Link>
                <Link
                  href="/guide"
                  className="px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs sm:text-sm font-black transition-all"
                >
                  📚 금융 백과사전 46선
                </Link>
                <a
                  href="#live-market-dashboard"
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-200 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5"
                >
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>실시간 마켓 상황판 ↓</span>
                </a>
              </div>
            </div>
          </header>

          {/* [에디토리얼 섹션 1] 전문가 심층 경제·가치투자 리서치 칼럼 (SSR 정적 원고 노출) */}
          <section aria-labelledby="featured-research-heading" className="bg-zinc-900/60 border border-blue-500/25 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 id="featured-research-heading" className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-blue-400" /> 심층 금융 리서치 &amp; 거시경제 분석 칼럼
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  기업 재무제표 독해법, 금리·환율 거시경제 사이클, 밸류에이션(PER·PBR·ROE), 배당 및 절세 전략을 깊이 있게 분석한 오리지널 칼럼입니다.
                </p>
              </div>
              <Link href="/blog" className="text-xs font-black text-blue-300 hover:text-blue-200 bg-blue-500/15 border border-blue-500/30 px-4 py-2 rounded-xl self-start sm:self-center">
                전체 칼럼 아카이브 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredBlogPosts.map((post) => {
                const plainDesc = String((post as any).excerpt || post.content || '')
                  .replace(/<[^>]*>?/gm, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 155);
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${encodeURIComponent(post.slug)}`}
                    className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-blue-500/50 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-2">
                      <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {(post as any).category || '심층 금융 리서치'}
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

          {/* [에디토리얼 섹션 2] 최신 차트·보조지표 & 재무 스터디 칼럼 */}
          {latestTheoryPosts.length > 0 && (
            <section aria-labelledby="latest-academy-heading" className="bg-zinc-900/60 border border-emerald-500/25 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 id="latest-academy-heading" className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-400" /> 실전 주식 차트 &amp; 기술적 보조지표 아카데미
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    캔들 차트 구조, 이동평균선, RSI·MACD·볼린저밴드의 수학적 산출 원리와 실전 사례를 체계적으로 해설하는 금융 교육 연재물입니다.
                  </p>
                </div>
                <Link href="/theory" className="text-xs font-black text-emerald-300 hover:text-emerald-200 bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 rounded-xl self-start sm:self-center">
                  전체 아카데미 강의 보기 →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {latestTheoryPosts.map((post: any) => {
                  const plainDesc = String(post.summary || post.content || '')
                    .replace(/<[^>]*>?/gm, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 155);
                  const slug = post.slug || post.id;
                  return (
                    <Link
                      key={slug}
                      href={`/theory/${encodeURIComponent(slug)}`}
                      className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div className="space-y-2">
                        <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          투자 이론 · 보조지표 강의
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

          {/* [에디토리얼 섹션 3] 주식 투자 실전 백과 - 필수 금융 지식 46선 */}
          <section aria-labelledby="encyclopedia-heading" className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <h2 id="encyclopedia-heading" className="text-xl md:text-2xl font-black text-white">
                  📚 주식 투자 실전 백과사전 · 필수 금융 지식 46선
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  기업 가치평가(PER·PBR·ROE·EBITDA)부터 거시경제 지표(FOMC·금리·인플레이션)까지 체계적으로 정리한 금융 백과사전입니다.
                </p>
              </div>
              <Link 
                href="/guide" 
                className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold transition-all shrink-0 self-start sm:self-auto"
              >
                전체 46개 백과사전 보기 →
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

        </div>
      </div>

      {/* 2. 실시간 마켓 데이터 대시보드 (인터랙티브 금융 상황판) */}
      <div id="live-market-dashboard">
        <HomeClient />
      </div>

      {/* 3. 하단 금융 분석 도구 · 데이터 신뢰성 선언 · FAQ */}
      <div className="bg-gradient-to-b from-[#09090b] via-[#06070a] to-[#040406] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-12">

          {/* 스마트 금융 계산 및 리서치 도구 4선 */}
          <section className="bg-gradient-to-br from-purple-950/20 via-zinc-900/60 to-blue-950/20 border border-purple-500/20 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" /> 주요 금융 데이터 분석 도구
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  배당 현금흐름 시뮬레이션, 포트폴리오 분산도 점검, 거시경제 지표를 한눈에 확인하는 분석 도구입니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link 
                href="/research"
                className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/30 hover:border-amber-400/60 transition-all group space-y-2 block"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
                    <Newspaper className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full">리서치</span>
                </div>
                <h3 className="text-white font-black text-base group-hover:text-amber-300 transition-colors">국내·해외 증권 리서치</h3>
                <p className="text-gray-400 text-xs leading-relaxed">국내 상장사, 미국 빅테크, ETF 및 원자재·환율 지표 종합 리서치 센터</p>
              </Link>

              <Link 
                href="/calculator"
                className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 hover:border-blue-400/60 transition-all group space-y-2 block"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-blue-400/20 text-blue-300">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black bg-blue-400/20 text-blue-300 px-2 py-0.5 rounded-full">계산기</span>
                </div>
                <h3 className="text-white font-black text-base group-hover:text-blue-300 transition-colors">스마트 금융 계산기</h3>
                <p className="text-gray-400 text-xs leading-relaxed">분할 매수 평균단가 시뮬레이터 및 월배당·연간 배당금 현금흐름 계산기</p>
              </Link>

              <Link 
                href="/signals"
                className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 hover:border-red-400/60 transition-all group space-y-2 block"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-orange-400/20 text-orange-300">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black bg-orange-400/20 text-orange-300 px-2 py-0.5 rounded-full">매크로</span>
                </div>
                <h3 className="text-white font-black text-base group-hover:text-orange-300 transition-colors">글로벌 마켓 지표</h3>
                <p className="text-gray-400 text-xs leading-relaxed">원·달러 환율, 국채 금리, 원자재 시세 및 DART 전자공시 현황 모니터링</p>
              </Link>

              <Link 
                href="/theme"
                className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-400/60 transition-all group space-y-2 block"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-emerald-400/20 text-emerald-300">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">산업분석</span>
                </div>
                <h3 className="text-white font-black text-base group-hover:text-emerald-300 transition-colors">20대 핵심 산업·섹터 분석</h3>
                <p className="text-gray-400 text-xs leading-relaxed">반도체, AI, 2차전지, 바이오, 조선·방산 등 20대 핵심 산업 밸류체인 리서치</p>
              </Link>
            </div>
          </section>

          {/* 공공 데이터 수집 기준 및 E-E-A-T 신뢰성 선언 */}
          <section className="bg-gradient-to-br from-zinc-900/80 to-black border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              🏛️ 공공 데이터 수집 기준 및 편집 윤리 정책 (Editorial &amp; Data Integrity)
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              스마트 투자 비서는 금융감독원 전자공시시스템(Open DART), 한국거래소(KRX) 정보데이터시스템, 미국 증권거래위원회(SEC EDGAR) 등 공신력 있는 공식 공공 데이터만을 정량 분석하며, 모든 교육 칼럼은 엄격한 팩트 검증을 거쳐 발행됩니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5">
                <div className="text-xs font-bold text-emerald-400 mb-1">✓ 공식 공시·거래소 데이터 연동</div>
                <p className="text-gray-400 text-xs">금융감독원 DART 및 거래소 공식 통계 파이프라인을 통해 왜곡 없는 원천 재무 데이터를 수집합니다.</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5">
                <div className="text-xs font-bold text-blue-400 mb-1">✓ 객관적 재무·통계 리서치</div>
                <p className="text-gray-400 text-xs">근거 없는 풍문을 배제하고, 감사보고서 수치와 수급 통계에 기반한 객관적 금융 해설만을 제공합니다.</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5">
                <div className="text-xs font-bold text-purple-400 mb-1">✓ 자본시장법 준수 및 무료 개방</div>
                <p className="text-gray-400 text-xs">유료 리딩방 유도나 매매 권유 없이, 건전한 투자 문화 정착을 위해 모든 아카데미 콘텐츠를 무료로 개방합니다.</p>
              </div>
            </div>
          </section>

          {/* 자주 묻는 질문 (FAQ) */}
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

          <KakaoRevenueAd type="bottom" />

        </div>
      </div>
    </>
  );
}
