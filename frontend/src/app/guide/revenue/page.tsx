import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '매출액 (Revenue) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '기업이 상품·서비스 판매로 벌어들인 총 수입. 주식 초보자도 쉽게 이해할 수 있는 매출액 (Revenue) 완벽 가이드.',
  keywords: ['매출액 (Revenue)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideRevenuePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">매출액 (Revenue)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">매출액 (Revenue)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">기업이 상품·서비스 판매로 벌어들인 총 수입</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">매출액 (Revenue)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">매출액(Revenue)은 기업이 주된 영업 활동인 상품·서비스 판매를 통해 벌어들인 총 수입입니다. 손익계산서의 최상단에 위치하여 Top-Line이라고도 불립니다. 매출액 성장률은 기업의 사업 확장 속도를 가늠하는 1차 지표입니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">삼성전자의 2023년 연간 매출액이 약 259조 원이라는 것은 그해 반도체·스마트폰·가전 등 제품·서비스 판매로 259조 원의 수입을 올렸다는 의미입니다. 전년 대비 매출액 성장률이 20% 이상이면 고성장 기업으로 분류됩니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">매출액이 크다고 반드시 좋은 기업은 아닙니다. 매출총이익률(Gross Margin)과 영업이익률을 함께 확인해야 합니다. 매출은 크지만 수익성이 낮은 기업보다, 매출이 작더라도 높은 이익률을 유지하는 기업이 장기적으로 더 가치 있을 수 있습니다.</p>
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
