import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ROE (자기자본이익률) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '당기순이익을 자기자본으로 나눈 기업의 수익성 지표. 주식 초보자도 쉽게 이해할 수 있는 ROE (자기자본이익률) 완벽 가이드.',
};

export default function GuideRoePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">ROE (자기자본이익률)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">ROE (자기자본이익률)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">당기순이익을 자기자본으로 나눈 기업의 수익성 지표</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">ROE (자기자본이익률)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">ROE(Return on Equity)는 기업이 주주로부터 받은 자본을 얼마나 효율적으로 활용하여 이익을 냈는지를 보여주는 수익성 지표입니다. ROE = 당기순이익 / 자기자본 × 100. ROE가 높을수록 자본을 효율적으로 운용한다는 의미입니다. 워런 버핏은 ROE 15% 이상을 지속적으로 유지하는 기업을 선호합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">A기업의 ROE가 20%, B기업이 8%라면 A기업이 같은 자본으로 더 많은 이익을 내는 것입니다. 단, 부채를 과도하게 사용해도 ROE가 높아질 수 있으므로 부채비율과 함께 확인해야 합니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">ROE를 볼 때는 최근 3~5년간 평균을 확인하는 것이 중요합니다. 일시적 자산 매각 등으로 인한 순이익 증가는 진정한 수익성 개선으로 보기 어렵기 때문입니다.</p>
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
