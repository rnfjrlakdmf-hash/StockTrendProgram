import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '금리 (Interest Rate) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '자금 차입에 대한 비용으로 모든 자산 가격에 영향을 미치는 핵심 경제 변수. 주식 초보자도 쉽게 이해할 수 있는 금리 (Interest Rate) 완벽 가이드.',
  keywords: ['금리 (Interest Rate)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideInterestRatePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">금리 (Interest Rate)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">금리 (Interest Rate)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">자금 차입에 대한 비용으로 모든 자산 가격에 영향을 미치는 핵심 경제 변수</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">금리 (Interest Rate)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">금리는 돈을 빌리는 대가로 지불하는 비용입니다. 중앙은행이 결정하는 기준금리는 시중 은행 대출·예금 금리, 국채 수익률, 기업 차입 비용에 영향을 미칩니다. 금리가 오르면 미래 현금흐름의 현재가치가 낮아져 주식 밸류에이션이 하락하는 경향이 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">한국은행이 기준금리를 0.25%p 인상하면 시중은행 대출 금리도 따라 오릅니다. 이는 기업의 이자 부담을 늘려 이익을 감소시키고, 부동산·주식 투자 매력도를 낮추는 효과가 있습니다. 반대로 금리 인하는 유동성을 늘려 자산 가격 상승 압력을 높입니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">모든 주식이 금리 변화에 같은 방향으로 반응하지는 않습니다. 은행주는 금리 인상 시 이자 마진이 높아져 이익이 늘어날 수 있고, 성장주는 미래 이익의 현재가치 하락으로 더 큰 타격을 받을 수 있습니다.</p>
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
