import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ETF (상장지수펀드) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '특정 지수·섹터를 추종하며 주식처럼 실시간 거래 가능한 분산투자 상품. 주식 초보자도 쉽게 이해할 수 있는 ETF (상장지수펀드) 완벽 가이드.',
  keywords: ['ETF (상장지수펀드)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideEtfPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">ETF (상장지수펀드)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">ETF (상장지수펀드)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">특정 지수·섹터를 추종하며 주식처럼 실시간 거래 가능한 분산투자 상품</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">ETF (상장지수펀드)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">ETF(Exchange Traded Fund)는 코스피200, 나스닥100 등 특정 지수를 추종하도록 설계된 펀드로, 주식처럼 실시간으로 매매할 수 있습니다. 여러 종목에 한 번에 분산투자할 수 있어 개별 종목 리스크를 낮출 수 있습니다. 운용 보수가 일반 펀드보다 저렴합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">KODEX 200 ETF를 매수하면 코스피 200 대형주에 한 번에 분산투자한 효과를 얻을 수 있습니다. 미국 반도체 ETF(SOXX)에 투자하면 엔비디아, AMD, TSMC 등 주요 반도체 기업에 간접 투자하는 것과 같습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">레버리지 ETF(2배, 3배)는 기초 지수 수익률의 2~3배를 추구하지만, 변동성이 크고 장기 보유 시 지수 수익률과 괴리가 발생하는 복리 효과 문제가 있습니다. 단기 매매 목적에만 활용하는 것이 바람직합니다.</p>
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
