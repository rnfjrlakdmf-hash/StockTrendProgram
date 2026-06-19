import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '거래량 (Trading Volume) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '일정 기간 동안 시장에서 매매된 주식의 총 수량. 주식 초보자도 쉽게 이해할 수 있는 거래량 (Trading Volume) 완벽 가이드.',
  keywords: ['거래량 (Trading Volume)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideVolumePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">거래량 (Trading Volume)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">거래량 (Trading Volume)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">일정 기간 동안 시장에서 매매된 주식의 총 수량</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">거래량 (Trading Volume)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">거래량은 해당 기간 동안 실제로 체결된 매수·매도 주식의 수량입니다. 거래량이 많으면 많은 투자자들이 해당 종목에 관심을 갖고 있음을 의미합니다. 주가 상승 시 거래량이 함께 증가하면 상승 추세의 신뢰도가 높아지고, 거래량 없는 상승은 지속성이 약할 수 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">평소 일평균 거래량이 10만 주인 종목에서 하루에 100만 주가 거래됐다면, 이는 비정상적인 수급 변화가 있었음을 나타냅니다. DART 공시 발표, 외국인 대규모 매수, 테마 부각 등의 이유로 거래량이 폭증하기도 합니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">거래량 급증이 항상 호재는 아닙니다. 대규모 매도 물량이 출회될 때도 거래량이 폭증합니다. 거래량 방향(매수세 vs 매도세 우위)과 주가 방향을 함께 확인해야 합니다.</p>
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
