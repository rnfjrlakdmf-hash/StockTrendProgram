import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '기본적 분석 (Fundamental Analysis) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '재무제표와 경기 분석으로 적정 주가를 산출하는 투자 분석 방법론. 주식 초보자도 쉽게 이해할 수 있는 기본적 분석 (Fundamental Analysis) 완벽 가이드.',
  keywords: ['기본적 분석 (Fundamental Analysis)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideFundamentalAnalysisPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">기본적 분석 (Fundamental Analysis)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">기본적 분석 (Fundamental Analysis)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">재무제표와 경기 분석으로 적정 주가를 산출하는 투자 분석 방법론</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">기본적 분석 (Fundamental Analysis)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">기본적 분석은 기업의 내재가치를 분석하여 현재 주가가 고평가됐는지 저평가됐는지를 판단하는 방법입니다. 재무제표(손익계산서, 재무상태표, 현금흐름표) 분석, 산업 분석, 경쟁사 비교, 거시경제 분석 등을 포함합니다. 워런 버핏, 벤저민 그레이엄 등 가치 투자자들이 주로 활용합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">기본적 분석을 통해 어떤 기업의 적정 주가를 30,000원으로 산출했는데 현재 주가가 20,000원이라면, 이론적으로 10,000원의 안전 마진(Margin of Safety)이 있다고 볼 수 있습니다. DCF(현금흐름 할인) 모델, PER 밸류에이션 등이 대표적인 방법입니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">기본적 분석의 한계는 적정 가치 산출이 주관적이며, 가치와 주가의 괴리가 상당 기간 지속될 수 있다는 점입니다. '시장은 당신이 지급불능이 될 때까지 비합리적으로 행동할 수 있다'는 케인즈의 말을 기억하세요.</p>
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
