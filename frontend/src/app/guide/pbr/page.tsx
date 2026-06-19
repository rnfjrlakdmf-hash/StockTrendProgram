import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'PBR (주가순자산비율) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '주가를 주당순자산으로 나눈 값으로 기업 자산 대비 주가 수준을 나타내는 지표. 주식 초보자도 쉽게 이해할 수 있는 PBR (주가순자산비율) 완벽 가이드.',
};

export default function GuidePbrPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">PBR (주가순자산비율)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">PBR (주가순자산비율)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">주가를 주당순자산으로 나눈 값으로 기업 자산 대비 주가 수준을 나타내는 지표</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">PBR (주가순자산비율)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">PBR(Price-to-Book Ratio)은 주가가 기업의 순자산 대비 몇 배에 거래되고 있는지를 나타냅니다. PBR = 주가 / BPS(주당순자산가치). PBR 1 미만이면 청산 가치보다 주가가 낮다는 의미로, 자산주로 분류되어 관심을 받기도 합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">어떤 기업의 PBR이 0.6이라면, 현재 주가가 보유 자산의 60%에 불과하다는 뜻입니다. 이론적으로는 저평가 상태이지만, 자산의 질(부실채권 비중, 무형자산 비중 등)에 따라 실질 가치가 다를 수 있습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">PBR은 제조업·금융업에 적합하나, 인터넷·소프트웨어 기업처럼 유형 자산보다 무형 자산(브랜드, 기술력)의 가치가 큰 기업에는 적용하기 어렵습니다. 업종 특성을 반드시 고려하세요.</p>
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
