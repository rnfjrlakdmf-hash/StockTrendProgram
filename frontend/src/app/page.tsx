import { Metadata } from 'next';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { BookOpen, Newspaper, ShieldCheck, Layers } from 'lucide-react';

export const revalidate = 300;

async function getLatestTheoryPosts() {
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

const SECTOR_RESEARCH_LINKS = [
  { href: '/theme/semiconductor', title: '반도체 · HBM 밸류체인', desc: '전공정·후공정 패키징 및 고대역폭메모리(HBM) 산업 구조 분석' },
  { href: '/theme/ai', title: '인공지능(AI) 인프라', desc: '데이터센터 서버, NPU·GPU 가속기 및 엔터프라이즈 AI 생태계' },
  { href: '/theme/secondary-battery', title: '2차전지 · 양극재 소재', desc: '삼원계(NCM)·LFP 배터리 셀 및 핵심 광물 공급망 리서치' },
  { href: '/theme/nuclear', title: '원자력 · SMR 에너지', desc: '소형모듈원전(SMR) 주기기 제작과 글로벌 전력망 확충 사이클' },
  { href: '/theme/defense', title: '방위산업 · 우주항공', desc: '글로벌 국방비 증액 기조와 수주잔고 기반 장기 실적 가시성 평가' },
  { href: '/theme/bio', title: '바이오 · 신약 플랫폼', desc: '임상 1·2·3상 파이프라인 가치평가(rNPV)와 기술수출(L/O) 구조' },
  { href: '/theme/shipbuilding', title: '조선 · 친환경 LNG선', desc: '신조선가 지수 추이와 고부가가치 친환경 선박 도크 수주 분석' },
  { href: '/theme/low-pbr', title: '기업 밸류업 · 주주환원', desc: '자사주 매입·소각, 배당성향 확대 및 저PBR 가치주 재평가 원리' },
];

const FAQS = [
  {
    q: '스마트 투자 비서는 어떤 콘텐츠와 데이터를 제공하나요?',
    a: '한국거래소(KRX), 금융감독원 전자공시시스템(Open DART), 미국 증권거래위원회(SEC EDGAR)의 공식 데이터를 바탕으로 작성된 거시경제 시황 칼럼, 46대 필수 주식 용어 백과사전, 재무제표·보조지표 아카데미 강의, 그리고 정량적 수급 통계 도구를 무료로 제공합니다.',
  },
  {
    q: '제공되는 금융 칼럼과 아카데미 교육 자료는 모두 무료인가요?',
    a: '네, 모든 거시경제 리서치 칼럼, 차트·재무 스터디 아카데미, 46대 주식 투자 백과사전 및 배당·평단가 계산기는 별도의 유료 결제 없이 100% 무료로 열람하실 수 있습니다.',
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

      {/* ── 1. [최상단 배치] 실시간 통합 마켓 대시보드 (LIVE RADAR · 공포·탐욕 지수 · 실시간 시세 & 랭킹 허브) ── */}
      <HomeClient />

      {/* ── 2. [하단 정돈 배치] 금융 리서치 & 투자 지식 아카이브 (깔끔하게 정돈된 에디토리얼 영역) ── */}
      <div className="border-t border-white/10 bg-[#06070a]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-8">

          {/* 에디토리얼 헤더 (간결하고 정돈된 타이틀) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-black">
                  RESEARCH JOURNAL
                </span>
                <span className="text-xs text-gray-400">
                  발행 및 편집: 윤희원 (StockTrend Research Team)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                금융 리서치 &amp; 주식 투자 지식 아카이브
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 self-start sm:self-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              KRX · DART · SEC 공식 공공데이터 인증
            </div>
          </div>

          {/* [섹션 1] 심층 금융 리서치 칼럼 6선 (깔끔한 3열 그리드) */}
          <section aria-labelledby="featured-research-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="featured-research-heading" className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-blue-400" /> 심층 금융 리서치 칼럼
              </h3>
              <Link href="/blog" className="text-xs font-bold text-blue-300 hover:text-white bg-blue-500/15 border border-blue-500/30 px-3 py-1.5 rounded-xl transition-all">
                전체 칼럼 보기 →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {featuredBlogPosts.map((post) => {
                const plainDesc = String((post as any).excerpt || post.content || '')
                  .replace(/<[^>]*>?/gm, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 100);
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${encodeURIComponent(post.slug)}`}
                    className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-2.5 group shadow-sm hover:shadow-blue-500/5"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {(post as any).category || '금융 리서치'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                        {plainDesc}...
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                      칼럼 읽기 →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* [섹션 2] 46대 필수 주식 백과사전 & 차트 아카데미 (정돈된 2열 분할 레이아웃) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측: 46대 필수 주식 용어 백과사전 (콤팩트 그리드) */}
            <section aria-labelledby="encyclopedia-heading" className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 id="encyclopedia-heading" className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" /> 46대 필수 주식 용어 백과
                </h3>
                <Link
                  href="/guide"
                  className="text-xs font-bold text-purple-300 hover:text-white bg-purple-500/15 border border-purple-500/30 px-3 py-1 rounded-lg transition-all"
                >
                  46개 전체보기 →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INVESTMENT_GUIDES.slice(0, 9).map(({ href, title, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    className="p-3 rounded-xl bg-zinc-950/70 border border-white/5 hover:border-purple-500/40 transition-all group block shadow-xs"
                  >
                    <h4 className="text-white text-xs font-bold group-hover:text-purple-300 transition-colors truncate">
                      {title}
                    </h4>
                    <p className="text-gray-400 text-[10px] mt-0.5 leading-snug line-clamp-1">
                      {desc}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* 우측: 실전 차트·보조지표 아카데미 */}
            {latestTheoryPosts.length > 0 && (
              <section aria-labelledby="latest-academy-heading" className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 id="latest-academy-heading" className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" /> 차트·보조지표 실전 아카데미
                  </h3>
                  <Link href="/theory" className="text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-lg transition-all">
                    전체 강의 →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {latestTheoryPosts.slice(0, 4).map((post: any) => {
                    const slug = post.slug || post.id;
                    return (
                      <Link
                        key={slug}
                        href={`/theory/${encodeURIComponent(slug)}`}
                        className="p-3 rounded-xl bg-zinc-950/70 border border-white/5 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-2 group"
                      >
                        <div className="space-y-1">
                          <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            차트 스터디
                          </span>
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                            {post.title}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400">
                          강의 읽기 →
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* [섹션 3] 핵심 산업 밸류체인 & 자주 묻는 질문 (FAQ) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 좌측: 핵심 산업 테마 칩 */}
            <section aria-labelledby="sector-research-heading" className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 id="sector-research-heading" className="text-sm sm:text-base font-black text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <Layers className="w-4 h-4 text-amber-400" /> 핵심 산업·섹터 밸류체인
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SECTOR_RESEARCH_LINKS.map(({ href, title, desc }) => (
                  <Link
                    key={href}
                    href={href}
                    className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 hover:border-amber-500/40 transition-all group block"
                  >
                    <h4 className="text-white text-xs font-bold group-hover:text-amber-300 transition-colors truncate">
                      {title}
                    </h4>
                    <p className="text-gray-400 text-[10px] mt-0.5 truncate">
                      {desc}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* 우측: 정량 분석 원칙 & 자주 묻는 질문 FAQ */}
            <section className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> 데이터 리서치 FAQ
              </h3>
              <div className="space-y-2">
                {FAQS.slice(0, 3).map(({ q, a }, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-1">
                    <h4 className="text-white text-xs font-bold flex items-start gap-1.5">
                      <span className="text-blue-400 font-black shrink-0">Q.</span>
                      <span>{q}</span>
                    </h4>
                    <p className="text-gray-400 text-[11px] leading-relaxed pl-4">
                      {a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </div>
      </div>
    </>
  );
}
