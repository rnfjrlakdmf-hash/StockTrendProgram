import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '볼린저 밴드 (Bollinger Bands) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '이동평균선 중심으로 상하에 표준편차 밴드를 그려 변동성을 분석하는 지표. 주식 초보자도 쉽게 이해할 수 있는 볼린저 밴드 (Bollinger Bands) 완벽 가이드.',
  keywords: ['볼린저 밴드 (Bollinger Bands)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideBollingerBandPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">볼린저 밴드 (Bollinger Bands)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">볼린저 밴드 (Bollinger Bands)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">이동평균선 중심으로 상하에 표준편차 밴드를 그려 변동성을 분석하는 지표</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">볼린저 밴드 (Bollinger Bands)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">볼린저 밴드는 1980년대 존 볼린저가 개발했습니다. 20일 이동평균선을 중심으로 상단 밴드(+2 표준편차), 하단 밴드(-2 표준편차)로 구성됩니다. 밴드 폭이 좁아지면 변동성 감소, 넓어지면 변동성 증가를 의미합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">주가가 하단 밴드에 닿으면 과매도 가능성, 상단 밴드에 닿으면 과매수 가능성으로 해석할 수 있습니다. 밴드 폭이 급격히 좁아진 후 상하 어느 방향으로 이탈하면 강한 추세 발생 신호로 볼 수 있습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">볼린저 밴드 이탈이 반드시 반전 신호는 아닙니다. 강한 추세에서는 밴드 상단을 따라 계속 상승하거나, 밴드 하단을 따라 계속 하락하는 워킹 더 밴드 현상이 발생하기도 합니다.</p>
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
