import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '인플레이션 (Inflation) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '물가가 지속적으로 상승하여 화폐 가치가 하락하는 경제 현상. 주식 초보자도 쉽게 이해할 수 있는 인플레이션 (Inflation) 완벽 가이드.',
  keywords: ['인플레이션 (Inflation)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideInflationPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">인플레이션 (Inflation)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">인플레이션 (Inflation)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">물가가 지속적으로 상승하여 화폐 가치가 하락하는 경제 현상</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">인플레이션 (Inflation)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">인플레이션은 상품과 서비스의 전반적인 가격 수준이 지속적으로 올라가는 현상입니다. CPI(소비자물가지수)로 측정하며, 중앙은행은 보통 2% 수준의 물가 안정을 목표로 합니다. 인플레이션이 높아지면 중앙은행은 금리를 인상하여 시중 자금을 흡수하고 소비를 억제합니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">2022년 미국의 CPI가 9%까지 치솟자 연방준비제도(Fed)는 급격한 금리 인상을 단행했습니다. 이로 인해 미국 국채 금리가 급등하고 성장주 밸류에이션이 크게 하락하면서 나스닥이 2022년에 30% 이상 폭락하는 결과를 낳았습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">일정 수준의 인플레이션(2% 내외)은 경제 성장에 필요합니다. 그러나 과도한 인플레이션은 기업 비용 증가, 소비 위축, 금리 인상으로 이어져 주식 시장에 부정적인 영향을 줍니다. 반대로 물가가 하락하는 디플레이션도 경제에 악영향을 줄 수 있습니다.</p>
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
