import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'EBITDA 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '이자·세금·감가상각 차감 전 이익으로 기업의 현금 창출 능력을 나타내는 지표. 주식 초보자도 쉽게 이해할 수 있는 EBITDA 완벽 가이드.',
  keywords: ['EBITDA', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideEbitdaPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">EBITDA</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">EBITDA</h1>
          <p className="text-xl text-gray-400 leading-relaxed">이자·세금·감가상각 차감 전 이익으로 기업의 현금 창출 능력을 나타내는 지표</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">EBITDA이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">EBITDA(Earnings Before Interest, Taxes, Depreciation, and Amortization)는 영업이익에서 감가상각비와 무형자산 상각비를 더한 값입니다. 설비 투자가 많은 제조업이나 통신업에서 감가상각으로 인한 회계적 비용을 제거하여 순수한 현금 창출 능력을 파악할 때 활용됩니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">통신사는 기지국·장비 등 막대한 유형 자산을 보유하여 감가상각비가 큽니다. 이 경우 영업이익보다 EBITDA가 높게 나타납니다. 기업 인수합병(M&A) 시 EV/EBITDA 배수를 활용하여 기업 가치를 평가합니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">EBITDA는 설비 투자(Capex)를 반영하지 않아 자본 집약도가 높은 산업에서는 현금흐름을 과대평가할 수 있습니다. 항상 영업현금흐름(Operating Cash Flow)과 FCFF(기업잉여현금흐름)를 함께 확인하는 것이 좋습니다.</p>
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
