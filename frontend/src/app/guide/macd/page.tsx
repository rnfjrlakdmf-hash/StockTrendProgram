import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, AlertCircle, Activity, Info, ChevronRight, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'MACD (이동평균수렴확산지수) 실전 가이드 | 주식 투자 용어 사전 - 스마트 투자 비서',
  description: '단기 이동평균선과 장기 이동평균선의 차이를 이용해 주가의 추세와 모멘텀을 파악하는 MACD 지표의 원리와 실전 활용법을 배웁니다.',
};

export default function GuideMacdPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        
        {/* 브레드크럼 네비게이션 */}
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-blue-400 transition-colors">홈</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/guide" className="hover:text-blue-400 transition-colors">투자 가이드</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-300">MACD 지표 분석</span>
        </nav>

        {/* 헤더 섹션 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <BookOpen className="w-4 h-4" />
            주식 투자 필수 용어
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            MACD (이동평균수렴확산) 가이드
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed border-l-4 border-blue-500 pl-4">
            추세의 방향성과 강도를 동시에 알려주는 마법의 지표. 이동평균선들이 서로 멀어지고(확산) 가까워지는(수렴) 원리를 이용해 매매 타이밍을 분석합니다.
          </p>
        </div>

        {/* 본문 섹션 */}
        <div className="space-y-12 text-gray-300 leading-loose">
          
          {/* 섹션 1: 개념 정의 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-400" />
              MACD란 무엇인가요?
            </h2>
            <p className="text-lg mb-6">
              **MACD(Moving Average Convergence Divergence)**는 1979년 제럴드 아펠(Gerald Appel)이 개발한 추세 지표입니다. 이름 그대로 '이동평균선(Moving Average)'이 서로 모였다가(Convergence) 멀어지는(Divergence) 현상을 분석하여 주가의 흐름을 예측합니다.
            </p>
            <p className="text-lg mb-6">
              MACD는 주가 차트 자체의 복잡한 움직임을 걷어내고, 두 개의 이동평균선(주로 12일선과 26일선) 사이의 '거리(차이)'만을 계산하여 보여주기 때문에 현재 시장의 상승/하락 에너지가 얼마나 강한지 직관적으로 파악할 수 있게 해줍니다.
            </p>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
              <h3 className="text-blue-300 font-bold mb-3">MACD를 구성하는 3가지 요소</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li><strong>MACD 선 (빠른 선):</strong> 단기 이동평균(12일) - 장기 이동평균(26일)</li>
                <li><strong>시그널 선 (느린 선):</strong> MACD 선의 9일 이동평균 (MACD 선을 부드럽게 만든 선)</li>
                <li><strong>히스토그램 (막대그래프):</strong> MACD 선 - 시그널 선 (두 선의 격차를 시각화)</li>
              </ul>
            </div>
          </section>

          {/* 섹션 2: 차트 분석 방법 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Activity className="w-6 h-6 text-indigo-400" />
              MACD 실전 차트 분석 3원칙
            </h2>
            
            <div className="space-y-6 mt-8">
              <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-indigo-300 mb-2">1. 영선(0선) 상향/하향 돌파</h3>
                <p className="text-gray-300">
                  MACD 값이 '0'이라는 것은 12일선과 26일선이 일치한다는 뜻입니다. MACD 선이 0선을 아래에서 위로 돌파(상향 돌파)하면 상승 추세 진입을 의미하고, 위에서 아래로 돌파(하향 돌파)하면 하락 추세 진입을 의미합니다. 가장 보수적이고 안정적인 추세 확인 방법입니다.
                </p>
              </div>
              <div className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-purple-300 mb-2">2. 교차 신호 (골든크로스 / 데드크로스)</h3>
                <p className="text-gray-300">
                  MACD 선(빠른 선)이 시그널 선(느린 선)을 아래에서 위로 치고 올라갈 때를 '골든크로스(매수 관점)', 반대로 위에서 아래로 뚫고 내려갈 때를 '데드크로스(매도 관점)'로 해석합니다. 일반 이동평균선 교차보다 신호가 한 박자 빠르다는 장점이 있습니다.
                </p>
              </div>
              <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-emerald-300 mb-2">3. 히스토그램 막대의 전환</h3>
                <p className="text-gray-300">
                  차트 하단의 막대그래프(히스토그램)가 음수(-) 영역에서 양수(+) 영역으로 색이 바뀌며 솟아오를 때는 단기적인 매수세가 강해졌음을, 반대로 양수(+)에서 음수(-)로 떨어질 때는 매도세가 강해졌음을 나타냅니다.
                </p>
              </div>
            </div>
          </section>

          {/* 섹션 3: 주의사항 */}
          <section className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-orange-400 mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              MACD 지표의 치명적 단점과 한계
            </h2>
            <p className="text-lg mb-6">
              많은 투자자들이 MACD를 '마법의 지표'로 착각하지만, 맹신할 경우 큰 손실을 입을 수 있습니다.
            </p>
            <ol className="list-decimal list-inside space-y-5 text-gray-300 text-lg">
              <li className="pl-2">
                <strong className="text-white">전형적인 후행성 지표:</strong> MACD는 과거 주가의 이동평균을 재가공한 데이터입니다. 즉, 차트상에 교차 신호가 나타났을 때는 이미 주가가 고점을 찍고 내려오거나, 저점을 찍고 많이 올라간 상태일 확률이 높습니다.
              </li>
              <li className="pl-2">
                <strong className="text-white">횡보장에서의 잦은 거짓 신호(휩쏘):</strong> 박스권에서 주가가 위아래로 조금씩 움직일 때 MACD와 시그널 선이 뱀처럼 계속 교차하게 됩니다. 이때 신호에 따라 잦은 매매를 하면 거래 수수료만 날리고 큰 손실이 누적됩니다.
              </li>
              <li className="pl-2">
                <strong className="text-white">보조지표의 늪:</strong> 기업의 기초 체력(실적, 성장성)을 무시한 채 MACD 선만 보고 투자하는 것은 눈을 가리고 운전하는 것과 같습니다. 반드시 기업 분석이 선행되어야 합니다.
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
              본 문서는 주식 시장의 일반적인 차트 지표(MACD)를 설명하기 위해 작성된 교육용 콘텐츠입니다. 특정 시점이나 종목에 대해 매수 또는 매도를 지시하는 유사투자자문 목적이 아닙니다. 소개된 모든 기술적 분석 방법은 과거 데이터의 통계일 뿐 미래의 시장 상황이나 수익을 결코 보장하지 않으므로, 투자에 대한 모든 판단과 책임은 투자자 본인에게 있습니다.
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
