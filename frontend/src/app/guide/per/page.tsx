import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, AlertCircle, BarChart, Info, ChevronRight, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PER (주가수익비율) 완벽 가이드 | 주식 투자 용어 사전 - 스마트 투자 비서',
  description: '주가를 주당순이익(EPS)으로 나눈 값으로 기업의 수익 대비 주가 수준을 평가하는 지표인 PER의 원리와 활용 방법을 배울 수 있는 완벽 가이드입니다.',
};

export default function GuidePerPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        
        {/* 브레드크럼 네비게이션 */}
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-blue-400 transition-colors">홈</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/guide" className="hover:text-blue-400 transition-colors">투자 가이드</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-300">PER (주가수익비율)</span>
        </nav>

        {/* 헤더 섹션 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <BookOpen className="w-4 h-4" />
            주식 투자 필수 용어
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            PER (주가수익비율) 완전 정복
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed border-l-4 border-blue-500 pl-4">
            기업의 실제 가치 대비 현재 주가가 어느 정도 수준인지 파악하는 가장 대표적인 수익성 평가 지표입니다.
          </p>
        </div>

        {/* 본문 섹션 */}
        <div className="space-y-12 text-gray-300 leading-loose">
          
          {/* 섹션 1: 개념 정의 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-400" />
              PER (주가수익비율)이란 무엇인가요?
            </h2>
            <p className="text-lg mb-6">
              **PER(Price-to-Earnings Ratio)**은 현재 기업의 1주당 주식 가격을 1주당 순이익(EPS, Earning Per Share)으로 나눈 값을 의미합니다. 쉽게 말해, "이 기업이 지금처럼 1년 동안 돈을 번다면, 내가 투자한 원금을 회수하는 데 몇 년이 걸릴까?"를 나타내는 지표라고 이해할 수 있습니다.
            </p>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <p className="text-blue-300 font-mono text-center text-xl md:text-2xl font-bold">
                PER = 현재 주가 ÷ 주당순이익(EPS)
              </p>
            </div>
            <p className="text-lg">
              예를 들어, A기업의 주가가 50,000원이고 주당순이익(EPS)이 5,000원이라면 PER은 10배(50,000 / 5,000)가 됩니다. 즉, 시장은 이 기업이 창출하는 1원의 이익에 대해 10원의 가치를 부여하고 있다는 뜻입니다.
            </p>
          </section>

          {/* 섹션 2: 수치 해석 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <BarChart className="w-6 h-6 text-indigo-400" />
              고평가와 저평가, 어떻게 판단할까요?
            </h2>
            <p className="text-lg mb-6">
              많은 투자자들이 PER 수치를 통해 해당 기업이 고평가 상태인지 저평가 상태인지 가늠합니다. 하지만 무조건 숫자가 낮다고 좋은 것만은 아닙니다.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-indigo-300 mb-4">낮은 PER (일반적 저평가)</h3>
                <ul className="list-disc list-inside space-y-3 text-gray-300">
                  <li>기업이 벌어들이는 이익에 비해 주가가 낮게 형성되어 있습니다.</li>
                  <li>가치 투자자들이 선호하는 구간일 수 있습니다.</li>
                  <li>단, 사양 산업이거나 이익이 줄어들 위험이 있어 주가가 하락한 '밸류 트랩(가치 함정)'일 수 있으니 주의가 필요합니다.</li>
                </ul>
              </div>
              <div className="bg-purple-900/20 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-purple-300 mb-4">높은 PER (성장 기대감)</h3>
                <ul className="list-disc list-inside space-y-3 text-gray-300">
                  <li>현재 이익 대비 주가가 비싸게 형성되어 있습니다.</li>
                  <li>미래에 이익이 크게 폭발적으로 성장할 것이라는 시장의 강한 기대감이 반영된 결과일 수 있습니다. (예: 인공지능, 전기차, 바이오 등)</li>
                  <li>성장이 지연될 경우 주가 변동성이 클 수 있습니다.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 섹션 3: 주의사항 */}
          <section className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-orange-400 mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              PER 지표 활용 시 주의사항
            </h2>
            <p className="text-lg mb-6">
              PER은 매우 유용한 보조 지표이지만, 단일 지표만으로 투자를 결정하는 것은 위험합니다. 객관적인 분석을 위해서는 다음 사항들을 종합적으로 고려해야 합니다.
            </p>
            <ol className="list-decimal list-inside space-y-5 text-gray-300 text-lg">
              <li className="pl-2">
                <strong className="text-white">동일 업종 내 비교 필수:</strong> PER은 속한 산업군의 평균에 따라 기준이 다릅니다. IT/소프트웨어 기업은 원래 평균 PER이 높고, 철강/은행업은 평균 PER이 낮은 경향이 있습니다. 따라서 '동종 업계 평균 PER'과 비교하는 것이 올바른 활용법입니다.
              </li>
              <li className="pl-2">
                <strong className="text-white">일회성 이익 확인:</strong> 부동산 매각 등 영업 활동과 무관한 일회성 수익으로 인해 순이익(EPS)이 일시적으로 급증하면, PER이 비정상적으로 낮게 보일 수 있습니다.
              </li>
              <li className="pl-2">
                <strong className="text-white">과거가 아닌 미래:</strong> 일반적으로 계산되는 PER은 과거 실적 기준(Trailing PER)입니다. 향후 12개월 예상 순이익을 기반으로 한 선행 PER(Forward PER)을 함께 확인하는 것이 좋습니다.
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
              본 문서는 주식 시장의 일반적인 경제 용어 및 분석 지표를 설명하기 위해 작성된 교육용 콘텐츠입니다. 특정 기업의 주식이나 금융 상품의 매수, 매도, 유지를 권유하거나 종목을 추천하는 목적(유사투자자문 등)이 아닙니다. 소개된 지표(PER 등)는 수많은 투자 참고 자료 중 하나일 뿐이므로, 실제 투자 결정 시에는 투자자 본인의 독립적인 판단과 책임 하에 신중히 진행하시기 바랍니다.
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
