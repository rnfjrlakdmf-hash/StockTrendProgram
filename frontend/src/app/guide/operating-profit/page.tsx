import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '영업이익 (Operating Profit) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '매출액에서 영업 관련 비용을 제외한 본업의 수익성 지표. 주식 초보자도 쉽게 이해할 수 있는 영업이익 (Operating Profit) 완벽 가이드.',
  keywords: ['영업이익 (Operating Profit)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideOperatingProfitPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">영업이익 (Operating Profit)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">영업이익 (Operating Profit)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">매출액에서 영업 관련 비용을 제외한 본업의 수익성 지표</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">영업이익 (Operating Profit)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">영업이익은 매출액에서 매출원가, 판매비, 관리비 등 영업 활동에 필요한 모든 비용을 차감한 이익입니다. 이자 비용이나 세금은 포함하지 않아 기업의 본업 수익성을 가장 순수하게 나타냅니다. 영업이익률 = 영업이익 / 매출액 × 100.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">SK하이닉스의 영업이익이 2023년 급격히 줄어들었다면, 반도체 가격 하락과 감산에 따른 고정비 부담이 커졌음을 의미합니다. 동일 기간 경쟁사 대비 영업이익률이 높은 기업은 원가 경쟁력이 있다는 신호입니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">일회성 자산 처분 이익이나 충당금 환입 등으로 인해 영업이익이 일시적으로 크게 변동할 수 있습니다. 정상 영업 활동에서 비롯된 이익인지 확인하기 위해 사업보고서의 주석 사항을 꼼꼼히 읽어야 합니다.</p>
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
