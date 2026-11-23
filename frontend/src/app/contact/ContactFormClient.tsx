"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactFormClient() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
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
        const mailtoLink = `mailto:rnfjrlakdmf@gmail.com?subject=[스마트투자비서 문의] ${encodeURIComponent(form.subject)}&body=${encodeURIComponent(`이름: ${form.name}\n이메일: ${form.email}\n\n문의 내용:\n${form.message}`)}`;
        window.location.href = mailtoLink;
        setSubmitted(true);
      }
    } catch {
      const mailtoLink = `mailto:rnfjrlakdmf@gmail.com?subject=[스마트투자비서 문의] ${encodeURIComponent(form.subject)}&body=${encodeURIComponent(`이름: ${form.name}\n이메일: ${form.email}\n\n문의 내용:\n${form.message}`)}`;
      window.location.href = mailtoLink;
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
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
    );
  }

  return (
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
          <option value="correction">📝 칼럼·용어 백과 내용 정정 요청</option>
          <option value="data">📊 공시·재무 데이터 오류 신고</option>
          <option value="bug">🐛 서비스 기능 오류 신고</option>
          <option value="feature">💡 신규 교육 주제·기능 제안</option>
          <option value="copyright">⚖️ 저작권·개인정보 관련 문의</option>
          <option value="etc">기타</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">문의 내용 *</label>
        <textarea
          required
          rows={6}
          placeholder="문의 내용을 자세히 작성해 주세요. 내용 정정 요청이나 오류 신고의 경우 해당 페이지 주소(URL)를 함께 적어주시면 영업일 1~2일 내 신속히 확인 후 반영합니다."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm cursor-pointer"
      >
        {loading ? "전송 중..." : "📨 문의 및 정정 요청 보내기"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        제출하신 개인정보(이름, 이메일)는 문의 회신 목적으로만 사용되며, 처리 완료 후 지체 없이 파기됩니다.{" "}
        <Link href="/privacy-policy" className="text-blue-400 hover:underline">개인정보처리방침</Link>
      </p>
    </form>
  );
}
