import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '손절매 (Stop Loss) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '일정 손실 수준에서 추가 손실을 막기 위해 매도하는 위험관리 전략. 주식 초보자도 쉽게 이해할 수 있는 손절매 (Stop Loss) 완벽 가이드.',
  keywords: ['손절매 (Stop Loss)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideStopLossPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">손절매 (Stop Loss)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">손절매 (Stop Loss)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">일정 손실 수준에서 추가 손실을 막기 위해 매도하는 위험관리 전략</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">손절매 (Stop Loss)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">손절매는 주가가 예상과 다른 방향으로 움직여 일정 수준의 손실이 발생했을 때 더 큰 손실을 막기 위해 보유 주식을 매도하는 것입니다. 예를 들어 매수 가격 대비 -10% 시점에서 무조건 매도하는 규칙을 세울 수 있습니다. 손절은 심리적으로 힘들지만 장기 투자 성과를 지키는 핵심 규율입니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">10만 원에 산 주식이 9만 원(-10%)이 됐을 때 손절한다면, 최대 손실이 10%로 제한됩니다. 손절하지 않고 버티다가 6만 원(-40%)이 되면 원래 가격으로 회복하려면 67%의 수익이 필요합니다. 손실이 클수록 회복이 어려워집니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">손절 라인은 반드시 매수 전에 미리 정해두어야 합니다. 매수 후 감정적으로 손절 라인을 내리다 보면 큰 손실로 이어질 수 있습니다. 기술적 지지선, 섹터 펀더멘털 변화 여부를 기준으로 손절 라인을 설정하세요.</p>
          </section>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-sm text-gray-500">
            <strong className="text-gray-400 block mb-2">면책 조항</strong>
            본 가이드는 주식 투자 용어를 이해하기 쉽게 설명하기 위한 교육 목적의 정보입니다. 특정 종목의 매수·매도를 권유하는 내용이 아니며, 투자의 최종 판단과 책임은 투자자 본인에게 있습니다.
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm text-gray-600">
          <Link href="/guide" className="hover:text-gray-400">용어 가이드 목록</Link>
          <Link href="/" className="hover:text-gray-400">홈으로</Link>
          <Link href="/discovery" className="hover:text-gray-400">종목 분석하기</Link>
        </div>
      </div>
    </div>
  );
}
