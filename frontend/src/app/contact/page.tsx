"use client";

import { useState, useRef } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Formspree를 통한 실제 이메일 발송
      const res = await fetch("https://formspree.io/f/xeajpqdn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        // Formspree 실패 시 mailto 폴백
        const mailtoLink = `mailto:rnfjrlakdmf@gmail.com?subject=[스마트투자비서 문의] ${encodeURIComponent(form.subject)}&body=${encodeURIComponent(`이름: ${form.name}\n이메일: ${form.email}\n\n문의 내용:\n${form.message}`)}`;
        window.location.href = mailtoLink;
        setSubmitted(true);
      }
    } catch (err) {
      // 네트워크 오류 시 mailto 폴백
      const mailtoLink = `mailto:rnfjrlakdmf@gmail.com?subject=[스마트투자비서 문의] ${encodeURIComponent(form.subject)}&body=${encodeURIComponent(`이름: ${form.name}\n이메일: ${form.email}\n\n문의 내용:\n${form.message}`)}`;
      window.location.href = mailtoLink;
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-3">문의하기</h1>
          <p className="text-gray-400 leading-relaxed">
            서비스 이용 중 불편한 점이나 건의사항이 있으시면 아래 양식으로 보내주세요.<br />
            영업일 기준 1~2일 내에 이메일로 직접 답변 드리겠습니다.
          </p>
        </div>

        {/* 빠른 연락 방법 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: "📧", label: "이메일 직접 문의", value: "rnfjrlakdmf@gmail.com", sub: "영업일 기준 1~2일 내 답변" },
            { icon: "🐛", label: "버그 신고", value: "아래 양식 이용", sub: "서비스 오류·데이터 이상 신고" },
            { icon: "💡", label: "기능 제안", value: "아래 양식 이용", sub: "새로운 기능 아이디어 환영" },
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

        {/* 문의 양식 */}
        {submitted ? (
          <div className="text-center bg-green-500/10 border border-green-500/30 rounded-3xl p-12">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">문의가 접수되었습니다!</h2>
            <p className="text-gray-400 mb-6">
              소중한 의견 감사합니다. 영업일 기준 1~2일 내에 입력하신 이메일로 직접 답변 드리겠습니다.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">이름 *</label>
                <input
                  type="text"
                  required
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">이메일 * (답변 수신)</label>
                <input
                  type="email"
                  required
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">문의 유형 *</label>
              <select
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              >
                <option value="" disabled>문의 유형을 선택해 주세요</option>
                <option value="bug">🐛 버그·오류 신고</option>
                <option value="data">📊 데이터 오류 신고</option>
                <option value="feature">💡 기능 제안·건의</option>
                <option value="account">👤 계정·로그인 문의</option>
                <option value="notification">🔔 알림 관련 문의</option>
                <option value="partnership">🤝 제휴·사업 문의</option>
                <option value="etc">기타</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">문의 내용 *</label>
              <textarea
                required
                rows={6}
                placeholder="문의 내용을 자세히 작성해 주세요. 오류 신고의 경우 발생한 상황과 사용하신 기기(PC/모바일)를 함께 적어주시면 빠른 처리에 도움이 됩니다."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  전송 중...
                </>
              ) : (
                "📨 문의 보내기"
              )}
            </button>

            <p className="text-xs text-gray-600 text-center">
              제출하신 개인정보(이름, 이메일)는 문의 처리 목적으로만 사용되며, 처리 완료 후 즉시 파기됩니다.{" "}
              <Link href="/privacy-policy" className="text-blue-500 hover:underline">개인정보처리방침</Link>
            </p>
          </form>
        )}

        {/* 자주 묻는 질문 */}
        <div className="mt-12 bg-white/5 border border-white/10 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">자주 묻는 질문 (FAQ)</h2>
          <div className="space-y-5">
            {[
              { q: "서비스 이용 요금이 있나요?", a: "아니요. 스마트 투자 비서의 모든 서비스(시황 리포트, 공시 알림, 푸시 알림 등)는 완전 무료입니다. 별도의 구독료나 결제가 필요하지 않습니다." },
              { q: "특정 주식 종목을 추천해 주나요?", a: "아니요. 저희는 특정 주식의 매수·매도를 추천하거나 투자 자문을 제공하지 않습니다. 금융감독원 DART, 미국 SEC 등 공공 기관의 공시 데이터를 그대로 전달해 드리는 정보 서비스입니다." },
              { q: "데이터가 실시간인가요?", a: "국내 DART 공시는 접수 즉시, 미국 SEC Form 4 공시는 미국 장중 시간(KST 기준 야간)에 실시간으로 감지하여 알림을 발송합니다. 주가 데이터는 각 거래소의 정책에 따라 15~20분 지연될 수 있습니다." },
              { q: "개인 정보는 어떻게 관리되나요?", a: "회원 가입 시 이메일과 닉네임만 수집하며, 관심 종목 및 알림 설정은 Google Firebase에 안전하게 저장됩니다. 제3자에게 개인정보를 판매하거나 마케팅 목적으로 사용하지 않습니다." },
            ].map((faq, i) => (
              <div key={i} className="border-b border-white/10 pb-5 last:border-0 last:pb-0">
                <p className="font-bold text-white text-sm mb-2">Q. {faq.q}</p>
                <p className="text-gray-400 text-sm leading-relaxed">A. {faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-600 text-sm">
          <div className="flex justify-center gap-6 mt-3 flex-wrap">
            <Link href="/" className="hover:text-gray-400 transition-colors">홈으로</Link>
            <Link href="/about" className="hover:text-gray-400 transition-colors">서비스 소개</Link>
            <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">이용약관</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
