import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '골든크로스 (Golden Cross) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '단기 이동평균선이 장기 이동평균선을 상향 돌파하는 강세 신호. 주식 초보자도 쉽게 이해할 수 있는 골든크로스 (Golden Cross) 완벽 가이드.',
  keywords: ['골든크로스 (Golden Cross)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideGoldenCrossPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">골든크로스 (Golden Cross)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">골든크로스 (Golden Cross)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">단기 이동평균선이 장기 이동평균선을 상향 돌파하는 강세 신호</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">골든크로스 (Golden Cross)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">골든크로스는 단기 이동평균선(예: 50일)이 장기 이동평균선(예: 200일)을 아래에서 위로 돌파하는 현상입니다. 이는 최근의 평균 주가가 장기 평균을 상회하기 시작했음을 의미하며, 기술적 분석에서 대표적인 상승 전환 신호로 알려져 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">코스피 지수에서 20일선이 60일선을 상향 돌파하는 골든크로스가 발생하면, 많은 기술적 분석가들이 중기 상승 추세의 시작으로 해석합니다. 거래량이 함께 증가하면 신뢰도가 높아집니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">골든크로스가 반드시 상승을 보장하지는 않습니다. 하락 추세 중 일시적 반등에서도 발생할 수 있으며, 신호가 지연되어 이미 많이 오른 후에 확인되는 경우도 있습니다.</p>
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
