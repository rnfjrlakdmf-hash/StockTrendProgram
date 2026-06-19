import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '공시 (Corporate Disclosure) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '상장 기업이 주요 경영 사항을 투자자에게 의무적으로 알리는 제도. 주식 초보자도 쉽게 이해할 수 있는 공시 (Corporate Disclosure) 완벽 가이드.',
};

export default function GuideDisclosurePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">공시 (Corporate Disclosure)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">공시 (Corporate Disclosure)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">상장 기업이 주요 경영 사항을 투자자에게 의무적으로 알리는 제도</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">공시 (Corporate Disclosure)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">공시 제도는 증권 시장의 정보 비대칭을 해소하여 공정한 투자 환경을 만들기 위한 제도입니다. 상장 기업은 투자자 판단에 영향을 미칠 수 있는 주요 사항을 즉시 공시해야 합니다. 주요 공시 유형에는 대규모 계약, 분기·반기·연간 실적, 임원 변경, 자본 변동(증자·감자), 합병·분할 등이 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">A기업이 매출액의 30%에 달하는 대규모 수주 계약을 체결하면 '단일판매·공급계약 체결' 공시를 통해 투자자에게 알려야 합니다. 투자자는 이 공시를 보고 기업 실적에 미칠 영향을 판단할 수 있습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">공시를 성실하게 이행하지 않거나 허위 공시를 하는 불성실 공시 법인은 금융감독원으로부터 제재를 받을 수 있습니다. 투자 전 관심 종목의 공시 이력과 불성실 공시 여부를 꼭 확인하세요.</p>
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
