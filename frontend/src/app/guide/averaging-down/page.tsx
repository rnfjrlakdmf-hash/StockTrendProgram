import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '물타기 (Averaging Down) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '주가 하락 시 추가 매수하여 평균 단가를 낮추는 전략. 주식 초보자도 쉽게 이해할 수 있는 물타기 (Averaging Down) 완벽 가이드.',
};

export default function GuideAveragingDownPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">물타기 (Averaging Down)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">물타기 (Averaging Down)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">주가 하락 시 추가 매수하여 평균 단가를 낮추는 전략</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">물타기 (Averaging Down)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">물타기는 보유 주식의 주가가 하락했을 때 추가로 매수하여 평균 취득 단가를 낮추는 투자 방법입니다. 예를 들어 10만 원에 100주 매수 후 5만 원으로 하락했을 때 100주를 추가 매수하면, 평균 단가가 7.5만 원으로 낮아집니다. 이후 주가가 7.5만 원 이상만 회복해도 본전이 됩니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">A주식을 10,000원에 10주(10만 원 투자) 매수했는데 7,000원으로 하락 시, 7,000원에 10주(7만 원 투자)를 추가 매수하면 평균 단가는 8,500원이 됩니다. 주가가 8,500원으로 회복되면 손익분기점에 도달합니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">물타기는 좋은 기업의 일시적 하락 시 유효하지만, 펀더멘털이 훼손된 기업에 적용하면 '떨어지는 칼날 잡기'가 될 수 있습니다. 추가 매수 전 반드시 하락 원인이 일시적인지 구조적인지를 냉정하게 분석하세요.</p>
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
