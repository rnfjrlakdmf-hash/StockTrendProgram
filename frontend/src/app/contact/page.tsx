"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // 실제 이메일 발송 대신 간단히 제출 완료 상태로 전환
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-white mb-3">문의하기</h1>
          <p className="text-gray-400 leading-relaxed">
            서비스 이용 중 불편한 점이나 건의사항이 있으시면 아래 양식으로 보내주세요.<br />
            최대한 빠르게 확인 후 답변 드리겠습니다.
          </p>
        </div>

        {/* 빠른 연락 방법 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: "📧", label: "이메일", value: "rnfjr@gmail.com", sub: "영업일 기준 1~2일 내 답변" },
            { icon: "🐛", label: "버그 신고", value: "문의 양식 이용", sub: "서비스 오류·데이터 이상 신고" },
            { icon: "💡", label: "기능 제안", value: "문의 양식 이용", sub: "새로운 기능 아이디어 환영" },
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
              소중한 의견 감사합니다. 영업일 기준 1~2일 내에 이메일로 답변 드리겠습니다.
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
                <label className="block text-sm font-bold text-gray-300 mb-2">이메일 *</label>
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
                <option value="etc">기타</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">문의 내용 *</label>
              <textarea
                required
                rows={6}
                placeholder="문의 내용을 자세히 작성해 주세요. 스크린샷이 있다면 내용에 설명해 주시면 빠른 처리에 도움이 됩니다."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
              />
            </div>

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
              제출하신 개인정보는 문의 처리 목적으로만 사용되며, 처리 완료 후 즉시 파기됩니다.{" "}
              <Link href="/privacy-policy" className="text-blue-500 hover:underline">개인정보처리방침</Link>
            </p>
          </form>
        )}

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-600 text-sm">
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/" className="hover:text-gray-400 transition-colors">홈으로</Link>
            <Link href="/about" className="hover:text-gray-400 transition-colors">서비스 소개</Link>
            <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">개인정보처리방침</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
