import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '가치투자 (Value Investing) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '내재가치 대비 저평가된 주식을 발굴해 장기 보유하는 투자 철학. 주식 초보자도 쉽게 이해할 수 있는 가치투자 (Value Investing) 완벽 가이드.',
  keywords: ['가치투자 (Value Investing)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideValueInvestingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">가치투자 (Value Investing)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">가치투자 (Value Investing)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">내재가치 대비 저평가된 주식을 발굴해 장기 보유하는 투자 철학</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">가치투자 (Value Investing)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">가치투자는 벤저민 그레이엄이 창시하고 워런 버핏이 발전시킨 투자 철학입니다. 현재 주가가 기업의 내재가치보다 낮은 종목을 발굴하여 장기 보유함으로써 수익을 추구합니다. 안전 마진(Margin of Safety), 미스터 마켓, 내재가치 등 핵심 개념을 이해하는 것이 중요합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">워런 버핏은 1988년 코카콜라 주식을 매수하여 30년 이상 보유하면서 수천억 달러의 수익을 올렸습니다. 그는 '멋진 기업을 적절한 가격에 사는 것이, 적절한 기업을 훌륭한 가격에 사는 것보다 훨씬 낫다'고 했습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">가치투자는 단기적 관점에서는 지루할 수 있습니다. 저평가 상태가 오랫동안 해소되지 않을 수 있으며, 그 사이 시장이 더 매력적인 종목을 제공할 수도 있습니다. 인내심과 규율이 가치투자의 핵심 덕목입니다.</p>
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
