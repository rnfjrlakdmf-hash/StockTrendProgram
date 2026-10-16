import React from 'react';
import Link from 'next/link';
import { Send, BookOpen, Bell, BarChart3, Shield, HelpCircle, ExternalLink, TrendingUp, Globe, CheckCircle2, Layers, Cpu } from "lucide-react";

// ─────────────────────────────────────────────
// SeoContentBlock v5 (AdSense & YMYL High-Value Editorial Block)
// 목적: 모든 분석 대시보드 및 도구 페이지에 3,000자 이상의 고품질 금융 교육·방법론 칼럼을 SSR로 상시 제공
// ─────────────────────────────────────────────

const FEATURES = [
  {
    icon: Bell,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    title: "실시간 메이저 수급 & 공시 추적",
    desc: "한국거래소(KRX) 외국인·기관 순매수 상위 포착, 금융감독원 DART 주요 경영사항 공시, 미국 SEC(13F·Form 4) 지분 변동 데이터를 실시간으로 분석합니다.",
  },
  {
    icon: BarChart3,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    title: "체계적인 실전 차트 아카데미",
    desc: "이동평균선(5·20·60·120일선) 정배열, RSI 다이버전스, 볼린저밴드 수축·확장, MACD 골든크로스 등 핵심 기술적 분석 이론을 매일 무료 칼럼으로 연재합니다.",
  },
  {
    icon: TrendingUp,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    title: "기업 펀더멘탈 & 밸류에이션 진단",
    desc: "PER(주가수익비율), PBR(주가순자산비율), ROE(자기자본이익률), 영업이익률, 부채비율, 잉여현금흐름(FCF) 등 핵심 재무제표 지표를 정량적으로 비교·검증합니다.",
  },
  {
    icon: Globe,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    title: "글로벌 매크로 & 섹터 로테이션",
    desc: "미국 나스닥·S&P 500·필라델피아 반도체 지수부터 코스피·코스닥, 원/달러 환율, 미국 국채 금리(10년물), WTI 유가까지 글로벌 거시경제 상관관계를 한눈에 조망합니다.",
  },
  {
    icon: Layers,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    title: "ETF 자산배분 & 배당 시뮬레이션",
    desc: "국내외 대표 지수 및 섹터·월배당 ETF(SCHD, JEPI, QQQ, KODEX 200 등)의 총보수율(TER), 최대낙폭(MDD), 샤프비율, 세후 배당 현금흐름을 정밀 계산합니다.",
  },
  {
    icon: Shield,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
    title: "객관적 데이터 & 투자자 보호 원칙",
    desc: "본 플랫폼은 자본시장법을 엄격히 준수하며, 어떠한 경우에도 허위 과장 광고나 종목 매수·매도 권유를 하지 않고 오직 검증된 공공 금융 데이터와 교육 콘텐츠만 제공합니다.",
  },
];

const METHODOLOGY_COLUMNS = [
  {
    badge: "METHODOLOGY 01 · 수급 및 거래량 정량 분석",
    title: "외국인·기관 스마트머니 추적과 OBV·CVD 수급 델타의 원리",
    paragraphs: [
      "주식 시장에서 단기적인 주가 등락은 뉴스나 심리에 의해 흔들릴 수 있지만, 중장기적인 추세를 결정짓는 핵심 동력은 결국 대규모 자금을 집행하는 외국인 투자자와 기관 투자자(연기금, 금융투자, 투신, 사모펀드)의 연속적인 순매수 수급입니다. 스마트 투자 비서의 퀀트 엔진은 단순 일간 거래량뿐만 아니라 종가 기준 거래량 가중 누적 지표인 OBV(On-Balance Volume)와 체결 강도 기반의 CVD(Cumulative Volume Delta)를 결합하여, 주가가 횡보하는 구간에서도 스마트머니가 조용히 지분을 늘리고 있는지(매집 국면) 혹은 고점에서 물량을 분산 매도하고 있는지(분산 국면)를 정량적으로 산출합니다.",
      "특히 정규장 마감 직후 집계되는 장마감 수급 스캐너는 당일 거래대금이 평소 대비 유의미하게 증가하면서 20일 이동평균선 지지력을 확보한 종목들을 기계적 기준에 따라 분류합니다. 투자자는 이를 통해 시장의 자금이 어느 산업군(반도체, 2차전지, 바이오, 전력기기, 우주항공 등)으로 이동하고 있는지 섹터 로테이션의 맥락을 객관적으로 파악할 수 있습니다."
    ]
  },
  {
    badge: "METHODOLOGY 02 · 재무 건전성 및 밸류에이션 검증",
    title: "기업 내재가치 평가(PER·PBR·ROE)와 어닝 서프라이즈 팩트체크",
    paragraphs: [
      "테마나 수급만으로 상승한 주식은 실적이 뒷받침되지 않을 경우 언제든 급락할 위험(테마 편승 리스크)을 안고 있습니다. 따라서 성공적인 투자를 위해서는 반드시 기업의 손익계산서, 재무상태표, 현금흐름표를 기반으로 한 기본적 분석(Fundamental Analysis)이 병행되어야 합니다. 본 서비스는 기업의 시가총액을 당기순이익으로 나눈 PER(주가수익비율)과 순자산 대비 주가 수준을 나타내는 PBR(주가순자산비율)을 동종 업계 평균(Peer Group)과 비교하여 현재 주가의 고평가·저평가 여부를 입체적으로 진단합니다.",
      "아울러 자본을 얼마나 효율적으로 활용하여 이익을 창출했는지 보여주는 ROE(자기자본이익률)와 본업의 경쟁력을 뜻하는 영업이익률(OPM), 그리고 금리 인상기 기업의 생존력을 좌우하는 부채비율 및 유보율을 함께 점검합니다. 금융감독원 DART 전자공시시스템에 제출되는 분기·반기·사업보고서 및 단일판매·공급계약 공시를 실시간으로 대조하여 실제 매출이 발생하는 진정한 수혜 기업을 가려내는 안목을 기를 수 있습니다."
    ]
  },
  {
    badge: "METHODOLOGY 03 · 리스크 관리 및 포트폴리오 자산배분",
    title: "분할 매수·손절매 원칙과 배당·ETF를 활용한 변동성 방어 전략",
    paragraphs: [
      "주식 투자에서 높은 수익률을 달성하는 것보다 더 중요한 제1원칙은 바로 '잃지 않는 투자(원금 보전)'와 '변동성 통제(Risk Management)'입니다. 아무리 우량한 종목이라도 거시경제 충격(미국 연준 FOMC 금리 결정, 소비자물가지수 CPI 쇼크, 지정학적 리스크) 앞에서는 일시적인 조정을 겪을 수 있습니다. 따라서 한 종목에 전 재산을 집중 투자하는 이른바 '몰빵 투자'나 무계획적인 '물타기(평단가 낮추기)'는 계좌의 회복 불가능한 손실(MDD 확대)을 초래할 수 있습니다.",
      "스마트 투자 비서는 투자자가 감정에 휘둘리지 않고 원칙 매매를 실천할 수 있도록 평균단가·물타기 시뮬레이터, 손익분기점 계산기, 월배당·연간 배당금 현금흐름 계산기, 그리고 6대 퀀트 팩터(베타·알파·모멘텀·밸류·변동성·배당) 기반의 포트폴리오 진단 도구를 무료로 제공합니다. 성장주와 가치주, 그리고 매월 안정적인 분배금을 지급하는 배당 ETF를 균형 있게 배분하여 어떤 시장 국면에서도 흔들리지 않는 견고한 포트폴리오를 구축하시기 바랍니다."
    ]
  }
];

const FAQ = [
  {
    q: "세력 매집(Whale Alert) 및 공시 포착 시스템은 어떤 데이터를 기반으로 작동하나요?",
    a: "금융감독원 DART 전자공시시스템과 미국 증권거래위원회(SEC EDGAR 13F, Form 4)의 공식 공시 원문을 실시간으로 수집·분석합니다. 5% 이상 대량보유상황보고, 주요 임원 지분 매수, 대규모 단일판매·공급계약 체결 등 기업 가치에 중대한 영향을 미치는 팩트가 발생하면 이를 즉시 요약하여 제공합니다.",
  },
  {
    q: "기술적 분석(차트)과 기본적 분석(재무제표) 중 무엇을 먼저 봐야 하나요?",
    a: "두 분석법은 수레의 두 바퀴와 같아서 상호 보완적으로 활용해야 합니다. 먼저 기본적 분석(매출 성장성, 영업이익 흑자 여부, 적정 PER·PBR, 부채비율)을 통해 투자할 만한 우량 기업(What to buy)을 선별한 뒤, 기술적 분석(이동평균선 지지, RSI 과매도 해소, 거래량 돌파)을 통해 유리한 매수·매도 타이밍(When to buy)을 잡는 것이 정석입니다.",
  },
  {
    q: "장마감 수급 스캐너와 테마 트래커의 데이터는 언제 업데이트되나요?",
    a: "국내 증시(KOSPI·KOSDAQ)는 장중 실시간 시세 및 수급 추이를 반영하며, 정규장 마감(15:30) 이후 외국인·기관의 최종 확정 순매수 데이터가 집계되면 장마감 퀀트 스캐너가 일자별 집중 종목을 업데이트합니다. 미국 증시(NASDAQ·NYSE) 역시 프리마켓·정규장·애프터마켓 세션별로 연동됩니다.",
  },
  {
    q: "주식 물타기 계산기와 배당금 시뮬레이터는 어떻게 활용하면 좋나요?",
    a: "보유 종목이 일시적인 시장 하락으로 조정받았을 때 무턱대고 추가 매수하기 전에, 물타기 계산기를 통해 추가 투입 자금 대비 평균단가가 몇 퍼센트 낮아지는지 먼저 시뮬레이션해 보세요. 또한 배당금 계산기를 활용하면 배당소득세(15.4%) 공제 후 실제 수령하는 월별·연간 세후 배당금과 ISA 절세 효과를 정확히 비교할 수 있습니다.",
  },
  {
    q: "매일 연재되는 1타 강사 차트 스터디와 주식 용어 백과(46선)는 모두 무료인가요?",
    a: "네, 스마트 투자 비서의 모든 교육 칼럼, 46대 필수 주식 용어 백과사전, 전문가 마켓 리포트, 그리고 스마트 주식 계산기는 회원가입이나 유료 결제 없이 누구나 100% 무료로 열람하고 학습하실 수 있는 열린 금융 아카데미입니다.",
  },
  {
    q: "포트폴리오 자산 진단에서 확인하는 6대 퀀트 팩터란 무엇인가요?",
    a: "월스트리트 기관 투자자들이 포트폴리오 리스크를 측정할 때 사용하는 6가지 핵심 지표인 시장 민감도(Beta), 초과 수익력(Alpha), 추세 탄력도(Momentum), 저평가 매력(Value), 가격 안정성(Volatility), 현금 창출력(Dividend)을 종합 평가하여 특정 섹터 쏠림 현상을 방지하고 최적의 리밸런싱 방향을 제시합니다.",
  },
];

interface SeoContentBlockProps {
  pageTitle?: string;
  pageDescription?: string;
  asH1?: boolean;
}

export default function SeoContentBlock({ pageTitle, pageDescription, asH1 = false }: SeoContentBlockProps = {}) {
  const HeadingTag = asH1 ? 'h1' : 'h2';
  return (
    <section
      aria-label="금융 리서치 방법론 및 투자 가이드"
      className="border-t border-white/[0.08] bg-gradient-to-b from-zinc-950/60 to-black/80 mt-12"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-14 space-y-14">

        {/* ── 상단 헤딩 (SEO용 H1 또는 H2) ── */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>QUANTITATIVE RESEARCH &amp; FINANCIAL ACADEMY</span>
          </div>
          <HeadingTag className="text-xl md:text-2xl font-black text-white tracking-tight">
            {pageTitle || "스마트 투자 비서 — AI 퀀트 금융 리서치 방법론 및 핵심 기능 안내"}
          </HeadingTag>
          <p className="text-gray-400 text-xs md:text-sm max-w-3xl mx-auto leading-relaxed">
            {pageDescription || "한국거래소(KRX)·금융감독원(DART)·미국 증권거래위원회(SEC) 공식 데이터 기반의 수급 분석, 기업 펀더멘탈 진단, 그리고 개인 투자자를 위한 실전 차트·재무 교육 아카데미를 100% 무료로 제공합니다."}
          </p>
        </div>

        {/* ── 6개 핵심 기능 카드 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, color, bg, border, title, desc }) => (
            <div
              key={title}
              className={`${bg} ${border} border rounded-2xl p-5 space-y-2.5`}
            >
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <h3 className="text-white text-sm font-bold leading-tight">{title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── 3대 금융 리서치 & 퀀트 분석 방법론 심층 가이드 (풍부한 에디토리얼 본문) ── */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base md:text-lg font-black text-white">
              데이터 기반 주식 분석 및 리스크 관리 3대 핵심 프레임워크
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {METHODOLOGY_COLUMNS.map((col) => (
              <article
                key={col.title}
                className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-6 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <span className="inline-block text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md">
                    {col.badge}
                  </span>
                  <h3 className="text-white text-sm md:text-base font-bold leading-snug">
                    {col.title}
                  </h3>
                  {col.paragraphs.map((p, idx) => (
                    <p key={idx} className="text-gray-400 text-xs leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ── 투자 가이드 링크 모음 (내부 링크 구조 강화) ── */}
        <div className="space-y-4">
          <h3 className="text-white/80 text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" /> 필수 주식 용어 백과사전 (46선) &amp; 핵심 교육 가이드 바로가기
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { href: '/guide/per', label: 'PER 주가수익비율' },
              { href: '/guide/pbr', label: 'PBR 주가순자산비율' },
              { href: '/guide/roe', label: 'ROE 자기자본이익률' },
              { href: '/guide/eps', label: 'EPS 주당순이익' },
              { href: '/guide/rsi', label: 'RSI 상대강도지수' },
              { href: '/guide/macd', label: 'MACD 오실레이터' },
              { href: '/guide/bollinger-band', label: '볼린저밴드 전략' },
              { href: '/guide/moving-average', label: '이동평균선 정배열' },
              { href: '/guide/golden-cross', label: '골든크로스 타점' },
              { href: '/guide/volume', label: '거래량 수급 분석' },
              { href: '/guide/dividend', label: '배당주 현금흐름' },
              { href: '/guide/ex-dividend-date', label: '배당락일 계산법' },
              { href: '/guide/etf', label: 'ETF 분산투자 기초' },
              { href: '/guide/short-selling', label: '공매도·대차잔고' },
              { href: '/guide/fomc', label: '미국 연준 FOMC' },
              { href: '/guide/risk-management', label: '분할매수·손절원칙' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-gray-400 hover:text-white hover:border-blue-500/40 transition-all bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-center font-medium"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── 텔레그램 구독 CTA ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0088cc]/10 border border-[#0088cc]/20 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-[#0088cc] shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">실시간 증시 리포트 &amp; 공시 브리핑 텔레그램 채널</p>
              <p className="text-gray-400 text-xs">외국인·기관 수급 요약 · 주요 DART 공시 · 글로벌 거시경제 일정 — 100% 무료</p>
            </div>
          </div>
          <a
            href="https://t.me/stocktrend_live"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 bg-[#0088cc] hover:bg-[#006fa6] text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors"
          >
            채널 바로가기 <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* ── FAQ ── */}
        <div className="space-y-4">
          <h3 className="text-white/80 text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" /> 자주 묻는 질문 (FAQ) 및 이용 가이드
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQ.map(({ q, a }) => (
              <div
                key={q}
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-2"
              >
                <h4 className="text-white/90 text-sm font-bold leading-snug">Q. {q}</h4>
                <p className="text-gray-400 text-xs leading-relaxed">A. {a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
