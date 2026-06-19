import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '리밸런싱 (Rebalancing) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '변동된 포트폴리오 비중을 목표 비중으로 다시 조정하는 작업. 주식 초보자도 쉽게 이해할 수 있는 리밸런싱 (Rebalancing) 완벽 가이드.',
  keywords: ['리밸런싱 (Rebalancing)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideRebalancingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">리밸런싱 (Rebalancing)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">리밸런싱 (Rebalancing)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">변동된 포트폴리오 비중을 목표 비중으로 다시 조정하는 작업</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">리밸런싱 (Rebalancing)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">리밸런싱은 시장 변동으로 인해 변화된 포트폴리오 내 자산 비중을 원래 목표 비중으로 되돌리는 과정입니다. 예를 들어 주식 60%, 채권 40%로 구성했는데 주식 시장이 급등하여 주식 비중이 80%가 됐다면, 주식 일부를 매도하고 채권을 매수하여 60:40 비율로 복원합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">연 1회 리밸런싱만으로도 장기적으로 수익률을 높이고 위험을 줄이는 효과가 있다는 연구 결과가 있습니다. 리밸런싱은 자동으로 '고점에 팔고 저점에 사는' 효과를 가져옵니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">리밸런싱 빈도가 너무 잦으면 거래 비용과 세금 부담이 커집니다. 통상 연 1~2회 또는 자산 비중이 목표 대비 5% 이상 벗어났을 때 리밸런싱하는 방식이 많이 사용됩니다.</p>
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
