import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '분산투자 (Diversification) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '여러 자산과 종목에 나눠 투자하여 위험을 낮추는 포트폴리오 전략. 주식 초보자도 쉽게 이해할 수 있는 분산투자 (Diversification) 완벽 가이드.',
  keywords: ['분산투자 (Diversification)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideDiversificationPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">분산투자 (Diversification)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">분산투자 (Diversification)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">여러 자산과 종목에 나눠 투자하여 위험을 낮추는 포트폴리오 전략</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">분산투자 (Diversification)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">분산투자는 '달걀을 한 바구니에 담지 말라'는 투자 격언처럼, 여러 종목·업종·자산군에 나눠 투자하여 특정 종목이나 업종의 부진이 전체 포트폴리오에 미치는 영향을 줄이는 전략입니다. 마코위츠의 포트폴리오 이론에 따르면, 상관관계가 낮은 자산을 조합할수록 동일한 위험에서 더 높은 수익을 기대할 수 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">반도체 종목 하나에 전 재산을 투자했는데 해당 기업이 분식회계 스캔들로 상장폐지되면 전액 손실입니다. 반면 반도체·바이오·소비재·채권·해외ETF에 20%씩 나눠 투자했다면, 한 종목의 부진이 전체에 미치는 영향이 제한됩니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">무조건 많이 나눈다고 분산이 되는 것은 아닙니다. 같은 방향으로 움직이는 종목들만 모아도 분산 효과가 없습니다. 상관관계가 낮은 자산군(주식+채권+금+현금 등)에 걸쳐 진정한 분산투자를 구현하는 것이 핵심입니다.</p>
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
