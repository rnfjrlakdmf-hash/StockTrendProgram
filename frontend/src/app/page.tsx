import { Metadata } from 'next';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { BookOpen, Newspaper, ShieldCheck } from 'lucide-react';
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
    // API 장애 시 정적 이론 전용 슬라이스(13~19) 사용
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
  { href: '/guide/roe', title: 'ROE (자기자본이익률)', desc: '자기자본 대비 이익 창출 효율성과 듀퐁(DuPont) 재무 분석' },
  { href: '/guide/eps', title: 'EPS (주당순이익)', desc: '주당순이익 성장 추이와 희석주당순이익을 통한 수익성 검증' },
  { href: '/guide/rsi', title: 'RSI (상대강도지수)', desc: '가격 상승·하락 압력의 상대적 강도와 다이버전스 통계 해석법' },
  { href: '/guide/macd', title: 'MACD 추세 지표', desc: '단기·장기 지수이동평균 수렴·확산 원리와 히스토그램 국면 분석' },
  { href: '/guide/bollinger-band', title: '볼린저 밴드', desc: '이동평균선과 표준편차를 활용한 가격 변동성 구간 통계 측정' },
  { href: '/guide/moving-average', title: '이동평균선(MA)', desc: '5일·20일·60일·120일 기간별 평균 체결가와 정배열·역배열 구조' },
  { href: '/guide/dividend-yield', title: '배당수익률과 배당성향', desc: '잉여현금흐름(FCF) 기반 배당 지속가능성과 인컴 포트폴리오 설계' },
  { href: '/guide/dart', title: 'DART 전자공시 독해법', desc: '사업보고서, 분기보고서, 단일판매·공급계약 공시 핵심 체크리스트' },
  { href: '/guide/fomc', title: 'FOMC와 통화정책', desc: '미국 연방준비제도 기준금리 결정 구조와 점도표(Dot Plot) 해석' },
  { href: '/guide/etf', title: 'ETF 구조와 추적오차', desc: '상장지수펀드(ETF)의 순자산가치(NAV), 괴리율, 총보수(TER) 비교 기준' },
];

const FAQS = [
  {
    q: '스마트 투자 비서는 어떤 콘텐츠와 데이터를 제공하나요?',
    a: '한국거래소(KRX), 금융감독원 전자공시시스템(Open DART), 미국 증권거래위원회(SEC EDGAR)의 공식 데이터를 바탕으로 작성된 거시경제 시황 칼럼, 46대 필수 주식 용어 백과사전, 재무제표·보조지표 아카데미 강의, 그리고 정량적 수급 통계 도구를 무료로 제공합니다.',
  },
  {
    q: '제공되는 금융 칼럼과 아카데미 교육 자료는 모두 무료인가요?',
    a: '네, 모든 거시경제 리서치 칼럼, 70편 이상의 차트·재무 스터디 아카데미, 46대 주식 투자 백과사전 및 배당·평단가 계산기는 별도의 유료 결제 없이 100% 무료로 열람하실 수 있습니다.',
  },
  {
    q: '기업 공시(DART·SEC)와 수급 데이터는 어떤 기준으로 분석하나요?',
    a: '주관적인 풍문이나 루머를 배제하고, 금융감독원 DART에 공시된 정식 사업보고서·공급계약 수치와 거래소의 기관·외국인 순매수 통계만을 정량적으로 요약하여 정보 비대칭 해소를 돕습니다.',
  },
  {
    q: '유사투자자문이나 종목 추천을 하는 사이트인가요?',
    a: '아닙니다. 스마트 투자 비서는 자본시장과 금융투자업에 관한 법률을 엄격히 준수하며, 1:1 투자 자문이나 특정 종목의 매수·매도 추천 행위를 일절 하지 않는 순수 금융 교육·데이터 리서치 미디어입니다.',
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

      {/* [에디토리얼 헤드라인 1] 구글 애드센스 승인 전용 고품질 금융 리서치 & 백과사전 매거진 (Above the Fold) */}
      <div className="bg-gradient-to-b from-slate-950 via-zinc-950 to-dark-900 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-10 space-y-8">
          
          {/* 매거진 마스트헤드 */}
          <div className="rounded-3xl bg-gradient-to-br from-blue-950/40 via-zinc-900/60 to-purple-950/20 border border-blue-500/20 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl bg-blue-500 text-white text-xs font-black tracking-wider shadow-sm">
                  RESEARCH JOURNAL
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  발행 및 편집: 윤희원 (StockTrend Research Team)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                KRX · DART · SEC 공식 공공데이터 인증 리서치
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-snug">
                스마트 투자 비서 <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">금융 리서치 &amp; 주식 투자 아카데미</span>
              </h1>
              <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-4xl">
                한국거래소(KRX)와 금융감독원 전자공시시스템(Open DART), 미국 증권거래위원회(SEC EDGAR)의 공식 데이터를 바탕으로 거시경제 시황 칼럼, 기업 재무제표 밸류에이션(PER·PBR·ROE) 연구 및 46대 필수 주식 용어 백과사전을 무료로 제공하는 금융 교육 미디어입니다.
              </p>
            </div>

            {/* 빠른 섹션 이동 탭 */}
            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href="#market-dashboard"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                📊 실시간 마켓 대시보드로 이동 ↓
              </a>
              <Link
                href="/guide"
                className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs md:text-sm font-bold transition-all"
              >
                📚 46대 필수 주식 용어 백과
              </Link>
              <Link
                href="/blog"
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs md:text-sm font-bold transition-all"
              >
                📰 마켓 리서치 칼럼 (25편)
              </Link>
              <Link
                href="/theory"
                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs md:text-sm font-bold transition-all"
              >
                📘 실전 차트 스터디
              </Link>
            </div>
          </div>

          {/* [섹션 1] 심층 금융 리서치 & 거시경제 분석 칼럼 6선 (텍스트 풍부한 상단 배치) */}
          <section aria-labelledby="featured-research-heading" className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 id="featured-research-heading" className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-blue-400" /> 오늘의 추천 금융 리서치 &amp; 거시경제 칼럼
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  재무제표 독해법, 금리·환율 거시경제 사이클, 기업 밸류에이션(PER·PBR·ROE)을 깊이 있게 분석한 정통 리서치 칼럼입니다.
                </p>
              </div>
              <Link href="/blog" className="text-xs font-bold text-blue-300 hover:text-white bg-blue-500/15 border border-blue-500/30 px-3.5 py-2 rounded-xl self-start sm:self-center shrink-0">
                전체 칼럼 25편 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredBlogPosts.map((post) => {
                const plainDesc = String((post as any).excerpt || post.content || '')
                  .replace(/<[^>]*>?/gm, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 140);
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${encodeURIComponent(post.slug)}`}
                    className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3 group shadow-sm hover:shadow-blue-500/5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {(post as any).category || '금융 리서치'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                        {plainDesc}...
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1 pt-1">
                      리서치 전문 읽기 →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* [섹션 2] 46대 필수 주식 투자 백과사전 핵심 지표 해설 */}
          <section aria-labelledby="encyclopedia-heading" className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 id="encyclopedia-heading" className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" /> 46대 주식 투자 필수 용어 백과사전
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  기업 가치평가(PER·PBR·ROE)부터 거시경제 지표(FOMC·배당·공시)까지 체계적으로 정리한 금융 백과사전입니다.
                </p>
              </div>
              <Link
                href="/guide"
                className="text-xs font-bold text-purple-300 hover:text-white bg-purple-500/15 border border-purple-500/30 px-3.5 py-2 rounded-xl self-start sm:self-center shrink-0"
              >
                전체 46개 사전 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {INVESTMENT_GUIDES.map(({ href, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 hover:border-purple-500/40 transition-all group block shadow-sm"
                >
                  <h3 className="text-white text-xs sm:text-sm font-bold group-hover:text-purple-300 transition-colors truncate">
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

      {/* 2. 통합 마켓 대시보드 (헤더 검색 + 실시간 시세 허브 + 카카오 배너 광고 유지) */}
      <div id="market-dashboard">
        <HomeClient />
      </div>

      {/* 3. 하단 실전 차트 스터디 · 공공데이터 원칙 및 FAQ · 카카오 하단 광고 유지 */}
      <div className="border-t border-white/10 bg-[#06070a]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-10">

          {/* [섹션 3] 실전 주식 차트 & 기술적 보조지표 아카데미 6선 */}
          {latestTheoryPosts.length > 0 && (
            <section aria-labelledby="latest-academy-heading" className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 id="latest-academy-heading" className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-400" /> 실전 주식 차트 &amp; 기술적 보조지표 아카데미
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    캔들 차트 구조, 이동평균선, RSI·MACD·볼린저밴드의 산출 원리와 실전 사례를 해설하는 금융 교육 연재물입니다.
                  </p>
                </div>
                <Link href="/theory" className="text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 rounded-xl self-start sm:self-center shrink-0">
                  전체 강의 보기 →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {latestTheoryPosts.map((post: any) => {
                  const plainDesc = String(post.summary || post.content || '')
                    .replace(/<[^>]*>?/gm, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 130);
                  const slug = post.slug || post.id;
                  return (
                    <Link
                      key={slug}
                      href={`/theory/${encodeURIComponent(slug)}`}
                      className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div className="space-y-2">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          차트·보조지표 강의
                        </span>
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                          {post.title}
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                          {plainDesc}...
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400">
                        강의 읽기 →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* [섹션 4] 공공 데이터 수집 기준 & 자주 묻는 질문 (컴팩트 통합 카드) */}
          <section className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-3 pb-4 border-b border-white/10">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base md:text-lg font-black text-white">
                  공공 데이터 수집 원칙 및 자주 묻는 질문 (FAQ)
                </h2>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  스마트 투자 비서는 금융감독원 전자공시시스템(Open DART), 한국거래소(KRX), 미국 증권거래위원회(SEC EDGAR)의 공식 공공 데이터를 정량 분석하며 자본시장법을 준수합니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FAQS.map(({ q, a }, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-1.5">
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
