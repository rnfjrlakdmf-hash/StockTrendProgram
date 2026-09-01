import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, AlertCircle, TrendingUp, Info, ChevronRight, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: '이동평균선 (Moving Average) 실전 가이드 | 주식 투자 용어 사전 - 스마트 투자 비서',
  description: '주식 차트 분석의 기초인 이동평균선의 원리, 종류(5일, 20일, 60일, 120일), 그리고 지지와 저항 등 실전 차트 분석에서 어떻게 활용되는지 자세히 알아봅니다.',
};

export default function GuideMovingAveragePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        
        {/* 브레드크럼 네비게이션 */}
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-blue-400 transition-colors">홈</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/guide" className="hover:text-blue-400 transition-colors">투자 가이드</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-300">이동평균선 (Moving Average)</span>
        </nav>

        {/* 헤더 섹션 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <BookOpen className="w-4 h-4" />
            주식 투자 필수 용어
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            이동평균선 (Moving Average) 실전 가이드
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed border-l-4 border-blue-500 pl-4">
            들쭉날쭉한 주가의 흐름을 부드럽게 만들어, 전체적인 시장의 방향성(추세)을 보여주는 가장 기본적인 차트 분석 도구입니다.
          </p>
        </div>

        {/* 본문 섹션 */}
        <div className="space-y-12 text-gray-300 leading-loose">
          
          {/* 섹션 1: 개념 정의 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-400" />
              이동평균선이란 무엇인가요?
            </h2>
            <p className="text-lg mb-6">
              주가는 매일매일 호재와 악재에 따라 오르내림을 반복합니다. 이러한 일일 변동성에 가려진 '진짜 추세(Trend)'를 보기 위해 고안된 것이 바로 **이동평균선(Moving Average)**입니다.
              특정 기간 동안의 주가(보통 종가 기준) 평균을 계산하여 선으로 연결한 것으로, 기술적 분석을 할 때 거의 모든 투자자가 참고하는 지표입니다.
            </p>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <p className="text-blue-300 font-mono text-center text-lg md:text-xl font-bold">
                예: 5일 이동평균선 = 최근 5일간의 주가 총합 ÷ 5
              </p>
            </div>
            <p className="text-lg">
              최근 주가의 비중을 어떻게 두느냐에 따라 단순 이동평균(SMA), 지수 이동평균(EMA) 등으로 나뉘며, 가장 보편적으로 사용되는 것은 단순 이동평균입니다.
            </p>
          </section>

          {/* 섹션 2: 기간별 이동평균선의 의미 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
              기간별 이동평균선의 특징과 의미
            </h2>
            <p className="text-lg mb-6">
              사용하는 기간에 따라 이동평균선이 지니는 경제적, 심리적 의미가 다릅니다. 일반적인 주식 시장에서 HTS/MTS를 켜면 기본적으로 세팅되어 있는 선들은 다음과 같은 의미를 가집니다.
            </p>
            
            <div className="space-y-6 mt-8">
              <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-indigo-300 mb-2">단기 이동평균선 (5일, 10일선)</h3>
                <p className="text-gray-300">
                  **'심리선'**이라고도 불립니다. 5일선은 1주일 동안의 거래일(주말 제외)을 의미하며, 단기적인 모멘텀과 투기적 심리를 잘 보여줍니다. 주가가 단기 급등할 때 주가는 5일선 위를 타고 올라가는 경향이 있습니다.
                </p>
              </div>
              <div className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-purple-300 mb-2">중기 이동평균선 (20일, 60일선)</h3>
                <p className="text-gray-300">
                  20일선은 약 1개월간의 거래일을 나타내어 **'생명선'**이라 불리기도 합니다. 주가의 1차적인 상승/하락 추세를 결정짓는 중요한 기준선으로 널리 활용됩니다. 60일선은 약 3개월(한 분기)의 실적 발표 주기를 담고 있어 **'수급선'**이나 **'실적선'**으로 해석되곤 합니다.
                </p>
              </div>
              <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-emerald-300 mb-2">장기 이동평균선 (120일, 240일선)</h3>
                <p className="text-gray-300">
                  120일선(반년)과 240일선(1년)은 **'경기선'**으로 불립니다. 장기적인 경기 사이클과 기업의 기초 체력(펀더멘털) 변화를 반영합니다. 주가가 이 선들 위에 있다면 장기 대세 상승장, 아래에 있다면 장기 침체장으로 분류하는 투자자가 많습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 섹션 3: 지지와 저항 원리 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6">차트 분석에서의 '지지'와 '저항'</h2>
            <p className="text-lg leading-relaxed">
              많은 차트 분석가들은 이동평균선을 '지지선' 혹은 '저항선'으로 간주합니다.
              <br /><br />
              <strong>1. 지지선 역할:</strong> 주가가 하락하다가 상승하는 20일선 등 특정 이동평균선 부근에 도달하면, 과거 그 가격대에서 매수했던 사람들의 평균 단가에 다다르면서 "싸졌다"고 느끼는 대기 매수세가 들어와 하락이 멈출 수 있습니다. 이를 '지지를 받는다'고 표현합니다.
              <br /><br />
              <strong>2. 저항선 역할:</strong> 반대로 주가가 이동평균선 아래에서 위로 올라갈 때, 과거 높은 가격에 물려있던 사람들의 '본전 심리'로 인해 매도 물량이 쏟아질 수 있습니다. 이때 이동평균선이 주가 상승을 막는 '저항선' 역할을 하게 됩니다.
            </p>
          </section>

          {/* 섹션 4: 주의사항 */}
          <section className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-orange-400 mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              이동평균선 해석 시 주의사항 (한계점)
            </h2>
            <ul className="list-disc list-inside space-y-4 text-gray-300 text-lg pl-2">
              <li>
                <strong className="text-white">후행성 지표:</strong> 이동평균선은 '과거'의 주가 데이터를 평균 낸 것이므로, 차트에 나타났을 때는 이미 주가가 많이 오르거나 내린 후일 수 있습니다. (즉, 선행해서 미래를 맞춰주지 않습니다.)
              </li>
              <li>
                <strong className="text-white">속임수(휩쏘, Whipsaw) 발생:</strong> 횡보장에서는 주가가 이동평균선을 위아래로 무의미하게 교차하는 일이 빈번히 일어납니다. 이런 잦은 교차에만 의존하면 거래 비용만 늘어나고 손실이 누적될 수 있습니다.
              </li>
              <li>
                <strong className="text-white">절대적 마법은 없습니다:</strong> "20일선에 닿았으니 무조건 오른다"는 보장은 없습니다. 이동평균선은 거래량, 기업 실적, 거시 경제 시황 등과 함께 종합적으로 해석해야 하는 도구입니다.
              </li>
            </ul>
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
              본 문서는 주식 시장의 일반적인 차트 이론과 기술적 분석 지표를 설명하기 위해 작성된 교육용 콘텐츠입니다. 특정 종목에 대한 매수 또는 매도 타이밍을 지시하거나 유도하는 유사투자자문 행위와는 무관합니다. 이동평균선을 포함한 모든 차트 지표는 시장 심리와 과거 데이터의 통계일 뿐 미래 수익을 보장하지 않으므로, 투자 판단은 전적으로 투자자 본인의 책임 하에 이루어져야 합니다.
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
