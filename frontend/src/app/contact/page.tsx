import { Metadata } from "next";
import Link from "next/link";
import ContactFormClient from "./ContactFormClient";

export const metadata: Metadata = {
  title: "문의하기 · 콘텐츠 정정 요청 | 스마트 투자 비서",
  description:
    "스마트 투자 비서(StockTrend)의 금융 리서치 칼럼, 1일 1경제학, 46대 용어 백과사전 내용 정정 요청, 데이터 오류 신고 및 서비스 이용 문의를 접수하는 공식 창구입니다.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold px-3.5 py-1.5 rounded-full mb-4">
            편집팀 공식 소통 창구 · 영업일 1~2일 내 직접 회신
          </div>
          <h1 className="text-4xl font-black text-white mb-3">문의하기 및 콘텐츠 정정 요청</h1>
          <p className="text-gray-400 leading-relaxed break-keep">
            스마트 투자 비서의 금융 교육 칼럼, 매일 1일 1경제학, 46대 주식 용어 백과사전 및 공공 금융 데이터 이용 중
            오류 정정 요청이나 건의사항이 있으시면 아래 공식 이메일 또는 문의 양식으로 보내주세요.
          </p>
        </div>

        {/* 빠른 연락 방법 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: "📧", label: "편집책임자 공식 이메일", value: "rnfjrlakdmf@gmail.com", sub: "윤희원 · 영업일 1~2일 내 답변" },
            { icon: "📝", label: "팩트체크 · 정정 요청", value: "공시 원문 대조 검증", sub: "오탈자·수치 이상 확인 즉시 반영" },
            { icon: "💡", label: "교육 주제 제안", value: "1일 1경제학 · 용어 사전", sub: "배우고 싶은 경제·재무 주제 환영" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center text-center p-5 bg-white/5 border border-white/10 rounded-2xl"
            >
              <span className="text-3xl mb-3">{item.icon}</span>
              <p className="font-bold text-white text-sm mb-1">{item.label}</p>
              <p className="text-blue-400 text-sm font-medium">{item.value}</p>
              <p className="text-gray-500 text-xs mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* 문의 양식 (Client Component) */}
        <ContactFormClient />

        {/* 콘텐츠 정정 및 편집 책임 안내 */}
        <section className="mt-12 bg-blue-950/20 border border-blue-500/20 rounded-3xl p-8 space-y-3">
          <h2 className="text-xl font-bold text-white">콘텐츠 오류 정정 및 저작권 처리 원칙</h2>
          <p className="text-sm text-gray-300 leading-relaxed break-keep">
            스마트 투자 비서 리서치 편집팀은 한국거래소(KRX), 금융감독원 전자공시시스템(DART), 미국 증권거래위원회(SEC EDGAR)의
            공개 원천 데이터를 기반으로 모든 칼럼과 백과사전을 작성·검수합니다. 만약 게시된 문서에서 수치 표기 오류,
            법령·세제 개정에 따른 변경 사항, 또는 저작권 관련 확인이 필요한 부분을 발견하시면 해당 URL과 함께 연락해 주십시오.
            편집책임자(윤희원)가 공시 원문과 공식 통계를 재대조한 뒤 영업일 기준 48시간 이내에 수정 및 회신해 드립니다.
          </p>
        </section>

        {/* 자주 묻는 질문 */}
        <section className="mt-8 bg-white/5 border border-white/10 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">자주 묻는 질문 (FAQ)</h2>
          <div className="space-y-5">
            {[
              { q: "서비스 이용 요금이 있나요?", a: "아니요. 스마트 투자 비서의 모든 거시경제 칼럼, 매일 1일 1경제학, 46대 주식 용어 백과사전 및 주식 계산기는 별도의 구독료 없이 100% 무료로 제공됩니다." },
              { q: "특정 주식 종목을 추천하거나 1:1 투자 상담을 해주시나요?", a: "아니요. 본 사이트는 자본시장법을 준수하는 순수 금융 교육·데이터 리서치 미디어이며, 특정 유가증권의 매수·매도 추천이나 개별 투자 자문 요청에는 응하지 않습니다." },
              { q: "금융 데이터와 공시 정보는 어디에서 가져오나요?", a: "금융감독원 Open DART, 한국거래소(KRX), 미국 SEC EDGAR 등 공신력 있는 공공 기관의 공개 데이터를 기반으로 정리하며, 시세 데이터는 거래소 정책에 따라 지연될 수 있습니다." },
              { q: "개인 정보와 문의 기록은 어떻게 관리되나요?", a: "문의 접수 시 입력하신 이름과 이메일은 오직 답변 발송을 위해서만 사용되며, 회신 및 민원 처리 완료 후 지체 없이 파기합니다. 제3자에게 판매하거나 마케팅 용도로 사용하지 않습니다." },
            ].map((faq, i) => (
              <div key={i} className="border-b border-white/10 pb-5 last:border-0 last:pb-0">
                <p className="font-bold text-white text-sm mb-2">Q. {faq.q}</p>
                <p className="text-gray-400 text-sm leading-relaxed break-keep">A. {faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
          <div className="flex justify-center gap-6 mt-3 flex-wrap">
            <Link href="/" className="hover:text-gray-300 transition-colors">홈으로</Link>
            <Link href="/about" className="hover:text-gray-300 transition-colors">서비스 소개</Link>
            <Link href="/economics" className="hover:text-gray-300 transition-colors">1일 1경제학</Link>
            <Link href="/guide" className="hover:text-gray-300 transition-colors">용어 백과사전</Link>
            <Link href="/privacy-policy" className="hover:text-gray-300 transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">이용약관</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
