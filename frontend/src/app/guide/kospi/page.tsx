import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '코스피 (KOSPI) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '한국거래소 상장 대형 우량기업 전체의 시가총액으로 산출하는 한국 대표 주가지수. 주식 초보자도 쉽게 이해할 수 있는 코스피 (KOSPI) 완벽 가이드.',
  keywords: ['코스피 (KOSPI)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideKospiPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">코스피 (KOSPI)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">코스피 (KOSPI)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">한국거래소 상장 대형 우량기업 전체의 시가총액으로 산출하는 한국 대표 주가지수</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">코스피 (KOSPI)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">코스피(Korea Composite Stock Price Index)는 1980년 1월 4일을 기준 시점(100)으로 하여 현재 유가증권시장에 상장된 모든 기업의 시가총액 변동을 지수화한 것입니다. 삼성전자, LG에너지솔루션, SK하이닉스 등 국내 대표 대형주들이 코스피에 상장되어 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">코스피가 2,500이라는 것은 1980년 기준 시점 대비 시가총액이 25배 증가했음을 의미합니다. 외국인 자금 유입, 환율, 미국 증시 동향, 경기 사이클 등이 코스피 방향에 큰 영향을 미칩니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">코스피는 삼성전자 비중이 높아 삼성전자 주가의 영향을 크게 받습니다. 삼성전자 하나의 주가 변동이 코스피 전체를 움직일 수 있으므로, 코스피 투자 시 삼성전자를 비롯한 시가총액 상위 종목들의 동향을 함께 모니터링하는 것이 좋습니다.</p>
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
