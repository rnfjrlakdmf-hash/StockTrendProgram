import { Metadata } from 'next';
import HomeClient from './HomeClient';
import Link from 'next/link';
import { BookOpen, Newspaper, ChevronRight, TrendingUp, Bell, Shield, BarChart3, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: '스마트 투자 비서 | AI 주식 분석 및 무료 알림',
  description: '인공지능이 분석하는 주식 브리핑과 실시간 주가 급등락, 속보 알림 서비스를 무료로 만나보세요.',
  alternates: {
    canonical: '/',
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://13.209.99.170:8000';

async function getLatestPosts() {
  try {
    const [blogRes, theoryRes] = await Promise.all([
      fetch(`${API_URL}/api/blog/posts?page=1&limit=4`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/api/theory/posts?page=1&limit=4`, { next: { revalidate: 3600 } }),
    ]);
    const blog = blogRes.ok ? await blogRes.json() : null;
    const theory = theoryRes.ok ? await theoryRes.json() : null;
    return {
      blogPosts: blog?.posts || blog?.data || [],
      theoryPosts: theory?.posts || theory?.data || [],
    };
  } catch {
    return { blogPosts: [], theoryPosts: [] };
  }
}

const INVESTMENT_GUIDES = [
  { href: '/guide/per', title: 'PER(주가수익비율) 완전 정복', desc: 'PER이 낮을수록 저평가? 업종별 적정 PER 기준과 실전 투자 활용법을 알아봅니다.' },
  { href: '/guide/moving-average', title: '이동평균선(MA) 실전 활용법', desc: '5일선·20일선·60일선의 의미와 골든크로스·데드크로스 매매 전략을 정리합니다.' },
  { href: '/guide/rsi', title: 'RSI 지표로 과매수·과매도 잡기', desc: 'RSI 70 이상 과매수, 30 이하 과매도 구간에서의 매매 전략을 설명합니다.' },
  { href: '/guide/golden-cross', title: '골든크로스 vs 데드크로스', desc: '이동평균선 교차 신호로 매매 타이밍을 포착하는 실전 전략을 배웁니다.' },
  { href: '/guide/dividend', title: '배당주 투자 핵심 가이드', desc: '배당수익률, 배당락일, 배당성향의 의미와 안정적 배당주 포트폴리오 구성법.' },
  { href: '/guide/macd', title: 'MACD 지표 완전 해부', desc: 'MACD, 시그널선, 히스토그램으로 실전 매수·매도 타이밍을 잡는 방법.' },
];

const FAQS = [
  {
    q: 'AI 주식 분석은 어떻게 작동하나요?',
    a: '자연어처리(NLP)와 머신러닝을 통해 코스피·코스닥·나스닥 데이터를 실시간 수집·분석합니다. PER·PBR·RSI 등 기술적·기본적 지표를 종합하여 투자자가 이해하기 쉬운 리포트로 변환해 드립니다.',
  },
  {
    q: '실시간 주가 알림은 무료인가요?',
    a: '네, 완전 무료입니다. 관심 종목을 등록하면 주가 급등락, DART 공시 속보, 실적 발표 일정 등을 스마트폰 잠금화면에 즉시 푸시 알림으로 전달해 드립니다.',
  },
  {
    q: '초보 투자자도 사용할 수 있나요?',
    a: '물론입니다. 매일 차트 스터디(이론방)에서 이동평균선, RSI, MACD 등 주식 기초 이론을 그림과 함께 쉽게 설명합니다. 투자 경험이 없는 초보자도 2주면 기본 차트 분석이 가능합니다.',
  },
  {
    q: '외국인·기관 수급 분석이란 무엇인가요?',
    a: '외국인과 기관 투자자의 순매수·순매도 흐름을 추적하는 분석입니다. 이 수급 데이터는 개인 투자자가 스마트 머니의 방향을 파악하는 데 핵심적인 역할을 합니다.',
  },
];

export default async function Home() {
  const { blogPosts, theoryPosts } = await getLatestPosts();

  return (
    <>
      {/* 클라이언트 인터랙티브 섹션 */}
      <HomeClient />

      {/* 구글봇 전용 정적 콘텐츠 섹션 (서버 컴포넌트 - 항상 표시) */}
      <div className="bg-gradient-to-b from-[#0a0a0f] to-[#050508] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 space-y-20">

          {/* 섹션 1: 서비스 소개 */}
          <section aria-labelledby="service-intro-heading">
            <h2 id="service-intro-heading" className="text-2xl md:text-3xl font-black text-white mb-4">
              스마트 투자 비서란?
            </h2>
            <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-4xl">
              스마트 투자 비서는 개인 투자자가 전문가 수준의 주식 데이터와 분석을 무료로 활용할 수 있도록 만들어진 <strong className="text-white">AI 기반 주식 정보 플랫폼</strong>입니다.
              코스피(KOSPI), 코스닥(KOSDAQ), 미국 나스닥(NASDAQ), S&P 500 등 글로벌 주요 시장의 데이터를 실시간으로 수집하고,
              외국인·기관 수급 흐름, 기술적 지표(RSI, MACD, 볼린저밴드), 재무 지표(PER, PBR, ROE)를 종합하여
              누구나 이해할 수 있는 형태로 제공합니다. 매일 장 마감 후 국내외 증시 시황 요약 리포트를 발행하며,
              관심 종목 급등락 및 DART 공시 속보를 스마트폰 푸시 알림으로 즉시 전달합니다.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Bell, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', title: '실시간 수급 알림', desc: '외국인·기관 순매수 1위, DART 공시, 상한가 속보를 즉시 알림 전송' },
                { icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', title: 'AI 차트 스터디', desc: 'RSI·MACD·이동평균선 등 기초부터 실전 기술 분석 매일 업데이트' },
                { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', title: '종목 상세 분석', desc: '개별 종목의 재무제표, 수급, 공매도 동향을 원스톱으로 확인' },
                { icon: Shield, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', title: '위험 감지 도구', desc: '대차잔고·신용잔고비율·AI 숨은 위험 감지 게이지 무료 제공' },
              ].map(({ icon: Icon, color, bg, title, desc }) => (
                <div key={title} className={`${bg} border rounded-2xl p-5 space-y-2`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                  <p className="text-white font-bold text-sm">{title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 섹션 2: 최신 마켓 리포트 */}
          {blogPosts.length > 0 && (
            <section aria-labelledby="blog-heading">
              <div className="flex items-center justify-between mb-6">
                <h2 id="blog-heading" className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <Newspaper className="w-6 h-6 text-blue-400" />
                  최신 마켓 리포트
                </h2>
                <Link href="/blog" className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors font-semibold">
                  전체 보기 <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blogPosts.slice(0, 4).map((post: any, i: number) => (
                  <Link
                    key={post.id || i}
                    href={`/blog/${post.id}`}
                    className="group p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-blue-500/30 hover:bg-white/[0.06] transition-all"
                  >
                    <p className="text-[11px] text-blue-400 font-bold mb-2 uppercase tracking-wide">마켓 리포트</p>
                    <h3 className="text-white font-bold text-sm leading-snug mb-2 group-hover:text-blue-300 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{post.summary || post.content?.slice(0, 80)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 섹션 3: 매일 차트 스터디 */}
          {theoryPosts.length > 0 && (
            <section aria-labelledby="theory-heading">
              <div className="flex items-center justify-between mb-6">
                <h2 id="theory-heading" className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                  매일 차트 스터디 — 주식이론방
                </h2>
                <Link href="/theory" className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
                  전체 보기 <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {theoryPosts.slice(0, 4).map((post: any, i: number) => (
                  <Link
                    key={post.id || post.slug || i}
                    href={`/theory/${post.id || post.slug}`}
                    className="group p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-indigo-500/30 hover:bg-white/[0.06] transition-all"
                  >
                    <p className="text-[11px] text-indigo-400 font-bold mb-2 uppercase tracking-wide">차트 스터디</p>
                    <h3 className="text-white font-bold text-sm leading-snug mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{post.summary || post.content?.slice(0, 80)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 섹션 4: 투자 가이드 */}
          <section aria-labelledby="guide-heading">
            <h2 id="guide-heading" className="text-xl md:text-2xl font-black text-white mb-2">
              무료 주식 투자 가이드 — 기초부터 실전까지
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              초보 투자자를 위한 필수 용어와 지표를 쉽게 설명합니다. 매일 새로운 이론이 업데이트됩니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {INVESTMENT_GUIDES.map(({ href, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="group p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all block"
                >
                  <h3 className="text-white font-bold text-sm mb-2 group-hover:text-cyan-300 transition-colors">{title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                  <span className="mt-3 flex items-center gap-1 text-xs text-cyan-500 font-semibold">
                    자세히 보기 <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* 섹션 5: 자주 묻는 질문 */}
          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-xl md:text-2xl font-black text-white mb-6 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-yellow-400" />
              자주 묻는 질문
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FAQS.map(({ q, a }) => (
                <div key={q} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-2">
                  <p className="text-white font-bold text-sm">Q. {q}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">A. {a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 섹션 6: 면책조항 & 법적 링크 푸터 */}
          <footer className="border-t border-white/[0.06] pt-10 space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-400" /> 투자 면책 조항 (Investment Disclaimer)
              </h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                본 웹사이트(스마트 투자 비서)에서 제공하는 모든 정보(주가 데이터, AI 분석 결과, 뉴스, 투자 지표, 차트 분석 등)는
                투자 판단을 위한 참고 자료에 불과하며, 금융투자업법상 투자 권유 또는 자문이 아닙니다.
                제공되는 정보의 정확성, 완전성, 적시성을 보장하지 않으며 예기치 않은 오류가 발생할 수 있습니다.
                주식, ETF, 암호화폐 등 모든 금융 상품에 대한 투자 결정의 최종 책임은 투자자 본인에게 있으며,
                당사는 본 플랫폼 정보로 인한 직·간접적 투자 손실에 대해 어떠한 법적 책임도 지지 않습니다.
                투자 전 반드시 본인의 투자 목적, 위험 감수 성향을 점검하고 전문 금융기관의 조언을 구하시기 바랍니다.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-600 pt-2">
              <Link href="/about" className="hover:text-gray-400 transition-colors">서비스 소개</Link>
              <Link href="/contact" className="hover:text-gray-400 transition-colors">문의하기</Link>
              <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">개인정보처리방침</Link>
              <Link href="/terms" className="hover:text-gray-400 transition-colors">이용약관</Link>
              <Link href="/disclaimer" className="hover:text-gray-400 transition-colors">면책조항</Link>
              <Link href="/disclosure/redirect" className="hover:text-gray-400 transition-colors">광고 안내</Link>
            </div>
            <p className="text-center text-gray-700 text-[11px]">
              © 2026 스마트 투자 비서(StockTrend). All rights reserved. · 본 서비스는 금융투자업법상 투자권유 서비스가 아닙니다.
            </p>
          </footer>

        </div>
      </div>
    </>
  );
}
