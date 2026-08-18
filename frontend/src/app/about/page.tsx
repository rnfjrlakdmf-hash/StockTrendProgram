import { Metadata } from "next";
import Link from "next/link";
import { BookOpen, AlertTriangle, ShieldCheck, Target, Users, Cpu, Database, Award, CheckCircle, Mail, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: "스마트 투자 비서 소개 | 운영팀 및 서비스 정책 안내",
  description:
    "스마트 투자 비서는 금융감독원 DART, 미국 SEC EDGAR 등 신뢰할 수 있는 공공 기관의 공시 데이터를 기반으로 국내외 주식 시장 정보를 객관적으로 요약·제공하는 무료 금융 정보 플랫폼입니다. 투자 자문이 아닌 순수 팩트 기반 정보 서비스입니다.",
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
            공공 금융 데이터 기반 정보 제공 플랫폼
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            모든 투자자를 위한
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              스마트 투자 비서
            </span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            금융감독원 DART, 한국거래소(KRX), 미국 SEC EDGAR 등 공신력 있는 공공 기관의 공시 데이터를 바탕으로
            국내외 주식 시황과 기업 공시 정보를 누구나 알기 쉽게 요약해 드리는 완전 무료 금융 정보 서비스입니다.
          </p>
        </div>

        <div className="space-y-12 text-gray-300 leading-loose">

          {/* 운영팀 소개 - E-E-A-T 핵심 */}
          <section className="bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-400" />
              운영팀 소개 (About the Team)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl font-bold text-blue-400">S</div>
                  <div>
                    <div className="font-bold text-white">StockTrend 리서치팀</div>
                    <div className="text-xs text-gray-500">서비스 운영 총괄</div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  국내외 금융 시장 데이터 수집·분석 시스템 개발과 운영을 담당합니다.
                  금융감독원 DART, 한국거래소(KRX), 미국 증권거래위원회(SEC) 등 공공 데이터 API를
                  활용하여 투자자에게 유용한 정보를 제공하는 것을 목표로 합니다.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-3 text-sm">서비스 주요 이력</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />2025년 서비스 론칭 (국내외 공시 알림 제공)</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />DART API 기반 실시간 내부자 거래 포착 시스템 구축</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />미국 SEC Form 4 (내부자 거래) 실시간 분석 기능 추가</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />Android 앱 출시 및 실시간 푸시 알림 시스템 운영</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />누적 가입자 수천 명 돌파 및 무료 서비스 유지</li>
                </ul>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-sm text-gray-300 leading-relaxed">
                <strong className="text-white">운영 원칙:</strong> 저희 팀은 특정 주식의 매수·매도를 권유하거나 투자 성과를 보장하는 일체의 행위를 하지 않습니다.
                모든 서비스는 금융감독원 DART, 한국거래소(KRX), 미국 SEC EDGAR 등 <strong className="text-white">100% 공공 기관의 원본 데이터</strong>를 기반으로
                구축되며, 투자자 스스로가 더 나은 판단을 내릴 수 있도록 돕는 정보 인프라 역할만을 수행합니다.
              </p>
            </div>
          </section>

          {/* 서비스 소개 */}
          <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-5 flex items-center gap-3">
              <Target className="w-6 h-6 text-blue-400" />
              스마트 투자 비서의 미션과 비전
            </h2>
            <p className="text-lg mb-4">
              <strong className="text-white">"정보의 비대칭성을 해소하여, 개인 투자자도 기관 수준의 공시 정보에 빠르게 접근할 수 있게 하자."</strong>
            </p>
            <p className="mb-4 text-gray-400">
              기관 투자자들은 고비용의 데이터 터미널과 전담 리서치 팀을 통해 수천 건의 공시와 시장 데이터를 실시간으로 모니터링합니다.
              반면, 개인 투자자들은 파편화된 커뮤니티 정보와 늦게 전달되는 뉴스에 의존하는 경우가 많아 정보 비대칭 문제가 발생합니다.
            </p>
            <p className="text-gray-400">
              스마트 투자 비서는 금융감독원 DART, 한국거래소(KRX), 미국 SEC EDGAR 등 <strong className="text-gray-200">공신력 있는 공공 기관에서 발생하는 공시와 데이터를 실시간으로 수집·처리</strong>하여,
              누구나 즉시 이해할 수 있는 알림과 분석 리포트 형태로 무료 제공함으로써 개인 투자자의 정보 접근성을 높이는 것을 목표로 합니다.
            </p>
          </section>

          {/* 핵심 원칙: 유사투자자문 아님 */}
          <section className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-red-400 mb-5 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6" />
              법적 운영 원칙: 유사투자자문업 비해당 선언
            </h2>
            <p className="text-lg mb-4 text-gray-300">
              스마트 투자 비서는 자본시장법 및 관련 법령을 엄격히 준수하며, <strong className="text-white">유사투자자문업에 해당하는 어떠한 행위도 하지 않습니다.</strong>
            </p>
            <ul className="list-disc list-inside space-y-3 text-gray-400">
              <li><strong className="text-gray-300">투자 종목 추천 완전 금지:</strong> 특정 주식의 매수·매도를 지시하거나 권유하는 콘텐츠를 일절 게시하지 않습니다.</li>
              <li><strong className="text-gray-300">근거 없는 예측 배제:</strong> "오를 주식", "대박 종목" 등의 예측성 표현을 사용하지 않으며, 오직 확정된 공시 원문과 통계 데이터만을 전달합니다.</li>
              <li><strong className="text-gray-300">순수 정보 서비스:</strong> 당사의 모든 분석은 공개된 재무제표와 공시 데이터를 기반으로 자동 요약된 것으로, 교육 및 정보 참고 목적으로만 제공됩니다.</li>
              <li><strong className="text-gray-300">맞춤형 투자 상담 거절:</strong> 개인별 투자 성향을 분석하거나 특정인을 위한 포트폴리오를 구성하는 서비스를 제공하지 않습니다.</li>
            </ul>
          </section>

          {/* 주요 기능 상세 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">🚀 제공하는 주요 서비스 (전면 무료)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: "📊",
                  title: "AI 팩트 시황 리포트",
                  desc: "매일 장 마감 후 KOSPI, KOSDAQ, 미국 S&P500, 나스닥의 수급 동향과 핵심 이슈를 데이터 기반으로 요약합니다. 특정 종목 추천 없이 시장 전체의 팩트를 전달합니다.",
                },
                {
                  icon: "🔔",
                  title: "실시간 공시 포착 알림",
                  desc: "금융감독원 DART에 접수되는 임원 내부자 거래, 대규모 계약 체결, 실적 공시 등을 실시간으로 감지하여 스마트폰 푸시 알림으로 즉시 전달합니다.",
                },
                {
                  icon: "🇺🇸",
                  title: "미국 주식 내부자 거래 포착",
                  desc: "미국 SEC(증권거래위원회) EDGAR 시스템의 Form 4 공시를 실시간 감시하여 미국 상장 기업 CEO, CFO 등 임원의 자사주 매수·매도 내역을 즉시 알려드립니다.",
                },
                {
                  icon: "🌐",
                  title: "거시 경제 시그널링",
                  desc: "원/달러 환율, 국제 유가(WTI), 미국 국채 금리 등 거시 경제 지표의 변동을 추적하고 이것이 주요 지수에 미치는 통계적 영향을 시각화하여 제공합니다.",
                },
                {
                  icon: "📚",
                  title: "투자 기초 교육 가이드",
                  desc: "주식 투자 초보자를 위해 RSI, MACD, 볼린저 밴드, 배당수익률, 이동평균선 등 핵심 금융 용어를 쉽게 풀어 설명하는 무료 교육 자료를 제공합니다.",
                },
                {
                  icon: "🗓️",
                  title: "글로벌 경제 이벤트 캘린더",
                  desc: "FOMC 금리 결정, 미국 CPI(소비자물가지수) 발표, 주요 기업 실적 발표일(어닝 시즌) 등 시장 변동성에 영향을 미치는 확정된 이벤트 일정을 제공합니다.",
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
              데이터 출처 및 투명성 공개 (Data Sources)
            </h2>
            <p className="mb-6 text-gray-400">
              스마트 투자 비서는 다음과 같은 공공 기관 및 신뢰할 수 있는 데이터 제공자의 공식 API만을 사용하여 정보를 구축합니다.
              어떤 데이터로 서비스가 운영되는지 투명하게 공개합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { label: "국내 기업 공시 (정기공시·임원공시)", value: "금융감독원 DART 공식 API", link: "https://dart.fss.or.kr" },
                { label: "미국 기업 공시 (Form 4·13F)", value: "미국 SEC EDGAR 공식 API", link: "https://www.sec.gov/cgi-bin/browse-edgar" },
                { label: "국내 실시간 주가 데이터", value: "한국거래소(KRX) 및 네이버 금융", link: "https://finance.naver.com" },
                { label: "해외 실시간 주가 데이터", value: "Yahoo Finance API", link: "https://finance.yahoo.com" },
                { label: "환율 및 원자재 데이터", value: "한국은행 경제통계시스템(ECOS)", link: "https://ecos.bok.or.kr" },
                { label: "AI 텍스트 요약 처리", value: "Google Gemini (구글 AI)", link: "https://ai.google.dev" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-400 hover:underline">{item.value}</a>
                </div>
              ))}
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-gray-400">
              <strong className="text-indigo-300">📌 중요:</strong> 저희는 출처가 불분명한 커뮤니티 정보, 루머, 미확인 전망치를 절대 사용하지 않습니다.
              모든 데이터는 공공 기관의 공식 채널에서만 수집되며, 데이터 출처를 분석 결과물에 항상 명시합니다.
            </div>
          </section>

          {/* 서비스 신뢰도 지표 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Award className="w-6 h-6 text-yellow-400" />
              서비스 현황 및 신뢰도 지표
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "서비스 운영 기간", value: "2년+", sub: "2025년~현재" },
                { label: "제공 알림 종류", value: "10종+", sub: "국내외 공시·시황" },
                { label: "데이터 모니터링", value: "24/7", sub: "연중무휴 실시간" },
                { label: "서비스 이용 요금", value: "완전 무료", sub: "가입 즉시 이용" },
              ].map((item) => (
                <div key={item.label} className="text-center bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                  <div className="text-2xl font-black text-white mb-1">{item.value}</div>
                  <div className="text-xs text-gray-500 mb-1">{item.sub}</div>
                  <div className="text-xs text-gray-600">{item.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 연락처 */}
          <section className="bg-gradient-to-br from-indigo-900/20 to-transparent border border-indigo-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Mail className="w-6 h-6 text-purple-400" />
              문의 및 연락처
            </h2>
            <p className="mb-4 text-gray-400">
              서비스 이용 중 궁금한 점, 데이터 오류 신고, 제휴 문의 등은 아래 채널을 통해 연락해 주시면 영업일 기준 1~2일 내에 성실히 답변 드리겠습니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white text-sm">이메일 문의</span>
                </div>
                <a href="mailto:rnfjrlakdmf@gmail.com" className="text-blue-400 hover:underline text-sm">rnfjrlakdmf@gmail.com</a>
                <p className="text-gray-500 text-xs mt-1">영업일 기준 1~2일 내 답변</p>
              </div>
              <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white text-sm">온라인 문의</span>
                </div>
                <Link href="/contact" className="text-blue-400 hover:underline text-sm">고객센터 문의 페이지 바로가기</Link>
                <p className="text-gray-500 text-xs mt-1">버그 신고·기능 제안·계정 문의</p>
              </div>
            </div>
          </section>

          {/* 면책 조항 */}
          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8 md:p-10">
            <h2 className="text-xl font-bold text-yellow-300 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              투자 정보 면책 안내 (Legal Disclaimer)
            </h2>
            <div className="text-gray-400 text-sm leading-relaxed space-y-3">
              <p>
                1. <strong className="text-gray-300">투자 결정의 책임:</strong> 본 웹사이트(스마트 투자 비서)에서 제공하는 모든 데이터, 분석 리포트, 뉴스 요약, 기술적 지표, 푸시 알림 등은 투자자의 이해를 돕기 위한 <strong>단순 참고 및 교육 목적의 정보</strong>입니다. 이를 바탕으로 내린 투자 결정에 대한 최종 책임은 전적으로 투자자 본인에게 있으며, 당사는 어떠한 경우에도 직·간접적인 투자 손실에 대해 법적 책임을 지지 않습니다.
              </p>
              <p>
                2. <strong className="text-gray-300">유사투자자문업 비해당:</strong> 당사는 불특정 다수를 상대로 주식의 가치 판단이나 매매 시점을 조언(자문)하지 않습니다. 모든 정보는 공공 API에서 수집된 데이터를 기계적으로 요약한 결과물로, 특정 개인을 위한 맞춤형 투자 상담이나 종목 추천을 일절 제공하지 않으므로 자본시장법상 유사투자자문업에 해당하지 않습니다.
              </p>
              <p>
                3. <strong className="text-gray-300">데이터의 정확성:</strong> 제휴 API 및 공공 데이터베이스(DART, SEC 등)의 지연·오류, 또는 요약 과정에서의 오역으로 인해 실제 팩트와 다른 정보가 전달될 수 있습니다. 투자 전 반드시 원문(전자공시시스템 등)을 직접 교차 검증하시기 바랍니다.
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
