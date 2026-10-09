import { Metadata } from "next";
import { Suspense } from "react";
import CalculatorHub from "./CalculatorHub";
import Link from "next/link";
import { 
  Calculator, DollarSign, ShieldAlert, BookOpen, 
  HelpCircle, Sparkles, TrendingUp, ShieldCheck, ArrowRight, CheckCircle2 
} from "lucide-react";

export const metadata: Metadata = {
  title: "스마트 주식 계산기 | 물타기 평단가 & 주식 배당금 월급 시뮬레이터",
  description: "물타기 추가 매수 시 평단가 인하 효과와 원금 회복 탈출 시나리오, 삼성전자·맥쿼리인프라·SCHD·JEPI 배당금 및 월배당 실수령액, ISA 비과세 절세 혜택을 100% 무료로 계산해보세요.",
  keywords: [
    "주식 물타기 계산기", 
    "주식 배당금 계산기", 
    "월배당 계산기", 
    "평단가 계산기", 
    "주식 구조대", 
    "SCHD 배당금", 
    "맥쿼리인프라 배당금", 
    "배당소득세 계산기", 
    "ISA 절세 계좌",
    "주식 수익률 계산기"
  ],
  alternates: {
    canonical: "/calculator",
  },
  openGraph: {
    title: "스마트 주식 계산기 (물타기 & 배당금 시뮬레이터)",
    description: "내 계좌 평단가 탈출 견적과 매달 꼬박꼬박 꽂히는 배당금 월급을 1초 만에 무료로 계산해보세요!",
    url: "https://stock-trend-program.co.kr/calculator",
    siteName: "스마트 투자 비서",
    images: ["/og-image.png"],
    locale: "ko_KR",
    type: "website",
  },
};

const CALCULATOR_FAQS = [
  {
    q: "물타기와 분할 매수의 차이점은 무엇인가요?",
    a: "분할 매수는 주식을 매수하기 전부터 시나리오와 비중을 계획하여 나누어 사는 전략인 반면, 물타기는 주가가 예상치 못하게 급락했을 때 손실률을 줄이고 평단가를 낮추기 위해 사후에 추가 자금을 투입하는 행위입니다. 펀더멘털이 훼손되지 않은 우량주에 계획된 비중으로 진입하는 물타기만이 유의미한 탈출 기회를 제공합니다."
  },
  {
    q: "배당소득세(15.4%)는 어떻게 계산되고 부과되나요?",
    a: "국내 상장 주식 및 해외 주식의 배당금 수령 시 소득세 14%와 지방소득세 1.4%를 합쳐 총 15.4%가 원천징수되어 계좌에 세후 금액으로 자동 입금됩니다. 연간 금융소득(이자+배당)이 2,000만 원을 초과하면 금융소득종합과세 대상이 되어 다른 소득과 합산 과세되므로 세무 관리가 필수적입니다."
  },
  {
    q: "ISA(개인종합자산관리계좌)를 활용하면 배당금이 얼마나 절세되나요?",
    a: "일반형 ISA는 순소득 200만 원까지, 서민형/농어민형은 400만 원까지 배당소득세가 100% 비과세(0%)됩니다. 비과세 한도를 초과하는 배당금에 대해서도 일반 세율(15.4%)보다 훨씬 저렴한 9.9% 분리과세 세율이 적용되어 금융소득종합과세를 완벽하게 방어할 수 있습니다."
  },
  {
    q: "미국 월배당 ETF(JEPI, 리얼티인컴 등)의 배당락일은 언제인가요?",
    a: "미국 주식은 배당락일(Ex-Dividend Date) 하루 전 정규장 마감 시점까지 주식을 매수해야 해당 월 또는 분기의 배당금을 수령할 수 있습니다. 예를 들어 배당락일이 10월 15일이라면 10월 14일 밤(한국시간)까지 결제를 완료해야 배당 권리가 확정됩니다."
  }
];

export default function CalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://stock-trend-program.co.kr/calculator#app",
        "name": "스마트 주식 계산기 (물타기 & 배당금 시뮬레이터)",
        "url": "https://stock-trend-program.co.kr/calculator",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "KRW"
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://stock-trend-program.co.kr/calculator#faq",
        "mainEntity": CALCULATOR_FAQS.map(faq => ({
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

      <div className="min-h-screen pt-24 pb-24 px-4 md:px-8 max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
        {/* 상단 인트로 헤더 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>스마트 퀀트 금융 계산기 허브</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            스마트 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-400">주식 계산기</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            물타기 추가 매수 시 평단가 변화 시뮬레이션부터 인기 배당주의 매월 통장에 꽂히는 실수령액까지 1초 만에 계산해 보세요.
          </p>
        </div>

        {/* 인터랙티브 계산기 본문 (서스펜스 감싸기) */}
        <Suspense fallback={
          <div className="p-12 text-center text-zinc-500 text-sm">
            계산기 엔진 로딩 중...
          </div>
        }>
          <CalculatorHub />
        </Suspense>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* [구글 애드센스 고품격 에디토리얼 가이드 & SEO 본문 섹션] */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="border-t border-white/10 pt-12 space-y-12">
          
          {/* 가이드 섹션 1: 올바른 물타기 원칙과 리스크 관리 */}
          <section className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                <Calculator className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                1. 주식 물타기(Averaging Down)의 올바른 실전 원칙
              </h2>
            </div>
            
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              주가가 하락했을 때 추가 자금을 투입하여 매입 평균단가(평단가)를 낮추는 전략을 흔히 <strong>‘물타기’</strong>라고 부릅니다. 
              평단가를 낮추면 본래 매수가까지 반등하지 않더라도, 상대적으로 적은 반등 폭(예: +10~15%)만으로도 원금을 회복하고 탈출할 수 있는 기회를 잡을 수 있습니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-1">
                <span className="font-bold text-amber-400 block">✓ 펀더멘털 점검 필수</span>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  기업의 매출·영업이익이 지속 성장 중이고 일시적인 시장 충격으로 빠진 경우에만 물타기가 유효합니다.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-1">
                <span className="font-bold text-rose-400 block">✗ 좀비기업 물타기 금지</span>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  3년 연속 적자, 횡령·배임 혐의, 유상증자 남발 기업에 물타기하는 것은 ‘떨어지는 칼날’을 잡는 자살행위입니다.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-1">
                <span className="font-bold text-blue-400 block">✓ 지지선 반등 확인 후 진입</span>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  하락하는 도중 성급히 추가 매수하지 말고, 주요 이동평균선이나 볼린저 밴드 하단에서 거래량이 실리며 멈출 때 진입하세요.
                </p>
              </div>
            </div>
          </section>

          {/* 가이드 섹션 2: 배당 투자 & 절세 바이블 */}
          <section className="bg-zinc-900/60 border border-amber-500/20 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                2. 배당주 투자 바이블: 배당소득세(15.4%) 아끼는 절세 꿀팁
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              워런 버핏의 코카콜라 투자처럼, 배당 투자의 핵심은 <strong>‘안정적인 현금흐름’</strong>과 <strong>‘배당금 재투자를 통한 복리 스노우볼’</strong>입니다. 
              특히 국내외 고배당주나 월배당 ETF를 운용할 때는 세금을 얼마나 아끼느냐가 최종 수익률을 결정짓는 핵심 변수입니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-2">
                <h3 className="font-black text-white text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> ISA(개인종합자산관리계좌) 필수 활용
                </h3>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  일반 계좌에서는 배당금이 들어올 때마다 무조건 15.4%를 세금으로 떼어가지만, 
                  <strong>ISA 계좌에서는 연간 200만 원(서민형은 400만 원)까지 세금이 전액 면제</strong>됩니다. 
                  비과세 한도를 초과하는 금액도 9.9% 분리과세로 끝나 금융소득종합과세를 피할 수 있습니다.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-2">
                <h3 className="font-black text-white text-sm flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" /> DRIP (배당금 재투자)의 복리 마법
                </h3>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  매월 또는 분기마다 지급받은 배당금을 소비하지 않고 다시 같은 종목의 주식을 매수하는 <strong>DRIP(Dividend Reinvestment Plan)</strong>을 10년간 지속하면, 
                  단순 주가 상승보다 2~3배 이상의 압도적인 자산 증식 효과를 얻을 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 가이드 섹션 3: 자주 묻는 질문 FAQ (Schema 연동) */}
          <section className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" /> 자주 묻는 질문 (FAQ)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {CALCULATOR_FAQS.map((faq, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-2">
                  <h3 className="text-white text-xs sm:text-sm font-bold flex items-start gap-2">
                    <span className="text-amber-400 font-black shrink-0">Q.</span>
                    <span>{faq.q}</span>
                  </h3>
                  <p className="text-zinc-400 text-xs leading-relaxed pl-5">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 하단 연관 분석 바로가기 링크 */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-zinc-900 to-purple-950/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-white font-black text-sm">
                더 정밀한 종목 분석이 필요하신가요?
              </h4>
              <p className="text-zinc-400 text-xs">
                인공지능이 20대 핵심 팩터로 진단하는 실시간 퀀트 점수와 DART 공시를 확인해 보세요.
              </p>
            </div>
            <div className="flex gap-2">
              <Link 
                href="/guide" 
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-colors"
              >
                투자 용어 백과
              </Link>
              <Link 
                href="/signals" 
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
              >
                실시간 수급 보기 →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
