import { Metadata } from 'next';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { STATIC_POSTS } from '@/lib/staticBlogPosts';
import { API_BASE_URL } from '@/lib/config';
import EditorialArchiveHub from '@/components/EditorialArchiveHub';

export const revalidate = 60;

async function getFeaturedBlogPosts() {
  try {
    const baseUrl = API_BASE_URL || (typeof window === 'undefined' ? "http://127.0.0.1:8000" : "");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${baseUrl}/api/blog/posts?page=1&limit=6`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.status === "ok" && Array.isArray(data.posts) && data.posts.length > 0) {
        return data.posts.slice(0, 6);
      }
    }
  } catch (err) {
    console.warn("Featured blog posts fallback to static:", err);
  }
  return STATIC_POSTS.slice(0, 6);
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
  const featuredBlogPosts = await getFeaturedBlogPosts();

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

      {/* ── 2. [하단 정돈 배치] 금융 리서치 & 투자 지식 아카이브 (깔끔한 탭 허브 형태) ── */}
      <div className="border-t border-white/10 bg-[#06070a]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <EditorialArchiveHub
            featuredBlogPosts={featuredBlogPosts}
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
