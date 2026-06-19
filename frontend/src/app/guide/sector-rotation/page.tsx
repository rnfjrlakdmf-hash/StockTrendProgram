import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '섹터 로테이션 (Sector Rotation) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '경기 사이클에 따라 강세 업종이 바뀌는 현상을 이용하는 투자 전략. 주식 초보자도 쉽게 이해할 수 있는 섹터 로테이션 (Sector Rotation) 완벽 가이드.',
};

export default function GuideSectorRotationPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">섹터 로테이션 (Sector Rotation)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">섹터 로테이션 (Sector Rotation)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">경기 사이클에 따라 강세 업종이 바뀌는 현상을 이용하는 투자 전략</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">섹터 로테이션 (Sector Rotation)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">섹터 로테이션은 경기 사이클의 각 단계에 따라 강세를 보이는 업종이 순환하는 현상을 이용한 투자 전략입니다. 경기 회복기에는 소비재·금융주가, 성장기에는 IT·에너지주가, 침체기에는 필수 소비재·유틸리티주가 강세를 보이는 경향이 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">2022년 금리 급등 시기에 IT·성장주가 폭락하는 동안, 에너지·원자재 업종은 오히려 강세를 보였습니다. 이는 인플레이션 시기에 실물 자산 관련 기업들의 가격 전가력이 높아진 섹터 로테이션 현상이었습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">섹터 로테이션은 추세를 완벽하게 예측하기 어렵고, 타이밍을 잘못 잡으면 오히려 손실을 볼 수 있습니다. 장기적으로는 섹터별 ETF를 활용한 분산투자로 접근하는 것이 개인 투자자에게 현실적입니다.</p>
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
