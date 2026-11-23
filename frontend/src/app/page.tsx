import { Metadata } from 'next';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { FALLBACK_ECONOMICS_POSTS } from '@/lib/economicsFallback';
import { API_BASE_URL } from '@/lib/config';
import EditorialArchiveHub from '@/components/EditorialArchiveHub';

export const revalidate = 60;

async function getFeaturedBlogPosts() {
  try {
    const baseUrl = API_BASE_URL || (typeof window === 'undefined' ? "http://127.0.0.1:8000" : "");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${baseUrl}/api/blog/posts?page=1&limit=12`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "ok" && Array.isArray(data.posts) && data.posts.length > 0) {
        const seen = new Set<string>();
        const deduped = data.posts.filter((p: any) => {
          const k = String(p.title || '').replace(/\s+/g, '').slice(0, 20);
          if (!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        if (deduped.length > 0) return deduped.slice(0, 6);
      }
    }
  } catch (err) {
    console.warn("Featured blog posts fallback to static:", err);
  }
  return STATIC_POSTS.slice(0, 6);
}

async function getLatestEconomicsPosts() {
  try {
    const baseUrl = API_BASE_URL || (typeof window === 'undefined' ? "http://127.0.0.1:8000" : "");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${baseUrl}/api/economics/posts?page=1&limit=4`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "ok" && Array.isArray(data.posts) && data.posts.length > 0) {
        return data.posts.slice(0, 4);
      }
    }
  } catch (err) {
    console.warn("Latest economics posts fallback:", err);
  }
  return FALLBACK_ECONOMICS_POSTS.slice(0, 4);
}

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
  title: '스마트 투자 비서 | 금융 리서치 칼럼 · 기업 재무제표 분석 · 매일 1일 1경제학',
  description: '거시경제 시황 분석 칼럼, 매일 1일 1경제학 공부방, PER·PBR·ROE 기업 재무제표 밸류에이션 연구, 46대 필수 금융 용어 백과사전 및 DART·SEC 공시 해설을 무료로 제공하는 금융 교육·리서치 미디어입니다.',
  keywords: [
    '금융 리서치 칼럼', '기업 재무제표 분석', '주식 투자 백과사전', '매일 1일 1경제학',
    '거시경제 시황 분석', 'DART 전자공시 해설', 'PER PBR ROE 계산법', '기술적 보조지표 강의',
    '배당주 투자 전략', 'ETF 자산배분 가이드', 'FOMC 금리 분석', '스마트 투자 비서'
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
    a: '한국거래소(KRX), 금융감독원 전자공시시스템(Open DART), 미국 증권거래위원회(SEC EDGAR)의 공식 공공 데이터를 바탕으로 작성된 거시경제 시황 칼럼, 매일 1일 1경제학 공부방, 46대 필수 주식 용어 백과사전, 재무제표·보조지표 아카데미 강의를 100% 무료로 제공합니다.',
  },
  {
    q: '제공되는 금융 칼럼과 아카데미 교육 자료는 모두 무료인가요?',
    a: '네, 모든 거시경제 리서치 칼럼, 매일 1일 1경제학, 차트·재무 스터디 아카데미, 46대 주식 투자 백과사전 및 배당·평단가 계산기는 별도의 유료 결제 없이 누구나 무료로 열람하실 수 있습니다.',
  },
  {
    q: '기업 공시(DART·SEC)와 재무 데이터는 어떤 기준으로 검증하나요?',
    a: '확인되지 않은 풍문이나 주관적 추측을 배제하고, 금융감독원 DART에 공시된 정식 사업보고서·공급계약 수치와 거래소의 공식 시세·수급 통계만을 정량적으로 요약·검수하여 개인 투자자의 정보 비대칭 해소를 돕습니다.',
  },
  {
    q: '유사투자자문이나 특정 종목 추천을 하는 사이트인가요?',
    a: '아닙니다. 스마트 투자 비서는 자본시장과 금융투자업에 관한 법률을 엄격히 준수하며, 1:1 투자 자문이나 특정 유가증권의 매수·매도 추천 행위를 일절 하지 않는 순수 금융 교육·데이터 리서치 미디어입니다.',
  },
];

export default async function Home() {
  const [latestTheoryPosts, featuredBlogPosts, latestEconomicsPosts] = await Promise.all([
    getLatestTheoryPosts(),
    getFeaturedBlogPosts(),
    getLatestEconomicsPosts(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://stock-trend-program.co.kr/#website",
        "url": "https://stock-trend-program.co.kr",
        "name": "스마트 투자 비서",
        "description": "거시경제 금융 리서치 칼럼, 매일 1일 1경제학, 기업 재무제표 분석 및 주식 투자 아카데미 플랫폼",
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

      {/* ── 0. [SSR 에디토리얼 마스트헤드] 검색엔진·독자 모두에게 명확한 H1 및 금융 교육 미디어 정체성 선언 ── */}
      <section className="border-b border-white/10 bg-gradient-to-b from-[#0b1020] via-[#090c14] to-transparent">
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
                <span>🏛️ 금융 리서치 · 경제학 · 재무 교육 미디어</span>
                <span className="text-white/25">|</span>
                <span className="text-gray-300">KRX · DART · SEC 공식 공공데이터 기반</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight break-keep">
                스마트 투자 비서 — 거시경제 시황·재무 분석·매일 1일 1경제학
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed break-keep">
                한국거래소(KRX), 금융감독원 전자공시(DART), 미국 SEC EDGAR 공시 데이터를 바탕으로 초보 투자자부터 실전 연구자까지 누구나 무료로 읽을 수 있는{' '}
                <strong className="text-white">거시경제 리서치 칼럼</strong>, <strong className="text-white">46대 주식 용어 백과사전</strong>,{' '}
                <strong className="text-white">20대 산업 밸류체인 보고서</strong>, <strong className="text-white">매일 1일 1경제학 아카데미</strong>를 발행합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
              <Link href="/economics" className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 font-bold transition-colors">
                🎓 매일 1일 1경제학
              </Link>
              <Link href="/blog" className="px-3.5 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/35 text-blue-200 font-bold transition-colors">
                📰 마켓 리서치 칼럼
              </Link>
              <Link href="/guide" className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-200 font-bold transition-colors">
                📚 용어 백과 46선
              </Link>
              <Link href="/about" className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold transition-colors">
                운영·편집 원칙
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 1. 실시간 통합 마켓 대시보드 (공포·탐욕 지수 · 실시간 시세 & 거시경제 지표) ── */}
      <HomeClient />

      {/* ── 2. 금융 리서치 & 투자 지식 아카이브 (전체 핵심 섹션 100% SSR 초기 렌더링) ── */}
      <div className="border-t border-white/10 bg-[#06070a]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <EditorialArchiveHub
            featuredBlogPosts={featuredBlogPosts}
            latestEconomicsPosts={latestEconomicsPosts}
            latestTheoryPosts={latestTheoryPosts}
            investmentGuides={INVESTMENT_GUIDES}
            sectorResearchLinks={SECTOR_RESEARCH_LINKS}
            faqs={FAQS}
          />
        </div>
      </div>
    </>
  );
}
