import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '포트폴리오 (Portfolio) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '분산투자를 위해 구성된 여러 자산과 종목의 집합체. 주식 초보자도 쉽게 이해할 수 있는 포트폴리오 (Portfolio) 완벽 가이드.',
  keywords: ['포트폴리오 (Portfolio)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuidePortfolioPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">포트폴리오 (Portfolio)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">포트폴리오 (Portfolio)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">분산투자를 위해 구성된 여러 자산과 종목의 집합체</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">포트폴리오 (Portfolio)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">포트폴리오는 투자 위험을 분산하기 위해 여러 자산·종목을 조합한 것입니다. 해리 마코위츠의 현대 포트폴리오 이론에 따르면, 상관관계가 낮은 자산을 조합하면 위험을 줄이면서 수익을 극대화할 수 있습니다. 주식, 채권, 현금, 부동산, 원자재 등 자산군 간 배분이 핵심입니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">삼성전자 100%에 투자하는 것보다, 삼성전자 40% + 채권 30% + 미국 ETF 20% + 현금 10%로 포트폴리오를 구성하면 삼성전자 급락 시 손실을 완충할 수 있습니다. 섹터별로도 반도체, 바이오, 소비재, 금융 등에 나눠 투자하면 섹터 리스크를 낮출 수 있습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">포트폴리오 구성이 좋아도 리밸런싱을 하지 않으면 시간이 지나면서 특정 자산 비중이 과도하게 커질 수 있습니다. 정기적으로 목표 비중을 점검하고 조정하는 리밸런싱이 필요합니다.</p>
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
