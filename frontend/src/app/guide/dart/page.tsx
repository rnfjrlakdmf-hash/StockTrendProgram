import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'DART (전자공시시스템) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '금융감독원이 운영하는 상장기업 공시 통합 플랫폼. 주식 초보자도 쉽게 이해할 수 있는 DART (전자공시시스템) 완벽 가이드.',
  keywords: ['DART (전자공시시스템)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideDartPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">DART (전자공시시스템)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">DART (전자공시시스템)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">금융감독원이 운영하는 상장기업 공시 통합 플랫폼</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">DART (전자공시시스템)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">DART(Data Analysis, Retrieval and Transfer System)는 금융감독원이 운영하는 전자공시 시스템입니다. 코스피·코스닥에 상장된 모든 기업은 주요 경영 사항을 DART에 의무적으로 공시해야 합니다. 대규모 계약 체결, 분기 실적(사업보고서), 대주주 지분 변동, 유상증자 등이 공시됩니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">어떤 기업이 수주 계약을 체결했다면 DART에 '단일판매·공급계약 체결' 공시가 올라옵니다. 공시 원문에서 계약 금액, 계약 상대방, 계약 기간 등 핵심 내용을 확인할 수 있습니다. 실시간 공시 알림을 활용하면 빠르게 정보를 얻을 수 있습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">공시 내용이 무조건 호재·악재는 아닙니다. 유상증자 공시는 자금 확보 목적이지만 주식 희석으로 인해 주가에 부정적일 수 있습니다. 공시의 맥락과 규모를 정확히 파악하는 것이 중요합니다.</p>
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
