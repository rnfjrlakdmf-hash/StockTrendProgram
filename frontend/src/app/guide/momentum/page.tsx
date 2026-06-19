import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '모멘텀 투자 (Momentum) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '최근 상승 추세 강한 종목이 계속 오르는 경향을 이용하는 투자 전략. 주식 초보자도 쉽게 이해할 수 있는 모멘텀 투자 (Momentum) 완벽 가이드.',
  keywords: ['모멘텀 투자 (Momentum)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideMomentumPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">모멘텀 투자 (Momentum)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">모멘텀 투자 (Momentum)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">최근 상승 추세 강한 종목이 계속 오르는 경향을 이용하는 투자 전략</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">모멘텀 투자 (Momentum)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">모멘텀 투자는 최근 일정 기간(예: 3~12개월) 동안 주가 상승률이 높은 종목이 앞으로도 계속 오를 가능성이 높다는 이론에 기반합니다. '이기는 말에 계속 베팅하라'는 철학입니다. 학문적으로도 모멘텀 효과가 존재한다는 연구 결과가 많습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">코스닥 상장 AI 기업들이 ChatGPT 붐으로 급등한 뒤에도 계속 상승세를 보인 것은 모멘텀 효과의 예입니다. 상승하는 종목에 매수세가 몰리면서 추세가 강화되는 현상이 나타납니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">모멘텀 전략은 추세 전환 시 큰 손실을 볼 수 있습니다. 고점에서 모멘텀에 편승하면 급락 시 패닉 셀링으로 큰 손실을 입을 수 있습니다. 손절 기준을 명확히 하고, 전체 포트폴리오의 일부에만 적용하는 것이 바람직합니다.</p>
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
