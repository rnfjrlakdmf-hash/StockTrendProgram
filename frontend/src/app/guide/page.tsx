
"use client";

import React from 'react';
import { 
  Zap, Bell, Star, BarChart3, Users, 
  Search, TrendingUp, DollarSign, ShieldCheck, HelpCircle,
  ChevronRight, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function GuidePage() {
  const sections = [
    {
      title: "✨ AI 마켓 밸런스 브리핑",
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      color: "bg-yellow-400/10",
      description: "매일 아침 8시, 복잡한 뉴스를 AI가 한눈에 정리해드립니다.",
      steps: [
        "별표(☆)를 눌러 관심 종목을 등록하세요.",
        "매일 오전 8시, 호재 3개와 악재 3개의 팩트 요약이 도착합니다.",
        "초보자도 이해하기 쉬운 우리말로 시장 분위기를 파악하세요."
      ]
    },
    {
      title: "☀️ 마켓 리포트",
      icon: <Bell className="w-6 h-6 text-blue-400" />,
      color: "bg-blue-400/10",
      description: "시장이 열리고 닫힐 때, 당신의 성적표를 배달합니다.",
      steps: [
        "평일 09:05: 내 종목의 시작 가격(시가) 요약 알림",
        "평일 15:40: 오늘의 종가와 시장 지수(코스피 등) 요약 리포트",
        "유가, 금, 환율 등 핵심 지표가 내 종목에 맞춰 자동 포함됩니다."
      ]
    },
    {
      title: "💰 관심종목 & 수익 추적",
      icon: <Star className="w-6 h-6 text-green-400" />,
      color: "bg-green-400/10",
      description: "내가 담은 시점부터 지금까지, 수익금을 자동으로 계산합니다.",
      steps: [
        "종목을 관심종목에 담으면 '등록 시점 가격'이 기록됩니다.",
        "미국 주식은 당일 환율을 적용해 '원화'로 자동 계산됩니다.",
        "누적 수익금(원/$)을 보며 나의 투자 성과를 관리하세요."
      ]
    },
    {
      title: "🔍 테마 및 종목 스캐너",
      icon: <Search className="w-6 h-6 text-purple-400" />,
      color: "bg-purple-400/10",
      description: "지금 시장에서 가장 뜨거운 종목과 테마를 찾아내세요.",
      steps: [
        "당일 급등주와 거래량 상위 종목을 한눈에 확인합니다.",
        "현재 가장 강한 상승 테마와 관련 종목을 연결해서 분석하세요.",
        "다양한 보조지표를 통해 매수/매도 타이밍의 힌트를 얻으세요."
      ]
    },
    {
      title: "💬 커뮤니티 & 소통",
      icon: <Users className="w-6 h-6 text-pink-400" />,
      color: "bg-pink-400/10",
      description: "혼자 하는 투자가 아닌, 함께 나누는 투자를 시작하세요.",
      steps: [
        "게시판을 통해 다른 투자자들의 의견을 확인하세요.",
        "좋은 정보가 있다면 글을 써서 공유하고 댓글로 소통하세요.",
        "로그인(Google) 후 더욱 활발한 커뮤니티 활동이 가능합니다."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-20 px-6 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" />
            <span>이용 가이드</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
            스마트하게 이용하는<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              100% 활용 가이드
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            초보자부터 전문가까지, 우리 사이트의 모든 기능을 <br className="hidden md:block" />
            완벽하게 내 것으로 만드는 방법입니다.
          </p>
        </header>

        <div className="space-y-8">
          {sections.map((section, idx) => (
            <div 
              key={idx}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all duration-300 group"
            >
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3">
                  <div className={`${section.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl`}>
                    {section.icon}
                  </div>
                  <h2 className="text-2xl font-bold mb-3">{section.title}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    {section.description}
                  </p>
                </div>
                
                <div className="md:w-2/3 bg-black/20 rounded-2xl p-6 border border-white/5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ChevronRight className="w-3 h-3" /> Step by Step
                  </h3>
                  <div className="space-y-4">
                    {section.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-4">
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0 mt-0.5">
                          {sIdx + 1}
                        </div>
                        <p className="text-gray-300 text-[15px] leading-snug">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-3">지금 바로 시작해보세요!</h3>
            <p className="text-gray-400 text-sm mb-6">모든 기능은 무료로 제공되며, 관심종목 등록부터 시작해보세요.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/watchlist" className="bg-white text-black px-8 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all flex items-center gap-2">
                관심종목 등록하기 <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/" className="bg-white/10 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-white/20 transition-all">
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
