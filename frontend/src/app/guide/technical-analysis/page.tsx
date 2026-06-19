import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '기술적 분석 (Technical Analysis) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '주가 차트와 거래량 패턴으로 미래 주가를 예측하는 분석 방법론. 주식 초보자도 쉽게 이해할 수 있는 기술적 분석 (Technical Analysis) 완벽 가이드.',
  keywords: ['기술적 분석 (Technical Analysis)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideTechnicalAnalysisPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">기술적 분석 (Technical Analysis)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">기술적 분석 (Technical Analysis)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">주가 차트와 거래량 패턴으로 미래 주가를 예측하는 분석 방법론</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">기술적 분석 (Technical Analysis)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">기술적 분석은 과거 주가·거래량 데이터에서 패턴을 찾아 미래 주가 방향을 예측하는 방법입니다. '모든 정보는 주가에 이미 반영되어 있다'는 가정에 기반합니다. 이동평균선, RSI, MACD, 볼린저 밴드 등 다양한 지표를 활용합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">기술적 분석가는 주가가 특정 저항선(예: 60,000원)을 돌파하면 다음 저항선(70,000원)까지 상승할 가능성이 높다고 분석합니다. 헤드앤숄더 패턴, 이중 바닥 패턴 등 차트 패턴도 활용합니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">기술적 분석은 많은 투자자들이 같은 차트를 보기 때문에 자기 실현적 예언(Self-fulfilling Prophecy) 성격이 있습니다. 그러나 기업 펀더멘털의 급격한 변화, 예상치 못한 외부 충격 앞에서는 무력해질 수 있습니다.</p>
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
