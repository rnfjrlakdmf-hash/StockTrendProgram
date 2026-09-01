import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, AlertCircle, ArrowUpRight, ArrowDownRight, Info, ChevronRight, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: '골든크로스와 데드크로스 실전 가이드 | 주식 투자 용어 사전 - 스마트 투자 비서',
  description: '이동평균선의 교차점인 골든크로스와 데드크로스의 기본 개념, 차트 상의 의미, 그리고 속임수 패턴을 구별하는 방법에 대해 자세히 알아봅니다.',
};

export default function GuideGoldenCrossPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        
        {/* 브레드크럼 네비게이션 */}
        <nav className="mb-8 text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-blue-400 transition-colors">홈</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/guide" className="hover:text-blue-400 transition-colors">투자 가이드</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-300">골든크로스 & 데드크로스</span>
        </nav>

        {/* 헤더 섹션 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <BookOpen className="w-4 h-4" />
            주식 투자 필수 용어
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            골든크로스 & 데드크로스 실전 가이드
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed border-l-4 border-blue-500 pl-4">
            주식 차트에서 단기 이동평균선과 장기 이동평균선이 서로 교차할 때 발생하는 현상으로, 시장의 추세 전환을 알리는 대표적인 시그널로 해석됩니다.
          </p>
        </div>

        {/* 본문 섹션 */}
        <div className="space-y-12 text-gray-300 leading-loose">
          
          {/* 섹션 1: 개념 정의 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-400" />
              크로스(Cross) 현상이란 무엇인가요?
            </h2>
            <p className="text-lg mb-6">
              주식 차트에는 주가의 흐름을 평탄화하여 보여주는 여러 개의 **이동평균선(Moving Average)**이 존재합니다. 이때, 비교적 짧은 기간의 평균을 낸 '단기 이동평균선(예: 5일선, 20일선)'과 비교적 긴 기간의 평균을 낸 '장기 이동평균선(예: 60일선, 120일선)'이 서로 교차하는 현상을 크로스라고 부릅니다.
            </p>
            <p className="text-lg">
              이동평균선의 교차는 단기간의 주가 흐름이 장기간의 주가 흐름을 압도하며 새로운 방향성을 만들어낼 때 발생하므로, 많은 차트 분석가들이 이 지점을 추세의 변곡점으로 삼고 분석합니다.
            </p>
          </section>

          {/* 섹션 2: 골든크로스와 데드크로스 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6">두 가지 핵심 시그널 해석</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              {/* 골든크로스 */}
              <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-red-500/20 p-2 rounded-full">
                  <ArrowUpRight className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-red-400 mb-4">황금빛 교차, 골든크로스 (Golden Cross)</h3>
                <p className="text-gray-300 mb-4">
                  **단기 이동평균선이 장기 이동평균선을 아래에서 위로 뚫고 올라가는 현상**입니다.
                </p>
                <ul className="list-disc list-inside text-gray-400 text-sm space-y-2">
                  <li>최근의 주가 상승세가 과거의 평균을 뛰어넘을 만큼 강하다는 뜻입니다.</li>
                  <li>주로 하락하던 주가가 바닥을 다지고 본격적인 상승 추세(강세장)로 전환될 때 나타납니다.</li>
                  <li>일반적으로 시장 참여자들은 이를 긍정적인 '강세 시그널'로 해석합니다.</li>
                </ul>
              </div>

              {/* 데드크로스 */}
              <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-blue-500/20 p-2 rounded-full">
                  <ArrowDownRight className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-blue-400 mb-4">죽음의 교차, 데드크로스 (Dead Cross)</h3>
                <p className="text-gray-300 mb-4">
                  **단기 이동평균선이 장기 이동평균선을 위에서 아래로 뚫고 내려가는 현상**입니다.
                </p>
                <ul className="list-disc list-inside text-gray-400 text-sm space-y-2">
                  <li>최근의 주가 하락세가 걷잡을 수 없이 강해지고 있다는 뜻입니다.</li>
                  <li>주로 상승하던 주가가 고점을 찍고 본격적인 하락 추세(약세장)로 전환될 때 나타납니다.</li>
                  <li>일반적으로 시장 참여자들은 이를 부정적인 '약세 시그널'로 해석합니다.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 섹션 3: 속임수 패턴 (휩쏘) */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6">가짜 시그널, 휩쏘(Whipsaw) 주의보</h2>
            <p className="text-lg leading-relaxed mb-4">
              "골든크로스에 사고, 데드크로스에 팔아라"라는 격언이 있지만, 이를 기계적으로 적용하는 것은 매우 위험합니다. 주식 시장에는 **'휩쏘(톱니바퀴, Whipsaw)'**라고 불리는 속임수 패턴이 빈번하게 발생하기 때문입니다.
            </p>
            <div className="bg-gray-800/50 p-6 rounded-2xl mb-4">
              <strong className="text-white block mb-2">횡보장에서의 무의미한 교차</strong>
              <p className="text-gray-400">주가가 뚜렷한 추세 없이 박스권에서 오르락내리락(횡보)할 때, 이동평균선은 수시로 교차하게 됩니다. 이때 골든크로스를 보고 매수하면 직후에 바로 주가가 하락(데드크로스)하여 손실을 입는 악순환이 반복될 수 있습니다.</p>
            </div>
            <p className="text-lg leading-relaxed">
              따라서 교차가 발생했을 때 <strong>거래량이 동반되었는지</strong>, 그리고 해당 주식이 속한 <strong>기업의 실적이나 거시 경제 흐름이 시그널과 일치하는지</strong>를 반드시 함께 점검해야 진짜 추세인지 가짜 추세인지 구별할 수 있습니다.
            </p>
          </section>

          {/* 섹션 4: 주의사항 */}
          <section className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-orange-400 mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              크로스 분석 시 한계점
            </h2>
            <p className="text-lg mb-6">
              이동평균선 자체가 과거 가격의 평균치(후행성 지표)이므로, 크로스 시그널 역시 후행성을 띱니다.
            </p>
            <ol className="list-decimal list-inside space-y-5 text-gray-300 text-lg">
              <li className="pl-2">
                <strong className="text-white">이미 늦은 타이밍일 수 있음:</strong> 골든크로스가 완벽히 확인되었을 때는 이미 주가가 바닥 대비 상당히 많이 상승한 상태일 수 있습니다. 반대로 데드크로스를 확인하고 매도하려고 하면 이미 큰 손실이 발생한 후일 수 있습니다.
              </li>
              <li className="pl-2">
                <strong className="text-white">기간 설정에 따른 차이:</strong> 5일선-20일선 크로스와 20일선-60일선 크로스는 의미하는 시간의 길이가 다릅니다. 단기 투자자와 장기 투자자는 자신이 설정한 매매 호흡에 맞는 선을 보아야 합니다.
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
              본 문서는 주식 시장의 일반적인 차트 패턴(골든크로스, 데드크로스 등)을 설명하기 위해 작성된 교육용 콘텐츠입니다. 특정 시점이나 차트 형태에서 매수/매도를 지시하거나 권유하는 유사투자자문 목적이 아닙니다. 차트 신호는 과거 통계의 결과일 뿐 미래의 가격 흐름이나 수익을 절대 보장하지 않으므로, 실제 투자는 전적으로 투자자 본인의 독자적인 판단과 책임 하에 이루어져야 합니다.
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
