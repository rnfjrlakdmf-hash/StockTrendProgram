import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '배당락일 (Ex-Dividend Date) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '이 날 이후 매수하면 배당권을 받을 수 없는 기준 날짜. 주식 초보자도 쉽게 이해할 수 있는 배당락일 (Ex-Dividend Date) 완벽 가이드.',
  keywords: ['배당락일 (Ex-Dividend Date)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideExDividendDatePage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">배당락일 (Ex-Dividend Date)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">배당락일 (Ex-Dividend Date)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">이 날 이후 매수하면 배당권을 받을 수 없는 기준 날짜</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">배당락일 (Ex-Dividend Date)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">배당락일은 배당을 받을 권리가 없어지는(락) 날입니다. 배당을 받으려면 배당락일 하루 전 거래일까지 주식을 보유하고 있어야 합니다. 한국 주식은 T+2 결제 방식이므로, 배당락일 2거래일 전까지 매수를 완료해야 배당 기준일에 주주로 등록됩니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">12월 31일이 배당 기준일(배당락일: 12월 30일)이라면, 12월 28일(금요일)까지 주식을 매수해야 배당금을 받을 수 있습니다. 배당락일 당일에는 배당금만큼 주가가 하락하는 배당락 현상이 나타납니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">배당락일에만 초점을 맞춰 배당 수익을 노리는 단기 전략은 주가 하락분과 거래 비용을 고려하면 수익이 생각보다 크지 않을 수 있습니다. 장기적인 배당 투자 관점으로 접근하는 것이 바람직합니다.</p>
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
