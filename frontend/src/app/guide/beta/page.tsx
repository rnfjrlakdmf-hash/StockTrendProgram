import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '베타 (Beta) 완벽 가이드 | 주식 투자 용어 사전 - StockTrend',
  description: '시장 대비 개별 종목의 변동성을 나타내는 위험 측정 지표. 주식 초보자도 쉽게 이해할 수 있는 베타 (Beta) 완벽 가이드.',
  keywords: ['베타 (Beta)', '주식 용어', '주식 투자', '주식 기초', 'StockTrend'],
};

export default function GuideBetaPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-300">홈</Link>
          <span>/</span>
          <Link href="/guide" className="hover:text-gray-300">투자 가이드</Link>
          <span>/</span>
          <span className="text-gray-300">베타 (Beta)</span>
        </nav>
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            주식 투자 용어 가이드
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">베타 (Beta)</h1>
          <p className="text-xl text-gray-400 leading-relaxed">시장 대비 개별 종목의 변동성을 나타내는 위험 측정 지표</p>
        </div>
        <div className="space-y-10 text-gray-300 leading-relaxed">
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">베타 (Beta)이란 무엇인가?</h2>
            <p className="text-lg leading-relaxed">베타(β)는 특정 종목의 주가가 시장 전체(예: 코스피 200) 움직임에 얼마나 민감하게 반응하는지를 나타내는 지표입니다. β=1이면 시장과 같은 방향으로 같은 폭으로 움직이고, β>1이면 더 크게 움직이며, β<1이면 더 작게 움직입니다. β<0이면 시장과 반대 방향으로 움직이는 경향이 있습니다.</p>
          </section>
          <section className="bg-indigo-900/20 border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">실전 예시</h2>
            <p className="text-lg leading-relaxed">베타가 1.5인 코스닥 바이오 종목은 코스피가 10% 오를 때 15% 오르고, 10% 내릴 때 15% 내리는 경향이 있습니다. 반면 베타가 0.5인 유틸리티 주식은 변동폭이 작아 안정적인 경향이 있습니다.</p>
          </section>
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">투자자 주의사항</h2>
            <p className="leading-relaxed">베타는 과거 데이터 기반으로 산출되므로 미래의 변동성을 완벽하게 예측하지 못합니다. 또한 개별 기업의 고유 리스크(바이오 임상 결과, 대규모 소송 등 이벤트 리스크)는 베타에 반영되지 않습니다.</p>
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
