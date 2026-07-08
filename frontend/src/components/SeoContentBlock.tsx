import React from 'react';
import Link from 'next/link';
import { Send, BookOpen, Bell, BarChart3, Shield, HelpCircle, ExternalLink } from "lucide-react";

// ─────────────────────────────────────────────
// SeoContentBlock v3
// 목적: 구글 애드센스 승인 + 텔레그램 구독 유도
// 디자인: 깔끔한 카드 그리드 + 접이식 FAQ
// ─────────────────────────────────────────────

const FEATURES = [
  {
    icon: Bell,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    title: "실시간 수급 알림",
    desc: "외국인·기관 순매수 1위 포착, DART 공시, 상한가 급등 알림을 푸시 알림으로 즉시 수신합니다.",
  },
  {
    icon: BarChart3,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    title: "AI 차트 스터디",
    desc: "이동평균선, RSI, 볼린저 밴드, MACD 등 필수 기술적 분석 이론을 매일 무료로 학습할 수 있습니다.",
  },
  {
    icon: Send,
    color: "text-[#0088cc]",
    bg: "bg-[#0088cc]/10",
    border: "border-[#0088cc]/20",
    title: "텔레그램 속보 채널",
    desc: "미국·국내 증시 속보를 텔레그램으로 실시간 수신하세요. 완전 무료, 구독 취소 언제든 가능합니다.",
  },
  {
    icon: Shield,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    title: "투자 면책 원칙",
    desc: "본 서비스는 투자 참고용 정보만을 제공하며, 투자 자문이 아닙니다. 최종 투자 판단은 본인에게 있습니다.",
  },
];

const FAQ = [
  {
    q: "세력 매집(Whale Alert) 포착 시스템은 어떻게 작동하나요?",
    a: "금융감독원 DART와 미국 SEC(13F, Form 4) 공시를 실시간으로 분석합니다. 5% 이상 대량 지분 변동이나 임원 거래가 발생하면 즉시 알림을 전송하여 스마트 머니의 움직임을 포착합니다.",
  },
  {
    q: "기술적 분석과 기본적 분석, 무엇이 더 중요한가요?",
    a: "두 분석법은 상호 보완적입니다. 당사는 캔들 차트·거래량 기반의 기술적 분석과 PER·PBR·영업이익률 등 펀더멘탈 분석을 통합 제공하여 투자자의 판단을 돕습니다.",
  },
  {
    q: "텔레그램 채널에서는 어떤 정보를 받을 수 있나요?",
    a: "상한가·급등주 속보, 외국인 순매수 1위 포착, FOMC·CPI 등 미국 거시경제 지표 발표, 장 마감 후 시간외 주요 이슈 등 핵심 정보를 1초 안에 받아볼 수 있습니다.",
  },
  {
    q: "주가 알림(가격 알림)은 어떻게 설정하나요?",
    a: "종목 상세 페이지에서 목표 가격을 입력하면 해당 가격 도달 시 스마트폰 잠금화면에 즉시 푸시 알림이 전송됩니다. 로그인 후 무료로 이용 가능합니다.",
  },
];

export default function SeoContentBlock() {
  return (
    <section
      aria-label="서비스 안내 및 정책"
      className="border-t border-white/[0.06] bg-gradient-to-b from-transparent to-black/30 mt-10"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 space-y-10">

        {/* ── 상단 헤딩 (SEO용 h2) ── */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white/80 tracking-tight">
            스마트 투자 비서 (STOCK AI) — 서비스 안내
          </h2>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">
            인공지능 기반 주식 수급 분석, 실시간 공시 알림, AI 차트 스터디를 무료로 제공합니다.
          </p>
        </div>

        {/* ── 4개 특징 카드 ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map(({ icon: Icon, color, bg, border, title, desc }) => (
            <div
              key={title}
              className={`${bg} ${border} border rounded-2xl p-4 space-y-2`}
            >
              <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-white text-sm font-semibold leading-tight">{title}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── 텔레그램 구독 CTA (작고 깔끔하게) ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0088cc]/10 border border-[#0088cc]/20 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-[#0088cc] shrink-0" />
            <div>
              <p className="text-white text-sm font-semibold">실시간 주식 속보 텔레그램 채널</p>
              <p className="text-gray-400 text-xs">세력 포착 · 상한가 · 미국증시 속보 — 무료</p>
            </div>
          </div>
          <a
            href="https://t.me/stocktrend_live"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 bg-[#0088cc] hover:bg-[#006fa6] text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors"
          >
            무료 구독 <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* ── FAQ (접이식 없이 심플하게) ── */}
        <div className="space-y-3">
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> 자주 묻는 질문
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FAQ.map(({ q, a }) => (
              <div
                key={q}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-1.5"
              >
                <p className="text-white/80 text-sm font-semibold leading-snug">Q. {q}</p>
                <p className="text-gray-500 text-xs leading-relaxed">A. {a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 하단 정책 링크 (한 줄 푸터) ── */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs text-center sm:text-left">
            © 2026 StockTrend · 본 서비스는 투자 참고용 정보를 제공하며 투자 권유가 아닙니다.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-600">
            <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">이용약관</Link>
            <Link href="/disclaimer" className="hover:text-gray-400 transition-colors">면책조항</Link>
            <Link href="/contact" className="hover:text-gray-400 transition-colors">고객센터</Link>
            <Link href="/about" className="hover:text-gray-400 transition-colors">서비스 소개</Link>
          </div>
        </div>

      </div>
    </section>
  );
}
