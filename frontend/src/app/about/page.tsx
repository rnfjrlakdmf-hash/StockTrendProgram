import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 소개 | AI 주식 비서 - StockTrend",
  description: "StockTrend는 인공지능이 매일 국내외 증시를 분석하여 투자자들에게 맞춤형 시황 브리핑, 주가 알림, 종목 분석 정보를 무료로 제공하는 주식 분석 플랫폼입니다.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Hero */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-4 py-2 rounded-full mb-6">
            🤖 AI 기반 주식 분석 서비스
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            모든 투자자를 위한<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              AI 주식 비서
            </span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            복잡한 주식 시장을 누구나 쉽게 이해할 수 있도록, 인공지능이 매일 실시간으로 분석하고
            핵심만 골라 알려주는 무료 주식 분석 플랫폼입니다.
          </p>
        </div>

        {/* 서비스 소개 */}
        <div className="space-y-12 text-gray-300 leading-relaxed">

          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              📊 StockTrend란 무엇인가요?
            </h2>
            <p className="mb-4">
              <strong className="text-white">StockTrend (스톡트렌드)</strong>는 개인 투자자들이 전문가 수준의 주식 정보를 손쉽게
              접할 수 있도록 개발된 <strong className="text-white">AI 기반 주식 분석 플랫폼</strong>입니다.
            </p>
            <p className="mb-4">
              매일 장 마감 후 국내(코스피·코스닥)와 해외(나스닥·S&P 500) 시장 데이터를 인공지능이 자동으로
              분석하여 <strong className="text-white">누구나 이해하기 쉬운 시황 리포트</strong>로 변환해 드립니다.
              복잡한 재무제표나 차트 분석 없이도 오늘 시장의 핵심 흐름을 파악할 수 있습니다.
            </p>
            <p>
              또한 관심 종목을 등록하면 주가 급등락, 공시 속보, 실적 발표 일정 등을 스마트폰 푸시 알림으로
              즉시 받아볼 수 있어, 중요한 투자 정보를 절대 놓치지 않도록 도와드립니다.
            </p>
          </section>

          {/* 핵심 기능 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">🚀 주요 서비스 기능</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: "🤖",
                  title: "AI 종목 분석",
                  desc: "재무·수급·심리 3가지 핵심 지표를 AI가 종합 분석하여 0~100점 투자 매력도 점수로 한눈에 보여줍니다.",
                },
                {
                  icon: "📰",
                  title: "전문가 마켓 리포트",
                  desc: "매일 장 마감 후 국내·미국 증시 시황을 AI가 분석하여 핵심만 요약한 전문가급 리포트를 자동 발행합니다.",
                },
                {
                  icon: "🔔",
                  title: "실시간 주가 알림",
                  desc: "관심 종목의 주가 급등락, DART 공시 속보, 실적 발표 일정을 스마트폰 푸시 알림으로 즉시 받아보세요.",
                },
                {
                  icon: "🌐",
                  title: "글로벌 마켓 시그널",
                  desc: "달러 환율, 국제 유가, 금리 동향 등 글로벌 거시경제 지표를 실시간으로 모니터링합니다.",
                },
                {
                  icon: "🗺️",
                  title: "글로벌 서플라이 체인",
                  desc: "기업의 공급사·고객사·경쟁사 관계를 지도로 시각화하여 산업 내 역학 관계를 쉽게 파악합니다.",
                },
                {
                  icon: "📅",
                  title: "실적·배당 캘린더",
                  desc: "관심 종목의 분기 실적 발표일, 배당락일 등 주요 일정을 자동으로 수집하여 캘린더로 관리합니다.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-blue-500/30 transition-colors"
                >
                  <span className="text-3xl shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 운영자 소개 */}
          <section className="bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">👨‍💻 운영자 소개</h2>
            <p className="mb-4">
              StockTrend는 개인 투자자로서 직접 겪었던 불편함에서 시작되었습니다.
              <strong className="text-white"> "좋은 정보는 항상 유료이거나 너무 복잡하다"</strong>는 문제를 해결하고자,
              누구나 무료로 전문가급 주식 정보를 받아볼 수 있는 서비스를 만들게 되었습니다.
            </p>
            <p className="mb-4">
              인공지능 기술과 다양한 금융 데이터 API를 결합하여, 개인 투자자들이 기관이나 전문가들과
              동등한 수준의 정보력을 갖출 수 있도록 지속적으로 서비스를 개선하고 있습니다.
            </p>
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-gray-400">
                📧 문의 및 피드백:{" "}
                <Link href="/contact" className="text-blue-400 hover:underline">
                  문의하기 페이지
                </Link>
                를 이용해 주세요.
              </p>
            </div>
          </section>

          {/* 면책 조항 */}
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">⚠️ 투자 정보 면책 안내</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              본 서비스에서 제공하는 모든 주식 분석, AI 점수, 시황 리포트는{" "}
              <strong>투자 참고용 정보</strong>이며, 투자 권유 또는 투자 자문이 아닙니다.
              주식 투자에는 원금 손실의 위험이 있으며, 투자의 최종 판단과 책임은
              전적으로 투자자 본인에게 있습니다.
            </p>
          </section>

        </div>

        {/* 푸터 링크 */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-600 text-sm">
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/" className="hover:text-gray-400 transition-colors">홈으로</Link>
            <Link href="/contact" className="hover:text-gray-400 transition-colors">문의하기</Link>
            <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">이용약관</Link>
          </div>
          <p className="mt-3">© 2026 StockTrend. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
