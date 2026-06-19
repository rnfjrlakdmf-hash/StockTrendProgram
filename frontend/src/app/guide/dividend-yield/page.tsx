import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '배당수익률 (Dividend Yield) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '주가 대비 연간 배당금의 비율로 배당 투자의 수익성을 측정하는 지표. 주식 초보자도 쉽게 이해할 수 있는 배당수익률 (Dividend Yield) 완벽 가이드.',
  keywords: ['배당수익률 (Dividend Yield)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideDividendYieldPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">배당수익률 (Dividend Yield)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">배당수익률 (Dividend Yield)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">주가 대비 연간 배당금의 비율로 배당 투자의 수익성을 측정하는 지표</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">배당수익률 (Dividend Yield)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">배당수익률 = (주당 연간 배당금 / 현재 주가) × 100. 예를 들어 주가 50,000원에 연간 배당금이 2,000원이라면 배당수익률은 4%입니다. 은행 예금 금리와 비교하여 배당 투자의 매력도를 판단하는 데 활용됩니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">금리가 3%인 환경에서 배당수익률이 5%인 고배당 ETF에 투자하면, 주가 변동과 별개로 4% 수준의 배당 수익을 기대할 수 있습니다. 리츠(REITs), 통신주, 에너지주가 전통적으로 배당수익률이 높은 업종입니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">주가가 급락하면 배당수익률이 올라 보이는 착시 효과가 있습니다. 배당 삭감 위험이 있는 기업은 아닌지 배당 성향, 현금흐름, 부채 수준을 반드시 점검하세요.</p>
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
