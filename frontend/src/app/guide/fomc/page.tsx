import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FOMC (연방공개시장위원회) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '미국 연방준비제도의 기준금리 결정기구로 전 세계 금융시장에 가장 큰 영향력을 가진 회의체. 주식 초보자도 쉽게 이해할 수 있는 FOMC (연방공개시장위원회) 완벽 가이드.',
  keywords: ['FOMC (연방공개시장위원회)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
}};

export default function GuideFomcPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">FOMC (연방공개시장위원회)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">FOMC (연방공개시장위원회)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">미국 연방준비제도의 기준금리 결정기구로 전 세계 금융시장에 가장 큰 영향력을 가진 회의체</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">FOMC (연방공개시장위원회)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">FOMC(Federal Open Market Committee)는 미국 연방준비제도(Fed)의 통화정책을 결정하는 핵심 기구입니다. 연 8회 회의를 개최하며, 기준금리(Federal Funds Rate) 인상·동결·인하를 결정합니다. Fed 의장의 기자회견 발언은 전 세계 금융 시장을 즉각 움직이는 힘을 가집니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">2022년~2023년 FOMC는 인플레이션 억제를 위해 11차례에 걸쳐 총 5.25%p 기준금리를 인상했습니다. 이 과정에서 코스피는 2022년에 약 24% 하락했으며, 나스닥은 33% 이상 폭락했습니다. FOMC 회의는 주식·채권·외환 시장에 가장 중요한 이벤트 중 하나입니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">FOMC 결정 이전에 시장은 Fed Watch 도구를 통해 금리 인상·인하 확률을 예측합니다. 예상과 다른 결정이 나오거나 Fed 의장의 발언이 예상보다 매파적·비둘기파적이면 시장에 큰 충격을 줄 수 있습니다.</p>
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
