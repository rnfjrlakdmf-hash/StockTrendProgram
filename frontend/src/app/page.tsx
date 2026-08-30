import { Metadata } from 'next';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { BookOpen, Newspaper, ChevronRight, TrendingUp, Bell, Shield, BarChart3, HelpCircle, Sparkles, ArrowUpRight } from 'lucide-react';

export const metadata: Metadata = {
  title: '스마트 투자 비서 | AI 주식 분석 및 무료 알림',
  description: '인공지능이 분석하는 주식 브리핑과 실시간 주가 급등락, 속보 알림 서비스를 무료로 만나보세요.',
  alternates: {
    canonical: '/',
  },
};

const INVESTMENT_GUIDES = [
  { href: '/guide/per', title: 'PER(주가수익비율)', desc: '적정 PER 기준과 실전 가치평가' },
  { href: '/guide/moving-average', title: '이동평균선(MA)', desc: '골든·데드크로스 매매 타이밍' },
  { href: '/guide/rsi', title: 'RSI 지표 분석', desc: '과매수·과매도 반등 타점 포착' },
  { href: '/guide/dividend', title: '배당주 투자 가이드', desc: '안정적 월배당 포트폴리오' },
  { href: '/guide/macd', title: 'MACD 지표 해부', desc: '추세 전환 및 실전 매수·매도' },
  { href: '/guide/short-selling', title: '공매도 & 숏스퀴즈', desc: '외인·기관 수급 구조의 이해' },
];

const FAQS = [
  {
    q: 'AI 주식 분석은 어떻게 작동하나요?',
    a: '코스피·코스닥·나스닥 데이터를 실시간 수집하여 수급, 기술적 지표(RSI/MACD), 재무제표(PER/PBR)를 종합 분석한 리포트를 제공합니다.',
  },
  {
    q: '실시간 주가 알림은 무료인가요?',
    a: '네, 100% 무료입니다. 관심 종목의 급등락, DART 공시 속보, 실적 발표 일정을 스마트폰 푸시 알림으로 즉시 전달합니다.',
  },
  {
    q: '초보 투자자도 활용할 수 있나요?',
    a: '물론입니다. 46대 필수 주식 가이드와 매일 업데이트되는 투자 칼럼을 통해 누구나 쉽게 차트와 수급을 공부할 수 있습니다.',
  },
  {
    q: '외국인·기관 수급 분석이란 무엇인가요?',
    a: '거대 자본(스마트 머니)의 순매수·순매도 흐름을 추적하여 시장의 주도 섹터와 유망 테마를 파악하는 정량적 분석입니다.',
  },
];

export default async function Home() {
  return (
    <>
      {/* 1. 클라이언트 인터랙티브 대시보드 */}
      <HomeClient />

      {/* 2. 하단 서비스 가이드 & 신뢰성 섹션 (깔끔하고 눈이 편안한 모던 레이아웃) */}
      <div className="bg-gradient-to-b from-[#09090b] to-[#040406] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 space-y-16">

          {/* 서비스 4대 핵심 역량 (세련된 미니 카드) */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" /> 스마트 투자 비서 핵심 기능
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  국내외 증시 실시간 수급과 공시 팩트를 한눈에 파악하세요.
                </p>
              </div>
              <Link 
                href="/about" 
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0"
              >
                서비스 소개 자세히 보기 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Bell, color: 'text-blue-400', bg: 'border-blue-500/20 bg-blue-500/5', title: '실시간 수급 알림', desc: '외인·기관 순매수 및 DART 공시 속보 즉시 전송' },
                { icon: BarChart3, color: 'text-purple-400', bg: 'border-purple-500/20 bg-purple-500/5', title: 'AI 퀀트 분석', desc: 'RSI·MACD·재무제표 종합 정량 지표 산출' },
                { icon: TrendingUp, color: 'text-emerald-400', bg: 'border-emerald-500/20 bg-emerald-500/5', title: '종목 상세 브리핑', desc: '개별 기업의 밸류에이션 및 주도 테마 맵 제공' },
                { icon: Shield, color: 'text-amber-400', bg: 'border-amber-500/20 bg-amber-500/5', title: '위험 감지 지표', desc: '대차잔고·신용비율 기반 변동성 사전 경보' },
              ].map(({ icon: Icon, color, bg, title, desc }) => (
                <div key={title} className={`p-5 rounded-2xl border ${bg} transition-all hover:bg-white/[0.04]`}>
                  <Icon className={`w-6 h-6 ${color} mb-3`} />
                  <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 필수 투자 가이드 (깔끔한 6대 칩 그리드) */}
          <section>
            <div className="flex items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" /> 추천 주식 투자 가이드
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  초보 투자자부터 실전 매매까지 필요한 핵심 지식을 확인하세요.
                </p>
              </div>
              <Link 
                href="/guide" 
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0"
              >
                전체 46개 가이드 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {INVESTMENT_GUIDES.map(({ href, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all flex items-center justify-between group"
                >
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{title}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </section>

          {/* 자주 묻는 질문 (FAQ) */}
          <section>
            <h2 className="text-xl md:text-2xl font-black text-white mb-6 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" /> 자주 묻는 질문 (FAQ)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FAQS.map(({ q, a }) => (
                <div key={q} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <h3 className="text-white font-bold text-sm flex items-start gap-2">
                    <span className="text-amber-400 font-mono">Q.</span> {q}
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed pl-5">
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 투자 면책 조항 & 공식 링크 푸터 */}
          <footer className="border-t border-white/10 pt-10 space-y-5 text-center sm:text-left">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <h3 className="text-white font-bold text-xs mb-2 flex items-center justify-center sm:justify-start gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" /> 투자 유의사항 및 면책 공지
              </h3>
              <p className="text-gray-500 text-[11px] leading-relaxed">
                스마트 투자 비서에서 제공하는 모든 정보는 투자 참고용 데이터이며, 투자 권유 또는 자문이 아닙니다. 
                제공되는 정보의 정확성이나 수익을 보장하지 않으며, 모든 투자 결정과 손익의 최종 책임은 투자자 본인에게 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-500 pt-2">
              <Link href="/about" className="hover:text-gray-300 transition-colors">서비스 소개</Link>
              <Link href="/guide" className="hover:text-gray-300 transition-colors">투자 가이드</Link>
              <Link href="/blog" className="hover:text-gray-300 transition-colors">투자 칼럼</Link>
              <Link href="/privacy-policy" className="hover:text-gray-300 transition-colors">개인정보처리방침</Link>
              <Link href="/terms" className="hover:text-gray-300 transition-colors">이용약관</Link>
              <Link href="/disclaimer" className="hover:text-gray-300 transition-colors">면책조항</Link>
              <Link href="/contact" className="hover:text-gray-300 transition-colors">문의하기</Link>
            </div>

            <p className="text-center text-gray-600 text-[11px]">
              © 2026 스마트 투자 비서(StockTrend). All rights reserved.
            </p>
          </footer>

        </div>
      </div>
    </>
  );
}
