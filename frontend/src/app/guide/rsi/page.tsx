import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, AlertCircle, BarChart2, Info, ChevronRight, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'RSI (상대강도지수) 실전 가이드 | 주식 투자 용어 사전 - 스마트 투자 비서',
  description: '주가의 과매수 및 과매도 상태를 수치화하여 보여주는 대표적인 모멘텀 지표인 RSI의 기본 개념, 다이버전스, 실전 해석 방법을 배웁니다.',
};

export default function GuideRsiPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        
        {/* 브레드크럼 네비게이션 */}
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-blue-400 transition-colors">홈</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/guide" className="hover:text-blue-400 transition-colors">투자 가이드</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-300">RSI (상대강도지수)</span>
        </nav>

        {/* 헤더 섹션 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <BookOpen className="w-4 h-4" />
            주식 투자 필수 용어
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            RSI (상대강도지수) 실전 가이드
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed border-l-4 border-blue-500 pl-4">
            현재 주가가 단기간에 얼마나 뜨겁게 달아올랐는지(과매수), 혹은 얼마나 차갑게 식었는지(과매도)를 0부터 100 사이의 숫자로 직관적으로 보여주는 모멘텀 지표입니다.
          </p>
        </div>

        {/* 본문 섹션 */}
        <div className="space-y-12 text-gray-300 leading-loose">
          
          {/* 섹션 1: 개념 정의 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-400" />
              RSI (상대강도지수)란 무엇인가요?
            </h2>
            <p className="text-lg mb-6">
              **RSI(Relative Strength Index)**는 1978년 웰스 와일더(J. Welles Wilder)가 개발한 기술적 분석 지표입니다. 특정 기간 동안 주가가 전일 대비 상승한 폭과 하락한 폭의 평균을 계산하여, 현재의 상승 압력과 하락 압력 간의 '상대적인 강도'를 수치화합니다.
            </p>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <p className="text-blue-300 font-mono text-center text-lg md:text-xl font-bold leading-relaxed">
                RSI = 100 - [100 ÷ (1 + (평균 상승폭 ÷ 평균 하락폭))]
                <br/>
                <span className="text-sm text-blue-400/70 block mt-2">* 가장 기본이 되는 기준 기간은 '14일'입니다.</span>
              </p>
            </div>
            <p className="text-lg">
              숫자가 100에 가까워질수록 최근 일정 기간 동안 주가가 오른 날이 많고 상승폭이 컸다는 뜻이며, 반대로 숫자가 0에 가까워질수록 내린 날이 많고 하락폭이 깊었다는 뜻이 됩니다.
            </p>
          </section>

          {/* 섹션 2: 과매수와 과매도 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <BarChart2 className="w-6 h-6 text-indigo-400" />
              기본적인 해석: 과매수와 과매도 구간
            </h2>
            <p className="text-lg mb-6">
              RSI 지표를 활용하는 가장 기본적인 방법은 70과 30이라는 두 개의 수치를 기준으로 시장의 '과열'과 '침체'를 판단하는 것입니다.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-red-400 mb-4">RSI 70 이상: 과매수 (Overbought)</h3>
                <p className="text-gray-300 mb-4">
                  주가가 단기간에 지나치게 많이 올랐음을 의미합니다. 시장이 열광하며 매수세가 극에 달한 상태일 수 있습니다.
                </p>
                <ul className="list-disc list-inside text-gray-400 text-sm space-y-2">
                  <li>차익 실현 매물이 나올 가능성 대비</li>
                  <li>신규 진입에 신중을 기해야 하는 구간으로 해석</li>
                </ul>
              </div>
              <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-blue-400 mb-4">RSI 30 이하: 과매도 (Oversold)</h3>
                <p className="text-gray-300 mb-4">
                  주가가 단기간에 지나치게 많이 하락했음을 의미합니다. 공포 심리로 인해 투매가 일어난 상태일 수 있습니다.
                </p>
                <ul className="list-disc list-inside text-gray-400 text-sm space-y-2">
                  <li>낙폭 과대로 인한 단기 기술적 반등 가능성 시사</li>
                  <li>시장의 관심 밖으로 밀려나 가격 매력도가 높아진 상태</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 섹션 3: 다이버전스 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6">고급 분석: 다이버전스 (Divergence)</h2>
            <p className="text-lg leading-relaxed mb-4">
              차트 고수들이 RSI를 애용하는 가장 큰 이유 중 하나는 바로 <strong>'다이버전스(불일치)'</strong> 현상을 찾기 위함입니다. 주가의 흐름과 보조지표인 RSI의 흐름이 서로 엇갈리는 현상을 말하며, 이는 강력한 <strong>추세 반전의 신호</strong>로 해석됩니다.
            </p>
            <ul className="list-disc list-inside space-y-4 text-gray-300 text-lg pl-2">
              <li>
                <strong className="text-white">상승 다이버전스:</strong> 주가는 이전 저점을 깨고 계속 하락하고 있는데, RSI 지표의 저점은 반대로 높아지는 현상입니다. 하락하는 힘이 소진되고 조만간 상승장으로 턴(Turn)할 가능성이 높다고 분석합니다.
              </li>
              <li>
                <strong className="text-white">하락 다이버전스:</strong> 주가는 계속 고점을 경신하며 오르고 있는데, RSI 지표의 고점은 오히려 낮아지는 현상입니다. 상승 여력이 고갈되어 조만간 가격 조정이 올 수 있음을 경고하는 신호입니다.
              </li>
            </ul>
          </section>

          {/* 섹션 4: 주의사항 */}
          <section className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-orange-400 mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              RSI 지표 활용 시 주의사항 (한계점)
            </h2>
            <p className="text-lg mb-6">
              어떤 훌륭한 지표도 맹신해서는 안 됩니다. RSI 지표 역시 명확한 한계를 지니고 있습니다.
            </p>
            <ol className="list-decimal list-inside space-y-5 text-gray-300 text-lg">
              <li className="pl-2">
                <strong className="text-white">강한 추세장에서는 무용지물:</strong> 만약 주가가 매우 강력한 호재를 동반하여 급등하는 대세 상승장이라면, RSI는 70 이상(심지어 90 이상)에서 수일, 수주간 머무르며 계속 상승할 수 있습니다. 즉, "과매수니까 무조건 떨어진다"고 판단하면 큰 수익을 놓칠 수 있습니다.
              </li>
              <li className="pl-2">
                <strong className="text-white">하락장 폭락의 위험:</strong> 악재가 쏟아지는 패닉 셀 구간에서는 RSI가 30 이하, 10 근처까지 밀려난 후에도 끝없이 주가가 하락할 수 있습니다. "충분히 떨어졌다"는 이유만으로 바닥을 섣불리 예측하는 것은 위험합니다.
              </li>
              <li className="pl-2">
                <strong className="text-white">보조 지표일 뿐:</strong> MACD, 거래량, 그리고 기업의 근본적인 실적 흐름(펀더멘털)과 함께 분석할 때 비로소 가치가 높아지는 '보조 수단'입니다.
              </li>
            </ol>
          </section>

          {/* 교육 목적 면책조항 */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-12 flex gap-4">
            <Shield className="w-8 h-8 text-gray-500 shrink-0" />
            <div className="text-sm text-gray-500 leading-relaxed">
              <strong className="text-gray-400 block mb-1">교육 목적 및 면책 조항 (Investment Disclaimer)</strong>
              본 문서는 주식 시장의 일반적인 경제 용어 및 보조 지표를 설명하기 위해 작성된 교육용 콘텐츠입니다. 특정 주식에 대한 과매수/과매도 여부를 단정 짓거나 매매 시점을 추천하기 위한 유사투자자문 목적이 아닙니다. 소개된 지표는 과거 데이터를 기초로 한 수학적 계산값일 뿐 향후 주가 방향을 보장하지 않으므로, 투자 판단과 책임은 투자자 본인에게 있습니다.
            </div>
          </div>

        </div>

        {/* 하단 네비게이션 */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-4 justify-center text-sm font-semibold">
          <Link href="/guide" className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">
            📚 다른 가이드 보기
          </Link>
          <Link href="/" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors">
            🏠 메인 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
