import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "StockTrend 서비스 소개 | AI 기반 주식 분석 플랫폼",
  description:
    "StockTrend는 인공지능이 매일 국내외 증시를 분석하여 투자자들에게 맞춤형 시황 브리핑, 주가 알림, 종목 분석 정보를 무료로 제공하는 주식 분석 플랫폼입니다. RSI, PER, 공시 팩트 알림, 배당락일 알림까지 모두 무료.",
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
            모든 투자자를 위한
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              AI 주식 비서
            </span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            복잡한 주식 시장을 누구나 쉽게 이해할 수 있도록, 인공지능이 매일 실시간으로
            분석하고 핵심만 골라 알려주는 완전 무료 주식 분석 플랫폼입니다.
          </p>
        </div>

        <div className="space-y-12 text-gray-300 leading-relaxed">

          {/* 서비스 소개 */}
          <section className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-3">
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
            <p className="mb-4">
              또한 관심 종목을 등록하면 주가 급등락, 공시 속보, 실적 발표 일정 등을 스마트폰 푸시 알림으로
              즉시 받아볼 수 있어, 중요한 투자 정보를 절대 놓치지 않도록 도와드립니다.
            </p>
            <p>
              2024년 서비스 시작 이후 수천 명의 개인 투자자들이 StockTrend를 활용하여 시장 흐름을 파악하고 있습니다.
              모든 핵심 기능은 <strong className="text-white">완전 무료</strong>로 제공됩니다.
            </p>
          </section>

          {/* 주요 기능 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">🚀 주요 서비스 기능 (전체 무료)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: "🤖",
                  title: "AI 종목 분석 리포트",
                  desc: "재무·수급·심리 3가지 핵심 지표를 AI가 종합 분석하여 0~100점 투자 매력도 점수와 함께 보기 쉬운 리포트로 제공합니다.",
                },
                {
                  icon: "📰",
                  title: "전문가 마켓 리포트",
                  desc: "매일 장 마감 후 국내·미국 증시 시황을 AI가 분석하여 핵심만 요약한 전문가급 주간 리포트를 자동 발행합니다.",
                },
                {
                  icon: "🔔",
                  title: "실시간 공시 팩트 알림",
                  desc: "DART에 공시된 대규모 수주 계약, 실적 발표 등을 AI가 즉시 분석하여 핵심 수치(계약 규모 등)만 추출해 푸시 알림으로 전달합니다.",
                },
                {
                  icon: "📊",
                  title: "기술적 지표 변동 알림",
                  desc: "관심 종목의 RSI(상대강도지수) 등 기술적 지표가 특정 구간에 진입하면 수치 변동 사실을 즉시 알림으로 전달합니다.",
                },
                {
                  icon: "💰",
                  title: "배당락일 예상 수익률 알림",
                  desc: "관심 종목의 배당락일 전일에 작년 배당금 기준 예상 배당수익률을 산술적으로 계산하여 객관적 사실로 전달합니다.",
                },
                {
                  icon: "🌐",
                  title: "글로벌 마켓 시그널",
                  desc: "달러 환율, 국제 유가, 금리 동향 등 글로벌 거시경제 지표와 FOMC 일정 등을 실시간으로 모니터링합니다.",
                },
                {
                  icon: "🗺️",
                  title: "글로벌 서플라이 체인 분석",
                  desc: "기업의 공급사·고객사·경쟁사 관계를 지도로 시각화하여 산업 내 역학 관계를 직관적으로 파악합니다.",
                },
                {
                  icon: "📅",
                  title: "실적·배당 캘린더",
                  desc: "관심 종목의 분기 실적 발표일, 배당락일 등 주요 일정을 자동으로 수집하여 캘린더로 관리합니다.",
                },
                {
                  icon: "🏆",
                  title: "ETF 분석 도구",
                  desc: "코스피200, 나스닥100, 섹터별 ETF 구성 종목과 비용, 추종 지수 정보를 한눈에 비교 분석합니다.",
                },
                {
                  icon: "🔒",
                  title: "주말 한정 마켓 인사이트",
                  desc: "토·일요일에만 공개되는 프리미엄 마켓 인사이트. AI가 지난주 시장 자금 흐름과 다음 주 핵심 경제 일정을 팩트 중심으로 요약합니다.",
                },
                {
                  icon: "📚",
                  title: "투자 용어 가이드",
                  desc: "RSI, PER, PBR, MACD, 볼린저밴드, 공매도, 배당수익률 등 주식 투자 핵심 용어 43가지를 쉽고 자세하게 설명합니다.",
                },
                {
                  icon: "🧮",
                  title: "물타기 평단가 계산기",
                  desc: "보유 주식의 현재 손실 상황에서 물타기 시 평균 단가를 즉시 계산해 드립니다. 친구들과 공유하며 재미있게 활용하세요.",
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

          {/* 왜 만들었나 */}
          <section className="bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-5">💡 왜 StockTrend를 만들었나요?</h2>
            <p className="mb-4">
              "개인 투자자는 항상 정보에서 뒤처진다"는 불공평함이 StockTrend의 출발점이었습니다.
              기관 투자자와 전문 애널리스트들은 블룸버그 터미널, 각종 리서치 보고서, 실시간 데이터 피드에
              매달 수백만 원을 지불합니다. 반면 개인 투자자는 뉴스 기사와 커뮤니티 게시글에 의존해야 합니다.
            </p>
            <p className="mb-4">
              AI 기술의 발전으로 이 격차를 줄일 수 있다고 판단했습니다. Google Gemini 같은 최신 AI 모델은
              방대한 금융 정보를 순식간에 분석하고 핵심을 추출하는 능력을 갖추고 있습니다.
              StockTrend는 이 AI 기술을 활용하여 <strong className="text-white">개인 투자자들에게 전문가 수준의 정보를 무료로 제공</strong>하는
              것을 목표로 합니다.
            </p>
            <p>
              특히 <strong className="text-white">100% 객관적 사실(Fact) 기반</strong>의 정보 전달을 원칙으로 합니다.
              "매수하세요", "호재입니다"처럼 주관적 판단이나 투자 권유는 일절 제공하지 않습니다.
              데이터를 있는 그대로 정확하게 전달하고, 투자 판단은 오로지 투자자 본인이 내릴 수 있도록 돕습니다.
            </p>
          </section>

          {/* 기술 스택 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-5">⚙️ 기술적 접근 방식</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "AI 분석", value: "Google Gemini 1.5" },
                { label: "공시 데이터", value: "DART API (금감원)" },
                { label: "주가 데이터", value: "네이버 금융, yfinance" },
                { label: "푸시 알림", value: "Firebase FCM" },
                { label: "백엔드", value: "Python FastAPI" },
                { label: "프론트엔드", value: "Next.js (React)" },
                { label: "데이터베이스", value: "SQLite + Firestore" },
                { label: "배포", value: "AWS EC2 + Vercel" },
              ].map((item) => (
                <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <div className="text-sm font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 운영자 소개 */}
          <section className="bg-gradient-to-br from-indigo-900/20 to-transparent border border-indigo-500/20 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">👨‍💻 운영자 소개</h2>
            <p className="mb-4">
              StockTrend는 개인 투자자로서 직접 겪었던 불편함에서 시작되었습니다.
              <strong className="text-white">"좋은 정보는 항상 유료이거나 너무 복잡하다"</strong>는 문제를 해결하고자,
              누구나 무료로 전문가급 주식 정보를 받아볼 수 있는 서비스를 만들게 되었습니다.
            </p>
            <p className="mb-4">
              인공지능 기술과 다양한 금융 데이터 API를 결합하여, 개인 투자자들이 기관이나 전문가들과
              동등한 수준의 정보력을 갖출 수 있도록 지속적으로 서비스를 개선하고 있습니다.
            </p>
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-gray-400">
                📧 문의 이메일: rnfjrlakdmf@gmail.com 또는{" "}
                <Link href="/contact" className="text-blue-400 hover:underline">
                  문의하기 페이지
                </Link>
                를 이용해 주세요.
              </p>
            </div>
          </section>

          {/* 바로가기 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-5">🔗 주요 페이지 바로가기</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { href: "/", label: "통합 대시보드", emoji: "🏠" },
                { href: "/blog", label: "마켓 리포트", emoji: "📰" },
                { href: "/discovery", label: "AI 종목 발굴", emoji: "🔍" },
                { href: "/signals", label: "글로벌 시그널", emoji: "🌐" },
                { href: "/guide", label: "투자 용어 가이드", emoji: "📚" },
                { href: "/calculator", label: "물타기 계산기", emoji: "🧮" },
                { href: "/etf", label: "ETF 분석", emoji: "📦" },
                { href: "/calendar", label: "실적 캘린더", emoji: "📅" },
                { href: "/weekend-report", label: "주말 인사이트", emoji: "🔒" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-500/30 transition-all text-sm font-medium text-gray-300 hover:text-white"
                >
                  <span className="text-xl">{item.emoji}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          {/* 면책 조항 */}
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-yellow-300 mb-3">⚠️ 투자 정보 면책 안내</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              본 서비스에서 제공하는 모든 주식 분석, AI 점수, 시황 리포트, 푸시 알림은{" "}
              <strong>투자 참고용 정보</strong>이며, 투자 권유 또는 투자 자문이 아닙니다.
              StockTrend는 자본시장과 금융투자업에 관한 법률상 유사투자자문업자로 등록되지 않았으며,
              투자 권유나 자문을 제공하지 않습니다. 주식 투자에는 원금 손실의 위험이 있으며,
              투자의 최종 판단과 책임은 전적으로 투자자 본인에게 있습니다.
            </p>
          </section>

        </div>

        {/* 푸터 링크 */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-600 text-sm">
          <div className="flex justify-center gap-6 mt-3 flex-wrap">
            <Link href="/" className="hover:text-gray-400 transition-colors">홈으로</Link>
            <Link href="/contact" className="hover:text-gray-400 transition-colors">문의하기</Link>
            <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">이용약관</Link>
            <Link href="/disclaimer" className="hover:text-gray-400 transition-colors">투자 면책 조항</Link>
          </div>
          <p className="mt-3">© 2026 StockTrend. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
