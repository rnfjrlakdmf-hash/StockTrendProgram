import { Metadata } from "next";
import Link from "next/link";
import { BookOpen, AlertTriangle, ShieldCheck, Target, Users, Cpu, Database, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: "StockTrend 서비스 소개 | AI 기반 주식 분석 플랫폼",
  description:
    "StockTrend는 인공지능이 매일 국내외 증시를 분석하여 투자자들에게 맞춤형 시황 브리핑, 주가 알림, 종목 분석 정보를 무료로 제공하는 주식 분석 플랫폼입니다. 투자 자문을 제공하지 않는 순수 교육/정보 플랫폼입니다.",
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">

        {/* Hero */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-4 py-2 rounded-full mb-6">
            <Cpu className="w-4 h-4" />
            AI 기반 주식 데이터 분석 플랫폼
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            모든 투자자를 위한
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              스마트 금융 비서, StockTrend
            </span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            복잡한 주식 시장의 데이터를 누구나 쉽게 이해할 수 있도록, 인공지능(AI) 기술을 활용하여 실시간으로 분석하고 객관적인 팩트만 요약해 드리는 완전 무료 주식 정보 플랫폼입니다.
          </p>
        </div>

        <div className="space-y-12 text-gray-300 leading-loose">

          {/* 서비스 소개 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-3">
              <Target className="w-6 h-6 text-blue-400" />
              StockTrend의 미션과 비전
            </h2>
            <p className="text-lg mb-4">
              <strong className="text-white">"정보의 비대칭성을 해소하여, 개인 투자자도 기관 수준의 인사이트를 가질 수 있게 하자."</strong>
            </p>
            <p className="mb-4">
              기관 투자자들은 고비용의 데이터 터미널과 전문가 팀을 통해 시장을 분석합니다. 반면, 개인 투자자들은 파편화된 뉴스와 불확실한 커뮤니티 정보에 의존하는 경우가 많습니다. StockTrend는 이러한 정보의 불균형을 최신 인공지능(AI) 기술로 해결하고자 탄생했습니다.
            </p>
            <p className="mb-4">
              저희는 수많은 금융 데이터, 공시 원문, 거시 경제 지표를 AI로 신속하게 처리하여, 누구나 직관적으로 이해할 수 있는 형태의 리포트와 알림으로 제공합니다. 어려운 재무 용어를 몰라도, 차트 분석에 능숙하지 않아도 시장의 흐름을 읽을 수 있도록 돕는 것이 저희의 목표입니다.
            </p>
          </section>

          {/* 핵심 원칙: 유사투자자문 아님 */}
          <section className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-red-400 mb-5 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6" />
              엄격한 운영 원칙: 100% 팩트 기반 데이터
            </h2>
            <p className="text-lg mb-4 text-gray-300">
              StockTrend는 자본시장법 등 관련 법령을 엄격히 준수하며, <strong className="text-white">유사투자자문업에 해당하는 어떠한 행위도 하지 않습니다.</strong>
            </p>
            <ul className="list-disc list-inside space-y-3 text-gray-400">
              <li><strong>투자 종목 추천 금지:</strong> 특정 주식의 매수나 매도를 지시하거나 권유하지 않습니다.</li>
              <li><strong>주관적 예측 배제:</strong> "내일 오를 주식", "대박 종목" 등 근거 없는 예측을 제공하지 않으며, 오직 확정된 공시와 통계적 데이터만을 다룹니다.</li>
              <li><strong>순수 정보 제공:</strong> 당사의 AI 리포트는 공개된 재무제표와 시장 데이터를 바탕으로 기계적으로 요약된 결과물로, 교육 및 참고 목적으로만 제공됩니다.</li>
            </ul>
          </section>

          {/* 주요 기능 상세 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">🚀 제공하는 주요 서비스 (전면 무료)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: "📊",
                  title: "AI 팩트 리포트",
                  desc: "매일 장 마감 후 시장의 자금 흐름과 주요 섹터 변동성을 AI가 데이터 기반으로 객관적으로 요약해 드립니다.",
                },
                {
                  icon: "🔔",
                  title: "실시간 공시 분석 알림",
                  desc: "금융감독원 DART 시스템에 올라오는 방대한 공시 원문 중, 수주 계약이나 실적 발표 등 팩트를 추출해 실시간 푸시로 알려드립니다.",
                },
                {
                  icon: "🌐",
                  title: "거시 경제 시그널링",
                  desc: "환율, 유가, 국채 금리 등 글로벌 거시 경제 지표의 변동을 추적하고, 이것이 시장 평균에 미치는 통계적 영향을 시각화합니다.",
                },
                {
                  icon: "📚",
                  title: "투자 기초 교육 가이드",
                  desc: "주식 초보자를 위해 RSI, MACD, 배당수익률, 이동평균선 등 복잡한 금융 용어를 쉽게 풀어서 설명하는 교육용 위키를 운영합니다.",
                },
                {
                  icon: "🗓️",
                  title: "글로벌 경제 캘린더",
                  desc: "FOMC 금리 결정, 미국 고용보고서 발표, 주요 기업의 실적 발표일 등 시장 변동성을 키울 수 있는 확정된 이벤트 일정을 제공합니다.",
                },
                {
                  icon: "📈",
                  title: "기술적 지표 모니터링",
                  desc: "특정 종목의 RSI가 30 이하(과매도 통계적 기준)로 떨어지거나, 골든크로스가 발생한 객관적인 수학적 사실을 알림으로 전송합니다.",
                }
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 p-6 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-blue-500/30 transition-colors"
                >
                  <span className="text-3xl shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 기술 스택과 데이터 소스 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-3">
              <Database className="w-6 h-6 text-indigo-400" />
              데이터 소스 및 투명성 (Transparency)
            </h2>
            <p className="mb-6">
              StockTrend는 검증된 공공 데이터와 신뢰할 수 있는 기관의 API만을 활용하여 정보를 구축합니다. 우리는 어떤 데이터로 분석을 수행하는지 투명하게 공개합니다.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "국내 기업 공시", value: "금융감독원 DART" },
                { label: "해외 기업 공시", value: "미국 SEC EDGAR" },
                { label: "실시간 주가", value: "Yahoo Finance API" },
                { label: "AI 텍스트 처리", value: "Google Gemini Pro" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                  <div className="text-xs text-gray-500 mb-2">{item.label}</div>
                  <div className="text-sm font-bold text-gray-200">{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 운영자/문의 */}
          <section className="bg-gradient-to-br from-indigo-900/20 to-transparent border border-indigo-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-400" />
              팀 및 문의하기
            </h2>
            <p className="mb-4">
              저희는 금융 데이터 접근의 민주화를 꿈꾸는 개발자와 데이터 분석가들로 구성되어 있습니다. 앞으로도 기술을 통해 개인 투자자들이 보다 합리적이고 객관적인 결정을 내릴 수 있는 인프라를 만들어 나가겠습니다.
            </p>
            <div className="mt-6 p-5 bg-white/5 rounded-xl border border-white/10">
              <p className="text-gray-300">
                제휴 문의, 버그 리포트, 데이터 출처에 대한 문의는 언제든 환영합니다.
                <br /><br />
                📧 이메일: <strong className="text-white">rnfjrlakdmf@gmail.com</strong><br />
                💬 <Link href="/contact" className="text-blue-400 hover:underline">고객센터(문의하기) 페이지</Link>
              </p>
            </div>
          </section>

          {/* 면책 조항 (가장 강력하게) */}
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              투자 정보 면책 안내 (Legal Disclaimer)
            </h2>
            <div className="text-gray-400 text-sm leading-relaxed space-y-3">
              <p>
                1. <strong>투자 결정의 책임:</strong> 본 웹사이트(StockTrend)에서 제공하는 모든 데이터, 분석 리포트, 뉴스 요약, 기술적 지표, 푸시 알림 등은 투자자의 이해를 돕기 위한 <strong>단순 참고 및 교육 목적의 정보</strong>입니다. 이를 바탕으로 내린 투자 결정에 대한 최종 책임은 전적으로 투자자 본인에게 있으며, 당사는 어떠한 경우에도 직·간접적인 투자 손실에 대해 법적 책임을 지지 않습니다.
              </p>
              <p>
                2. <strong>유사투자자문업 비해당:</strong> 당사는 불특정 다수를 상대로 주식의 가치 판단이나 매매 시점을 조언(자문)하지 않습니다. 모든 정보는 기계적인 데이터 수집 및 인공지능 요약을 거쳐 자동 생성되며, 특정 개인을 위한 맞춤형 투자 상담이나 종목 추천을 일절 제공하지 않으므로 자본시장법상 유사투자자문업에 해당하지 않습니다.
              </p>
              <p>
                3. <strong>데이터의 정확성:</strong> 제휴 API 및 공공 데이터베이스(DART, SEC 등)의 지연, 오류, 또는 AI 요약 과정에서의 오역으로 인해 실제 팩트와 다른 정보가 전달될 수 있습니다. 투자 전 반드시 원문(전자공시시스템 등)을 직접 교차 검증하시기 바랍니다.
              </p>
            </div>
          </section>

        </div>

        {/* 푸터 링크 */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-500 text-sm font-medium">
          <div className="flex justify-center gap-6 mt-3 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors">홈으로</Link>
            <Link href="/contact" className="hover:text-white transition-colors">문의하기</Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
            <Link href="/disclaimer" className="hover:text-white transition-colors">법적 고지 및 면책조항</Link>
          </div>
          <p className="mt-6">© 2026 StockTrend. All rights reserved. Not an investment advisory service.</p>
        </div>
      </div>
    </div>
  );
}
