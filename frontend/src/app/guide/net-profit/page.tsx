import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '당기순이익 (Net Profit) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '모든 비용과 세금을 제외한 최종 이익으로 주주에게 귀속되는 실질 이익. 주식 초보자도 쉽게 이해할 수 있는 당기순이익 (Net Profit) 완벽 가이드.',
  keywords: ['당기순이익 (Net Profit)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideNetProfitPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">당기순이익 (Net Profit)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">당기순이익 (Net Profit)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">모든 비용과 세금을 제외한 최종 이익으로 주주에게 귀속되는 실질 이익</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">당기순이익 (Net Profit)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">당기순이익은 영업이익에서 이자 비용을 빼고, 금융수익을 더한 뒤, 법인세를 납부하고 남은 최종 이익입니다. 주주에게 귀속되는 이익이며, 배당의 재원이 됩니다. EPS(주당순이익)와 ROE(자기자본이익률) 계산의 기준이 됩니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">어떤 기업의 당기순이익이 1,000억 원이고 전년도가 500억 원이었다면 100% 성장했습니다. 그러나 이 중 400억 원이 부동산 매각 차익이라면 실질 영업 성과는 600억 원으로, 전년 대비 20% 성장한 것입니다. 일회성 항목을 제거한 조정 순이익을 확인하세요.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">당기순이익이 높아도 현금흐름이 좋지 않으면 주의가 필요합니다. 매출채권이나 재고 급증으로 장부상 이익은 많아도 실제 현금이 없는 경우가 있습니다. 영업활동 현금흐름과 비교하여 이익의 질을 확인하세요.</p>
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
