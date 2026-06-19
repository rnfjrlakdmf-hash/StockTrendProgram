import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '시장가 주문 (Market Order) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '현재 시장의 최우선 호가에 즉시 체결되도록 내는 주문 방식. 주식 초보자도 쉽게 이해할 수 있는 시장가 주문 (Market Order) 완벽 가이드.',
  keywords: ['시장가 주문 (Market Order)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideMarketOrderPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">시장가 주문 (Market Order)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">시장가 주문 (Market Order)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">현재 시장의 최우선 호가에 즉시 체결되도록 내는 주문 방식</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">시장가 주문 (Market Order)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">시장가 주문은 현재 시장에서 가장 유리한 가격(매수 시 최저 매도호가, 매도 시 최고 매수호가)으로 즉시 체결을 원하는 주문입니다. 원하는 타이밍에 빠르게 체결할 수 있지만, 거래량이 적은 종목에서는 예상보다 불리한 가격에 체결될 수 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">삼성전자를 시장가 매수 주문 시, 현재 최저 매도호가인 70,200원에 즉시 체결됩니다. 반면 거래량이 적은 코스닥 소형주를 시장가로 매수하면 호가 간격이 넓어 70,000원을 원했으나 72,000원에 체결되는 슬리피지가 발생할 수 있습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">유동성이 낮은 종목, 거래 시간 외 시간외 거래, 급격한 변동성 구간에서는 시장가 주문보다 지정가 주문을 사용하는 것이 안전합니다. 특히 소형주나 ETF 갭 상황에서 시장가 주문은 의도치 않은 손실을 줄 수 있습니다.</p>
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
