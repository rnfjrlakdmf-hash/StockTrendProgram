import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '공매도 (Short Selling) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '빌린 주식을 매도하여 주가 하락 시 차익을 얻는 투자 전략. 주식 초보자도 쉽게 이해할 수 있는 공매도 (Short Selling) 완벽 가이드.',
};

export default function GuideShortSellingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">공매도 (Short Selling)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">공매도 (Short Selling)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">빌린 주식을 매도하여 주가 하락 시 차익을 얻는 투자 전략</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">공매도 (Short Selling)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">공매도는 주식을 빌려서 현재 시장가에 매도한 후, 나중에 더 낮은 가격에 사서 갚아 차익을 얻는 투자 방법입니다. 주가 하락을 예상할 때 사용합니다. 국내에서는 기관·외국인만 공매도가 가능하며, 2021년 5월부터 일부 조건하에 개인 투자자도 참여할 수 있게 되었습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">삼성전자 주가가 80,000원일 때 공매도한 후, 70,000원으로 하락하면 차환 매수하여 주당 10,000원의 수익이 발생합니다. 반대로 주가가 올라가면 손실이 무한정 커질 수 있어 매우 위험한 전략입니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">공매도 잔고율(공매도 주식 수 / 상장 주식 수)이 높은 종목은 주가 하락 시 추가 공매도로 낙폭이 커질 수 있습니다. 반면 주가 급등 시 공매도 세력의 손실 확정(숏커버링)으로 인해 추가 급등이 발생하기도 합니다.</p>
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
