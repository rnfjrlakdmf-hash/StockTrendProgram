import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'PER (주가수익비율) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '주가를 주당순이익(EPS)으로 나눈 값으로 기업의 수익 대비 주가 수준을 평가하는 지표. 주식 초보자도 쉽게 이해할 수 있는 PER (주가수익비율) 완벽 가이드.',
  keywords: ['PER (주가수익비율)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuidePerPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">PER (주가수익비율)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">PER (주가수익비율)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">주가를 주당순이익(EPS)으로 나눈 값으로 기업의 수익 대비 주가 수준을 평가하는 지표</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">PER (주가수익비율)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">PER(Price-to-Earnings Ratio)은 기업이 1원의 이익을 낼 때 시장에서 몇 원의 가치를 부여받는지를 나타냅니다. PER = 주가 / EPS(주당순이익). 예를 들어 주가가 5만 원이고 EPS가 5천 원이라면 PER은 10입니다. 동일 업종의 다른 기업과 비교해 고평가·저평가 여부를 판단하는 데 활용됩니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">코스피 평균 PER이 12라고 할 때, 어떤 종목의 PER이 8이라면 업종 평균 대비 저평가 상태일 수 있습니다. 반대로 PER이 50이라면 미래 성장성에 대한 기대가 높은 종목임을 뜻합니다. 바이오·플랫폼 기업은 적자 상태에서도 성장 기대로 높은 PER이 형성되기도 합니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">PER이 낮다고 무조건 좋은 것은 아닙니다. 이익이 감소하거나 부실 위험이 있는 기업도 PER이 낮게 나타날 수 있습니다. 반드시 ROE, 부채비율, 업황 등을 함께 확인해야 합니다.</p>
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
