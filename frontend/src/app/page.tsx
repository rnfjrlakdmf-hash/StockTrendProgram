import { Metadata } from 'next';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { 
  BookOpen, Newspaper, ChevronRight, TrendingUp, Bell, Shield, BarChart3, 
  HelpCircle, Sparkles, ArrowUpRight, Cpu, Layers, CheckCircle2, Award, 
  Lock, Globe, Database, Scale
} from 'lucide-react';

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
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 space-y-20">

          {/* 에디토리얼 인트로: 플랫폼 비전 */}
          <section className="bg-gradient-to-br from-blue-900/15 via-zinc-900/40 to-transparent border border-blue-500/20 rounded-3xl p-8 md:p-12 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold">
              <Cpu className="w-3.5 h-3.5" />
              <span>DATA-DRIVEN FINANCIAL INTELLIGENCE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              개인 투자자를 위한 차세대 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">AI 퀀트 금융 정보 플랫폼</span>
            </h2>
            <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-4xl">
              스마트 투자 비서는 금융감독원 전자공시시스템(DART), 한국거래소(KRX), 미국 증권거래위원회(SEC EDGAR) 등 
              공신력 있는 공공 데이터에 최첨단 퀀트 알고리즘을 결합하여, 기관 투자자와 개인 투자자 간의 정보 비대칭성을 해소하는 완전 무료 주식 정보 인프라입니다.
            </p>
          </section>

          {/* 서비스 4대 핵심 역량 */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" /> 스마트 투자 비서 4대 핵심 엔진
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  국내외 증시 실시간 수급과 공시 팩트를 정량적으로 분석합니다.
                </p>
              </div>
              <Link 
                href="/about" 
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0"
              >
                서비스 소개 자세히 보기 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Bell, color: 'text-blue-400', bg: 'border-blue-500/20 bg-blue-500/5', title: '실시간 수급·공시 레이더', desc: '외인·기관 순매수 집중주 및 DART 공급계약·내부자 지분 변동 공시 실시간 포착' },
                { icon: BarChart3, color: 'text-purple-400', bg: 'border-purple-500/20 bg-purple-500/5', title: 'AI 퀀트 종합 밸류에이션', desc: 'PER, PBR, ROE, RSI, MACD 등 20개 이상의 핵심 지표를 종합한 정량 분석 점수' },
                { icon: TrendingUp, color: 'text-emerald-400', bg: 'border-emerald-500/20 bg-emerald-500/5', title: '실시간 주도 테마 맵', desc: '인공지능, 2차전지, 바이오, 로봇 등 시장을 주도하는 테마와 대장주 실시간 추적' },
                { icon: Shield, color: 'text-amber-400', bg: 'border-amber-500/20 bg-amber-500/5', title: '리스크 사전 감지 시스템', desc: '대차잔고, 신용융자 잔고율, 공매도 비중을 분석하여 급락 위험성을 사전에 경고' },
              ].map(({ icon: Icon, color, bg, title, desc }) => (
                <div key={title} className={`p-6 rounded-2xl border ${bg} transition-all hover:bg-white/[0.04] space-y-2`}>
                  <Icon className={`w-6 h-6 ${color} mb-3`} />
                  <h3 className="text-white font-bold text-sm md:text-base">{title}</h3>
                  <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 12대 추천 주식 투자 가이드 */}
          <section>
            <div className="flex items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" /> 주식 투자 실전 가이드
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  성공적인 자산 관리를 위해 반드시 알아야 할 46대 필수 금융 지식을 정리했습니다.
                </p>
              </div>
              <Link 
                href="/guide" 
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0"
              >
                전체 46개 가이드 보기 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {INVESTMENT_GUIDES.map(({ href, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all flex items-center justify-between group"
                >
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{title}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </section>

          {/* E-E-A-T 데이터 수집 및 투명성 안내 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10 space-y-6">
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
              <Database className="w-5 h-5 text-blue-400" /> 공공 데이터 수집 기준 및 신뢰성 정책
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs md:text-sm text-gray-300">
              <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" /> 100% 공공 공식 API 연동
                </div>
                <p className="text-gray-400 leading-relaxed text-xs">
                  금융감독원 Open DART, 한국거래소(KRX) 정보데이터시스템, 미국 SEC EDGAR 등 공식 인가된 공공 API 파이프라인을 통해 왜곡 없는 순수 원천 데이터만을 수집합니다.
                </p>
              </div>
              <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Scale className="w-4 h-4 text-green-400" /> 객관적 정량 분석 지향
                </div>
                <p className="text-gray-400 leading-relaxed text-xs">
                  주관적 루머나 미확인 찌라시를 배제하고, 재무제표 팩트, 공시 사실관계, 실시간 수급 통계에 기반한 객관적인 지표만을 산출하여 제공합니다.
                </p>
              </div>
              <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Lock className="w-4 h-4 text-green-400" /> 완전 무료 & 안전한 정보
                </div>
                <p className="text-gray-400 leading-relaxed text-xs">
                  불법 리딩방 가입 권유나 유료 결제 유도 없이, 건전한 금융 생태계 조성을 위해 모든 핵심 인텔리전스를 개인 투자자에게 평생 무료로 개방합니다.
                </p>
              </div>
            </div>
          </section>

          {/* 자주 묻는 질문 (FAQ) */}
          <section>
            <h2 className="text-xl md:text-2xl font-black text-white mb-6 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" /> 자주 묻는 질문 (FAQ)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FAQS.map(({ q, a }) => (
                <div key={q} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <h3 className="text-white font-bold text-sm md:text-base flex items-start gap-2">
                    <span className="text-amber-400 font-mono font-black">Q.</span> {q}
                  </h3>
                  <p className="text-gray-400 text-xs md:text-sm leading-relaxed pl-5 font-normal">
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 투자 면책 조항 & 공식 링크 푸터 */}
          <footer className="border-t border-white/10 pt-10 space-y-6 text-center sm:text-left">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <h3 className="text-white font-bold text-xs md:text-sm flex items-center justify-center sm:justify-start gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" /> 투자 유의사항 및 법적 면책 공지
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                스마트 투자 비서(StockTrend)에서 제공하는 모든 분석 지표, 주식 시황, 공시 알림 및 퀀트 점수는 투자자의 합리적인 판단을 돕기 위한 <strong>단순 참고용 금융 정보</strong>입니다. 
                본 서비스는 자본시장과 금융투자업에 관한 법률상 유사투자자문 또는 투자일임 서비스가 아니며, 특정 증권의 매수·매도를 권유하지 않습니다. 
                제공되는 데이터의 완전성이나 수익을 보장하지 않으며, 모든 투자 결정과 그에 따른 손익의 최종 책임은 전적으로 투자자 본인에게 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-gray-400 pt-2 font-medium">
              <Link href="/about" className="hover:text-white transition-colors">서비스 소개</Link>
              <span className="text-gray-700">|</span>
              <Link href="/guide" className="hover:text-white transition-colors text-blue-400 font-bold">투자 가이드</Link>
              <span className="text-gray-700">|</span>
              <Link href="/blog" className="hover:text-white transition-colors">마켓 리포트</Link>
              <span className="text-gray-700">|</span>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">개인정보처리방침</Link>
              <span className="text-gray-700">|</span>
              <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
              <span className="text-gray-700">|</span>
              <Link href="/disclaimer" className="hover:text-white transition-colors">면책조항</Link>
              <span className="text-gray-700">|</span>
              <Link href="/contact" className="hover:text-white transition-colors">문의하기</Link>
            </div>

            <div className="text-center text-gray-600 text-xs space-y-1">
              <p>서비스명: 스마트 투자 비서 (StockTrend) | 데이터 출처: 한국거래소(KRX), 금융감독원 DART, 미국 증권거래위원회(SEC)</p>
              <p>© 2026 StockTrend Research Team. All rights reserved.</p>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}
