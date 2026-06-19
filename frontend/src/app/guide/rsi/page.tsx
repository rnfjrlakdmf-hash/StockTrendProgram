import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RSI (상대강도지수) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '주가의 과매수·과매도 상태를 0~100 범위의 수치로 나타내는 모멘텀 지표. 주식 초보자도 쉽게 이해할 수 있는 RSI (상대강도지수) 완벽 가이드.',
};

export default function GuideRsiPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">RSI (상대강도지수)</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            📚 주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            RSI (상대강도지수)
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            주가의 과매수·과매도 상태를 0~100 범위의 수치로 나타내는 모멘텀 지표
          </p>
        </div>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          
          {/* What is it */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🔍</span> RSI (상대강도지수)이란 무엇인가?
            </h2>
            <p className="text-lg leading-relaxed">RSI(Relative Strength Index, 상대강도지수)는 1978년 웰스 와일더(J. Welles Wilder)가 개발한 모멘텀 지표입니다. 특정 기간(보통 14일) 동안의 주가 상승폭과 하락폭의 비율을 계산하여 0~100 사이의 숫자로 표현합니다.</p>
          </section>

          {/* How to use */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📈</span> 실전 활용 방법
            </h2>
            <p className="text-lg leading-relaxed whitespace-pre-line">RSI = 100 - [100 / (1 + (평균 상승폭 / 평균 하락폭))]

일반적으로 RSI 70 이상이면 '과매수(Overbought)' 구간으로 주가 조정 가능성이 높다고 해석하고, RSI 30 이하면 '과매도(Oversold)' 구간으로 주가 반등 가능성이 있다고 봅니다.</p>
          </section>

          {/* Example */}
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">💡</span> 실전 예시
            </h2>
            <p className="text-lg leading-relaxed">삼성전자의 RSI가 28로 하락했다면, 최근 14거래일 동안 매도세가 매수세를 크게 압도했다는 뜻입니다. 이는 단기적인 낙폭 과대 상태를 나타내며, 기술적 관점에서는 반등 가능성을 점쳐볼 수 있는 구간입니다. 그러나 RSI만으로 투자 판단을 내리는 것은 위험하며, 반드시 다른 지표와 병행하여 활용해야 합니다.</p>
          </section>

          {/* Important Note */}
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3 flex items-center gap-2">
              <span>⚠️</span> 투자자 주의사항
            </h2>
            <p className="leading-relaxed">RSI는 추세가 강할 때 과매수/과매도 상태가 오래 지속될 수 있습니다. 강한 상승 추세에서는 RSI가 70 이상을 유지하며 계속 오를 수 있고, 강한 하락 추세에서는 30 이하를 유지하며 계속 빠질 수 있습니다.</p>
          </section>

          {/* Related Terms */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">📖 함께 알아두면 좋은 용어</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {["RSI", "PER", "PBR", "ROE", "EPS", "MACD", "볼린저밴드", "이동평균선", "배당수익률"].map((term) => (
                <Link
                  key={term}
                  href={`/guide/${term.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '-')}`}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl text-center text-sm hover:bg-white/10 hover:border-blue-500/30 transition-all"
                >
                  {term}
                </Link>
              ))}
            </div>
          </section>

          {/* Disclaimer */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-sm text-gray-500">
            <strong className="text-gray-400 block mb-2">⚠️ 면책 조항</strong>
            본 가이드는 주식 투자 용어를 이해하기 쉽게 설명하기 위한 교육 목적의 정보입니다. 
            특정 종목의 매수·매도를 권유하는 내용이 아니며, 투자의 최종 판단과 책임은 
            투자자 본인에게 있습니다. 주식 투자에는 원금 손실의 위험이 있습니다.
          </div>

        </div>

        {/* Footer Nav */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm text-gray-600">
          <Link href="/guide" className="hover:text-gray-400">← 용어 가이드 목록</Link>
          <Link href="/" className="hover:text-gray-400">홈으로</Link>
          <Link href="/discovery" className="hover:text-gray-400">종목 분석하기</Link>
        </div>
      </div>
    </div>
  );
}
