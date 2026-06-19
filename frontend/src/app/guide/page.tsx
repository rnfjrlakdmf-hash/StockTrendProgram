import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '주식 투자 용어 완전 정복 | 초보자 투자 가이드 - StockTrend',
  description: 'RSI, PER, PBR, MACD, 볼린저밴드, 이동평균선, 배당수익률, 공매도 등 주식 투자 핵심 용어를 쉽고 자세하게 설명합니다. 주식 초보자를 위한 완전 무료 투자 가이드.',
  keywords: ['주식 용어', '주식 기초', '투자 가이드', 'RSI', 'PER', 'PBR', '주식 초보', '코스피', '코스닥'],
};

const terms = [
  { slug: 'rsi', title: 'RSI (상대강도지수)', emoji: '📊', category: '기술적 지표', desc: '과매수·과매도 상태를 0~100으로 나타내는 모멘텀 지표' },
  { slug: 'macd', title: 'MACD', emoji: '📈', category: '기술적 지표', desc: '단기·장기 이동평균 차이로 추세 전환을 포착하는 지표' },
  { slug: 'bollinger-band', title: '볼린저 밴드', emoji: '📉', category: '기술적 지표', desc: '이동평균 중심의 표준편차 밴드로 변동성을 분석' },
  { slug: 'moving-average', title: '이동평균선', emoji: '📏', category: '기술적 지표', desc: '일정 기간 주가 평균을 연결한 추세 분석의 기본 지표' },
  { slug: 'golden-cross', title: '골든크로스', emoji: '✨', category: '기술적 지표', desc: '단기선이 장기선을 상향 돌파하는 강세 신호' },
  { slug: 'dead-cross', title: '데드크로스', emoji: '⚠️', category: '기술적 지표', desc: '단기선이 장기선을 하향 돌파하는 약세 신호' },
  { slug: 'volume', title: '거래량', emoji: '🔊', category: '기술적 지표', desc: '시장 관심도와 추세 강도를 나타내는 보조 지표' },
  { slug: 'per', title: 'PER (주가수익비율)', emoji: '💵', category: '가치평가 지표', desc: '주가를 EPS로 나눈 기업 가치 평가의 핵심 지표' },
  { slug: 'pbr', title: 'PBR (주가순자산비율)', emoji: '🏦', category: '가치평가 지표', desc: '주가를 순자산으로 나눈 자산 가치 평가 지표' },
  { slug: 'roe', title: 'ROE (자기자본이익률)', emoji: '💎', category: '가치평가 지표', desc: '자본을 얼마나 효율적으로 활용하는지를 나타내는 수익성 지표' },
  { slug: 'eps', title: 'EPS (주당순이익)', emoji: '💰', category: '가치평가 지표', desc: '1주당 얼마의 이익을 창출했는지 나타내는 지표' },
  { slug: 'market-cap', title: '시가총액', emoji: '🏛️', category: '가치평가 지표', desc: '현재 시장에서 기업이 평가받는 전체 가치' },
  { slug: 'ebitda', title: 'EBITDA', emoji: '💹', category: '가치평가 지표', desc: '이자·세금·감가상각 차감 전 이익으로 현금 창출 능력 측정' },
  { slug: 'book-value', title: '장부가치 (BPS)', emoji: '📒', category: '가치평가 지표', desc: '총자산에서 총부채를 뺀 기업의 순자산 가치' },
  { slug: 'dividend', title: '배당금', emoji: '🎁', category: '배당 투자', desc: '기업이 이익의 일부를 주주에게 분배하는 현금' },
  { slug: 'dividend-yield', title: '배당수익률', emoji: '🏆', category: '배당 투자', desc: '주가 대비 배당금 비율로 배당 투자의 수익성 측정' },
  { slug: 'ex-dividend-date', title: '배당락일', emoji: '📅', category: '배당 투자', desc: '이 날 이후 매수하면 배당권을 받을 수 없는 기준 날짜' },
  { slug: 'revenue', title: '매출액', emoji: '📊', category: '재무 분석', desc: '기업이 판매 활동으로 벌어들인 총 수입' },
  { slug: 'operating-profit', title: '영업이익', emoji: '⚙️', category: '재무 분석', desc: '매출에서 영업 비용을 뺀 본업의 수익성 지표' },
  { slug: 'net-profit', title: '당기순이익', emoji: '✅', category: '재무 분석', desc: '모든 비용과 세금을 제외한 최종 이익' },
  { slug: 'short-selling', title: '공매도', emoji: '🔻', category: '투자 전략', desc: '주가 하락을 예상하여 빌린 주식을 매도하는 전략' },
  { slug: 'stop-loss', title: '손절매', emoji: '🛑', category: '투자 전략', desc: '일정 손실 수준에서 추가 손실을 막기 위한 매도 전략' },
  { slug: 'averaging-down', title: '물타기', emoji: '💧', category: '투자 전략', desc: '주가 하락 시 추가 매수하여 평균 단가를 낮추는 방법' },
  { slug: 'value-investing', title: '가치투자', emoji: '🧠', category: '투자 전략', desc: '저평가된 기업을 발굴해 장기 보유하는 워런 버핏의 철학' },
  { slug: 'growth-investing', title: '성장주 투자', emoji: '🚀', category: '투자 전략', desc: '빠르게 성장하는 기업에 투자하여 주가 상승 차익 추구' },
  { slug: 'momentum', title: '모멘텀 투자', emoji: '⚡', category: '투자 전략', desc: '상승 추세 종목이 계속 오르는 경향을 이용하는 전략' },
  { slug: 'sector-rotation', title: '섹터 로테이션', emoji: '🔄', category: '투자 전략', desc: '경기 사이클에 따라 강세 업종이 바뀌는 현상 활용 전략' },
  { slug: 'portfolio', title: '포트폴리오', emoji: '🗂️', category: '리스크 관리', desc: '분산투자를 위해 구성된 여러 자산과 종목의 집합' },
  { slug: 'diversification', title: '분산투자', emoji: '🌐', category: '리스크 관리', desc: '여러 자산에 나눠 투자하여 위험을 낮추는 전략' },
  { slug: 'rebalancing', title: '리밸런싱', emoji: '⚖️', category: '리스크 관리', desc: '변동된 포트폴리오 비중을 목표 비중으로 되돌리는 작업' },
  { slug: 'beta', title: '베타 (Beta)', emoji: '📐', category: '리스크 관리', desc: '시장 대비 종목의 변동성을 나타내는 위험 측정 지표' },
  { slug: 'etf', title: 'ETF (상장지수펀드)', emoji: '📦', category: '금융 상품', desc: '주식처럼 실시간 거래 가능한 분산투자 펀드 상품' },
  { slug: 'kospi', title: '코스피 (KOSPI)', emoji: '🇰🇷', category: '시장 기초', desc: '한국 대형 우량기업 전체의 시가총액으로 산출하는 주가지수' },
  { slug: 'kosdaq', title: '코스닥 (KOSDAQ)', emoji: '💡', category: '시장 기초', desc: '기술·벤처 중소형 기업 중심의 한국 별도 주식 시장' },
  { slug: 'market-order', title: '시장가 주문', emoji: '⚡', category: '주문 방식', desc: '현재 시장가에 즉시 체결되도록 내는 주문 방식' },
  { slug: 'limit-order', title: '지정가 주문', emoji: '🎯', category: '주문 방식', desc: '희망 가격을 지정하여 해당 가격에서만 체결되는 주문' },
  { slug: 'dart', title: 'DART (전자공시)', emoji: '📋', category: '공시·규제', desc: '금융감독원이 운영하는 상장기업 공시 통합 플랫폼' },
  { slug: 'disclosure', title: '공시 제도', emoji: '📢', category: '공시·규제', desc: '기업이 주요 경영 사항을 의무적으로 투자자에게 알리는 제도' },
  { slug: 'fundamental-analysis', title: '기본적 분석', emoji: '🔬', category: '분석 방법', desc: '재무제표와 경기 분석으로 적정 주가를 산출하는 방법론' },
  { slug: 'technical-analysis', title: '기술적 분석', emoji: '📈', category: '분석 방법', desc: '차트 패턴과 지표로 미래 주가를 예측하는 방법론' },
  { slug: 'inflation', title: '인플레이션', emoji: '💸', category: '거시경제', desc: '물가 지속 상승으로 화폐 가치가 하락하는 경제 현상' },
  { slug: 'interest-rate', title: '금리', emoji: '🏦', category: '거시경제', desc: '모든 자산 가격에 영향을 미치는 핵심 경제 변수' },
  { slug: 'fomc', title: 'FOMC', emoji: '🌐', category: '거시경제', desc: '미국 기준금리를 결정하는 연방공개시장위원회' },
];

const categories = [...new Set(terms.map(t => t.category))];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-5xl mx-auto px-6 py-16">
        
        {/* Hero */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-4 py-2 rounded-full mb-6">
            📚 무료 투자 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            주식 투자 용어 완전 정복
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            RSI, PER, MACD, 볼린저밴드부터 공매도, 리밸런싱, FOMC까지 — 
            주식 투자에 꼭 필요한 {terms.length}가지 핵심 용어를 쉽고 자세하게 설명합니다.
          </p>
        </div>

        {/* By Category */}
        {categories.map(category => (
          <section key={category} className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-l-4 border-blue-500 pl-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {terms.filter(t => t.category === category).map(term => (
                <Link
                  key={term.slug}
                  href={`/guide/${term.slug}`}
                  className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all group"
                >
                  <span className="text-2xl shrink-0">{term.emoji}</span>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-blue-300 transition-colors mb-1 text-sm">
                      {term.title}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{term.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Disclaimer */}
        <div className="mt-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-sm text-gray-400">
          <strong className="text-yellow-300 block mb-2">⚠️ 투자 정보 면책 안내</strong>
          본 가이드는 주식 투자 용어를 이해하기 위한 교육 목적의 정보입니다. 
          특정 종목의 매수·매도를 권유하는 내용이 아니며, 투자의 최종 판단과 책임은 투자자 본인에게 있습니다.
          주식 투자에는 원금 손실의 위험이 있습니다.
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-600 text-sm flex flex-wrap justify-center gap-6">
          <Link href="/" className="hover:text-gray-400">홈으로</Link>
          <Link href="/discovery" className="hover:text-gray-400">종목 분석</Link>
          <Link href="/blog" className="hover:text-gray-400">마켓 리포트</Link>
          <Link href="/about" className="hover:text-gray-400">서비스 소개</Link>
        </div>
      </div>
    </div>
  );
}
