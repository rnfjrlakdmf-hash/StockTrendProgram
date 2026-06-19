import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '시가총액 (Market Capitalization) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '현재 주가 × 발행 주식 수로 계산하는 기업의 시장 가치. 주식 초보자도 쉽게 이해할 수 있는 시가총액 (Market Capitalization) 완벽 가이드.',
};

export default function GuideMarketCapPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">시가총액 (Market Capitalization)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">시가총액 (Market Capitalization)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">현재 주가 × 발행 주식 수로 계산하는 기업의 시장 가치</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">시가총액 (Market Capitalization)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">시가총액은 현재 시장에서 기업이 평가받는 전체 가치입니다. 시가총액 = 현재 주가 × 총 발행 주식 수. 코스피 시가총액 1위는 삼성전자이며, 미국에서는 애플·마이크로소프트 등이 수천조 원의 시가총액을 기록하고 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">주가가 50,000원이고 발행 주식 수가 100억 주라면 시가총액은 500조 원입니다. 시가총액 기준으로 대형주(코스피 상위 100), 중형주, 소형주를 구분하며, 이에 따라 유동성과 변동성이 달라집니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">시가총액이 크다고 무조건 안전하지는 않습니다. 버블 시기에는 이익에 비해 시가총액이 과도하게 커지는 경우도 있습니다. 시가총액과 기업 가치(EV)를 동시에 확인하는 것이 좋습니다.</p>
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
