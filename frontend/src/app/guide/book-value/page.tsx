import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '장부가치 (Book Value) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '총자산에서 총부채를 뺀 기업의 순자산 가치. 주식 초보자도 쉽게 이해할 수 있는 장부가치 (Book Value) 완벽 가이드.',
  keywords: ['장부가치 (Book Value)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideBookValuePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">장부가치 (Book Value)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">장부가치 (Book Value)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">총자산에서 총부채를 뺀 기업의 순자산 가치</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">장부가치 (Book Value)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">장부가치(Book Value)는 기업 재무상태표 기준으로 자산에서 부채를 차감한 순자산을 의미합니다. 주당 장부가치(BPS, Book Value Per Share) = 순자산 / 발행 주식 수. 기업이 모든 부채를 갚고 청산했을 때 주주가 이론적으로 받을 수 있는 금액입니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">PBR(주가/BPS)이 1 미만이면 현재 주가가 장부상 청산 가치보다 낮다는 의미입니다. 국내 금융주·건설주 중 PBR 0.5 미만 종목들이 '자산주'로 분류되어 관심을 받기도 합니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">장부가치는 역사적 원가로 기록된 자산 기준이므로 현재 시장 가치와 다를 수 있습니다. 부동산은 오랫동안 보유하면 장부가치보다 현재 가치가 훨씬 높을 수 있습니다. 반대로 진부화된 설비나 감가상각이 완료된 자산은 장부가치가 0이지만 실제로 사용 중일 수 있습니다.</p>
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
