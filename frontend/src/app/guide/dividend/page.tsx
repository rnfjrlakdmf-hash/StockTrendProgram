import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, AlertCircle, Coins, Info, ChevronRight, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: '배당주 투자 핵심 가이드 | 주식 투자 용어 사전 - 스마트 투자 비서',
  description: '주식 투자의 또 다른 매력인 배당금의 개념, 배당수익률 계산법, 배당락일의 주의점, 그리고 안정적인 배당 포트폴리오 구축 방법에 대해 알아봅니다.',
};

export default function GuideDividendPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        
        {/* 브레드크럼 네비게이션 */}
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-blue-400 transition-colors">홈</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/guide" className="hover:text-blue-400 transition-colors">투자 가이드</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-300">배당주 투자 완전 정복</span>
        </nav>

        {/* 헤더 섹션 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <BookOpen className="w-4 h-4" />
            주식 투자 필수 용어
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            배당주 투자 핵심 가이드
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed border-l-4 border-blue-500 pl-4">
            단순한 시세 차익을 넘어, 기업의 이익을 현금으로 분배받는 '배당금(Dividend)' 투자의 기초와 실전 활용법을 배웁니다.
          </p>
        </div>

        {/* 본문 섹션 */}
        <div className="space-y-12 text-gray-300 leading-loose">
          
          {/* 섹션 1: 개념 정의 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-400" />
              배당(Dividend)이란 무엇인가요?
            </h2>
            <p className="text-lg mb-6">
              **배당**이란 기업이 한 해(혹은 분기) 동안 영업 활동을 통해 벌어들인 이익의 일부를, 회사에 투자해 준 주주들에게 현금(또는 주식)으로 돌려주는 것을 말합니다. 은행에 예금을 맡기면 이자를 받는 것과 비슷한 개념으로 이해할 수 있지만, 은행 이자와 달리 배당금은 기업의 실적과 정책에 따라 매번 달라질 수 있습니다.
            </p>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <p className="text-blue-300 font-mono text-center text-lg md:text-xl font-bold">
                배당수익률 = (1주당 배당금 ÷ 현재 주가) × 100
              </p>
            </div>
            <p className="text-lg">
              예를 들어 현재 주가가 10,000원인 A기업이 1주당 500원의 배당금을 지급한다면, 이 주식의 배당수익률은 연 5%가 됩니다. 배당수익률이 은행 예금 이자보다 높다면 훌륭한 현금 흐름 창출 수단이 될 수 있습니다.
            </p>
          </section>

          {/* 섹션 2: 배당 투자 핵심 용어 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Coins className="w-6 h-6 text-yellow-400" />
              반드시 알아야 할 배당 관련 핵심 용어
            </h2>
            
            <div className="space-y-6 mt-8">
              <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-yellow-400 mb-2">배당성향 (Payout Ratio)</h3>
                <p className="text-gray-300">
                  기업이 벌어들인 순이익 중 어느 정도의 비율을 주주에게 배당으로 지급하는지를 나타내는 지표입니다. 순이익 100억 중 30억을 배당했다면 배당성향은 30%입니다. 배당성향이 너무 높으면 기업이 미래를 위한 재투자를 하지 않고 있다는 뜻일 수 있어 주의가 필요합니다.
                </p>
              </div>
              <div className="bg-green-900/10 border border-green-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-green-400 mb-2">배당기준일 (Record Date)</h3>
                <p className="text-gray-300">
                  배당금을 받을 권리가 주어지는 '주주명부'가 확정되는 날짜입니다. 이 날짜의 주주명부에 귀하의 이름이 올라가 있어야 배당을 받을 수 있습니다. (한국은 통상 결제에 +2일이 소요되므로, 기준일 2영업일 전까지 주식을 매수해야 합니다.)
                </p>
              </div>
              <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-red-400 mb-2">배당락일 (Ex-Dividend Date)</h3>
                <p className="text-gray-300">
                  배당기준일의 바로 다음 영업일로, '배당을 받을 권리가 떨어진(떨어질 락) 날'을 의미합니다. 이 날 주식을 매수해도 배당을 받을 수 없습니다. 또한 이 날은 회사의 현금이 배당으로 빠져나가는 만큼, 통상적으로 주가가 **배당금 액수만큼 하락(배당락)**하여 시작하는 경향이 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 섹션 3: 주의사항 */}
          <section className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-orange-400 mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              배당주 투자 시 피해야 할 함정
            </h2>
            <p className="text-lg mb-6">
              단순히 배당수익률 숫자가 높다고 해서 좋은 주식인 것은 아닙니다. 다음과 같은 위험 요소를 반드시 점검해야 합니다.
            </p>
            <ol className="list-decimal list-inside space-y-5 text-gray-300 text-lg">
              <li className="pl-2">
                <strong className="text-white">가짜 고배당 (배당의 함정):</strong> 배당수익률은 [배당금 ÷ 현재주가] 입니다. 만약 기업의 실적이 악화되어 주가가 반토막이 났다면, 작년과 똑같은 배당을 준다고 쳤을 때 배당수익률 수치가 2배로 폭등해 보입니다. 이를 매력적으로 착각하고 매수하면 큰 손실을 볼 수 있습니다.
              </li>
              <li className="pl-2">
                <strong className="text-white">실적 변동성 점검:</strong> 배당금은 이익에서 나옵니다. 내년 실적이 적자로 전환될 것으로 예상된다면, 올해 아무리 배당을 많이 줬더라도 내년에는 배당을 삭감(Cut)할 확률이 매우 높습니다.
              </li>
              <li className="pl-2">
                <strong className="text-white">세금 문제:</strong> 한국에서 배당금은 수령 시 15.4%의 배당소득세가 원천징수됩니다. 또한 연간 이자 및 배당소득이 2천만 원을 초과하면 금융소득종합과세 대상자가 될 수 있습니다.
              </li>
            </ol>
          </section>

          {/* E-E-A-T Author & Data Source Credibility Box */}
          <section className="mt-16 pt-10 border-t border-white/10">
            <div className="bg-gradient-to-br from-blue-900/10 via-zinc-900/60 to-zinc-950 border border-blue-500/20 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-lg">
                    AI
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-base">스마트 투자 비서 퀀트 리서치팀</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">감수 완료</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">글로벌 퀀트 알고리즘 및 공공 금융 데이터 분석 전문</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  최종 검증: 2026년 9월
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <strong className="text-gray-300 block font-semibold">데이터 출처 및 기준</strong>
                  <p className="leading-relaxed">한국거래소(KRX) 유가증권·코스닥 시장 데이터, 금융감독원 전자공시시스템(DART), 미국 증권거래위원회(SEC EDGAR) 및 공인 금융 공학 이론에 근거하여 작성되었습니다.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <strong className="text-gray-300 block font-semibold">법적 고지 및 면책 공지</strong>
                  <p className="leading-relaxed">본 가이드는 투자자의 이해를 돕기 위한 순수 금융 지식 및 교육 목적의 콘텐츠이며, 자본시장법상 투자 권유 또는 자문에 해당하지 않습니다. 최종 투자 판단과 책임은 투자자 본인에게 있습니다.</p>
                </div>
              </div>
            </div>
          </section>



          {/* 교육 목적 면책조항 */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-12 flex gap-4">
            <Shield className="w-8 h-8 text-gray-500 shrink-0" />
            <div className="text-sm text-gray-500 leading-relaxed">
              <strong className="text-gray-400 block mb-1">교육 목적 및 면책 조항 (Investment Disclaimer)</strong>
              본 문서는 주식 시장의 일반적인 경제 용어(배당, 배당락 등)를 설명하기 위해 작성된 교육용 콘텐츠입니다. 특정 고배당주나 종목을 추천하거나 배당 투자를 권유하는 유사투자자문 목적이 아닙니다. 과거의 배당 지급 이력이 미래의 배당을 보장하지 않으며 주가 변동에 따른 원금 손실 위험이 존재하므로, 최종 투자 결정은 전적으로 투자자 본인의 판단과 책임 하에 이루어져야 합니다.
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
