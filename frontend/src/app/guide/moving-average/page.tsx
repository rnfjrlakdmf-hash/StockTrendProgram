import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '이동평균선 (Moving Average) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '일정 기간 주가 평균을 연결한 선으로 추세와 지지·저항을 파악하는 핵심 지표. 주식 초보자도 쉽게 이해할 수 있는 이동평균선 (Moving Average) 완벽 가이드.',
  keywords: ['이동평균선 (Moving Average)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideMovingAveragePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">이동평균선 (Moving Average)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">이동평균선 (Moving Average)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">일정 기간 주가 평균을 연결한 선으로 추세와 지지·저항을 파악하는 핵심 지표</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">이동평균선 (Moving Average)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">이동평균선은 주가 데이터를 평탄화하여 추세를 쉽게 파악하게 해주는 지표입니다. 5일(단기), 20일(중기), 60일·120일(장기) 이동평균선이 많이 활용됩니다. 주가가 이동평균선 위에 있으면 강세, 아래에 있으면 약세 국면으로 봅니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">주가가 20일 이동평균선 아래에서 위로 올라서면 단기 상승 추세 전환 신호로 해석할 수 있습니다. 이동평균선들이 모두 수렴된 후 발산하면 새로운 추세의 시작을 의미하기도 합니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">이동평균선은 과거 데이터를 기반으로 하는 후행 지표이므로 추세 전환을 항상 먼저 알려주지는 않습니다. 급등락이 잦은 소형주에서는 신뢰도가 떨어질 수 있습니다.</p>
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
