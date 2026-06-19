import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '배당금 (Dividend) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '기업이 이익의 일부를 주주에게 분배하는 현금 또는 주식. 주식 초보자도 쉽게 이해할 수 있는 배당금 (Dividend) 완벽 가이드.',
  keywords: ['배당금 (Dividend)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideDividendPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">배당금 (Dividend)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">배당금 (Dividend)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">기업이 이익의 일부를 주주에게 분배하는 현금 또는 주식</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">배당금 (Dividend)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">배당금은 기업이 영업 활동으로 벌어들인 순이익의 일부를 주주에게 돌려주는 것입니다. 현금 배당이 가장 일반적이며, 주식 배당도 가능합니다. 배당은 연 1회(결산 배당), 반기 배당, 분기 배당 형태로 지급됩니다. 한국에서는 12월 결산 법인이 다음 해 3~4월에 배당금을 지급하는 것이 일반적입니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">삼성전자가 2024년 결산 기준 주당 배당금 1,444원을 지급했다면, 주식 100주를 보유한 주주는 세전 144,400원을 현금으로 받게 됩니다. 배당금에는 15.4%의 배당소득세가 원천징수됩니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">배당금이 높다고 무조건 좋은 것은 아닙니다. 기업이 성장 투자 없이 배당에만 집중하면 장기 성장성이 낮아질 수 있습니다. 배당 성향(순이익 대비 배당금 비율)과 배당 지속성을 함께 확인하세요.</p>
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
