import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '데드크로스 (Dead Cross) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '단기 이동평균선이 장기 이동평균선을 하향 돌파하는 약세 신호. 주식 초보자도 쉽게 이해할 수 있는 데드크로스 (Dead Cross) 완벽 가이드.',
  keywords: ['데드크로스 (Dead Cross)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideDeadCrossPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">데드크로스 (Dead Cross)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">데드크로스 (Dead Cross)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">단기 이동평균선이 장기 이동평균선을 하향 돌파하는 약세 신호</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">데드크로스 (Dead Cross)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">데드크로스는 단기 이동평균선이 장기 이동평균선을 위에서 아래로 하향 돌파하는 현상입니다. 골든크로스의 반대 개념으로, 하락 추세로의 전환 신호로 해석됩니다. 특히 거래량이 증가하면서 데드크로스가 발생하면 강한 하락 신호로 간주합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">미국 S&P500 지수에서 50일선이 200일선을 하향 돌파하는 데드크로스는 역사적으로 주요 하락장의 시작과 겹치는 경우가 많았습니다. 다만 2010년대에는 짧은 데드크로스 이후 빠르게 회복하는 사례도 많았습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">데드크로스는 후행 지표이므로 이미 상당한 하락 이후에 확인되는 경우가 많습니다. 기업 펀더멘털에 변화가 없다면 오히려 매수 기회로 해석하는 반대 전략도 있습니다.</p>
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
