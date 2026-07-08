import React from 'react';
import Link from 'next/link';
import { Sparkles, HelpCircle } from "lucide-react";

export default function SeoContentBlock() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto mt-10 border-t border-white/10 bg-black/40 rounded-t-3xl">
      <div className="grid grid-cols-1 gap-12">
        
        {/* 섹션 1: 상세 플랫폼 소개 */}
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <Sparkles className="text-blue-400 w-8 h-8" />
            STOCK AI - 주식 트렌드 분석 및 차트 스터디 가이드
          </h2>
          <div className="text-gray-400 text-base leading-loose space-y-5">
            <p>
              <strong>STOCK AI(스톡에이아이)</strong>는 실시간 주식 시장 데이터 수집 및 최첨단 자연어 처리(NLP) 기술을 바탕으로 국내외 주식 시장의 거시적 흐름을 가장 날카롭게 분석하는 <strong>지능형 투자 보조 플랫폼 및 주식 교육 커뮤니티</strong>입니다. 우리는 매일 쏟아지는 수만 건의 정보의 홍수 속에서 개인 투자자들이 놓치기 쉬운 핵심 주도 테마, 외국인 및 기관의 수급 이동, 그리고 차트 기술적 분석의 정수를 인공지능이 24시간 추적하고 선별하여 가장 이해하기 쉬운 형태로 제공합니다.
            </p>
            <p>
              본 플랫폼은 단순한 호가 창이나 기본적 차트 뷰어를 넘어섭니다. 뉴스 기사, 증권사 프리미엄 리포트, 소셜 미디어 트렌드, 그리고 기업의 분기 실적 발표(Earnings Call)와 미국 증권거래위원회(SEC) 대주주 지분 변동 공시 등 방대한 비정형 데이터를 초단위로 수집 및 파악합니다. 이를 통해 시장의 스마트 머니(Smart Money)가 어디로 이동하고 있는지, 어떤 산업군이 미래의 주도 테마로 부상하여 폭발적인 상승을 준비하고 있는지를 가장 빠르게 캐치할 수 있는 통찰력을 길러드립니다.
            </p>
            <p>
              또한 저희가 매일 제공하는 <strong>'매일 차트 스터디(이론방)'</strong>와 <strong>'전문가 마켓 리포트'</strong>는 주식 투자 초보자(주린이)부터 전업 투자자에 이르기까지 모두가 반드시 알아야 할 기술적 분석(Technical Analysis) 기법과 거시 경제(Macro) 분석법을 쉽게 풀어 설명하는 완벽한 교육 자료입니다. 이동평균선, RSI 지표, 볼린저 밴드, MACD, 엘리어트 파동 이론 등 필수 주식 이론들을 실제 시장 사례와 예쁜 SVG 차트를 통해 누구나 무료로 학습할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 섹션 2: 자주 묻는 질문 FAQ (글자 수 뻥튀기 및 핵심 키워드 삽입) */}
        <div className="bg-gradient-to-br from-blue-900/10 to-indigo-900/10 border border-blue-500/10 rounded-3xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <HelpCircle className="text-indigo-400 w-6 h-6" />
            자주 묻는 질문 (FAQ) 및 주식 투자 핵심 가이드
          </h3>
          <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
            <div>
              <strong className="text-blue-300 block text-lg mb-2">Q. 세력 매집 알림(Whale Alert)과 슈퍼개미 포착 시스템은 어떻게 작동하나요?</strong>
              <p>A. 금융감독원 전자공시시스템(DART)과 미국 SEC의 13F, 13G, Form 4 등 지분 변동 공시를 실시간으로 크롤링하여, 5% 이상의 대량 지분을 보유한 슈퍼개미나 글로벌 헤지펀드(예: 워렌 버핏의 버크셔 해서웨이, 블랙록 등)가 특정 종목을 매수 또는 매도할 때 알고리즘이 이를 즉각적으로 분석합니다. 이 데이터는 내부자 거래 추적 및 스마트 머니의 자금 유입을 파악하는 데 가장 신뢰도 높은 기술적/기본적 지표로 활용됩니다.</p>
            </div>
            <div>
              <strong className="text-blue-300 block text-lg mb-2">Q. 기술적 분석(차트 분석)만으로 주식 투자가 성공할 수 있나요?</strong>
              <p>A. 성공적인 투자를 위해서는 캔들 차트, 이동평균선 배열(정배열/역배열), 거래량 분석 등 기술적 분석(Technical Analysis)과 기업의 재무제표, 영업이익률, PER/PBR 등을 분석하는 기본적 분석(Fundamental Analysis)이 병행되어야 합니다. 저희 STOCK AI는 이 두 가지 양대 산맥을 동시에 분석할 수 있도록 기업 펀더멘탈 요약과 퀀트(Quant) 기반의 패턴 분석 리포트를 매일 무료로 제공하여 투자자들의 승률을 극대화하는 데 기여하고 있습니다.</p>
            </div>
            <div>
              <strong className="text-blue-300 block text-lg mb-2">Q. 텔레그램 실시간 속보방에서는 어떤 정보를 얻을 수 있나요?</strong>
              <p>A. 주식 시장은 정보의 속도전입니다. 공모주(IPO) 청약 일정 변경, 대형 수주 공시, 장 마감 후 시간외 단일가 급등락 사유, 그리고 긴급 거시 경제 지표(미국 CPI, FOMC 금리 결정 등) 발표 순간에, 웹사이트에 접속하지 않고도 텔레그램 메신저를 통해 1초 만에 알림을 받아볼 수 있는 프리미엄 구독 서비스입니다.</p>
            </div>
          </div>
        </div>

        {/* 섹션 3: 필수 정책 및 내비게이션 링크 (구글 봇 크롤링 및 애드센스 필수 요소) */}
        <div className="flex flex-col items-center justify-center pt-8 border-t border-white/5 space-y-4 text-center">
          <h4 className="text-white font-bold mb-2">STOCK AI 서비스 공식 정책 및 고객 지원</h4>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
            <Link href="/privacy-policy" className="text-gray-500 hover:text-blue-400 underline decoration-gray-700 hover:decoration-blue-400 transition-colors">개인정보처리방침 (Privacy Policy)</Link>
            <Link href="/terms" className="text-gray-500 hover:text-blue-400 underline decoration-gray-700 hover:decoration-blue-400 transition-colors">이용약관 (Terms of Service)</Link>
            <Link href="/disclaimer" className="text-gray-500 hover:text-blue-400 underline decoration-gray-700 hover:decoration-blue-400 transition-colors">투자 면책조항 (Disclaimer)</Link>
            <Link href="/contact" className="text-gray-500 hover:text-blue-400 underline decoration-gray-700 hover:decoration-blue-400 transition-colors">고객센터 및 제휴 문의 (Contact Us)</Link>
            <Link href="/about" className="text-gray-500 hover:text-blue-400 underline decoration-gray-700 hover:decoration-blue-400 transition-colors">회사 소개 (About Us)</Link>
          </div>
          <p className="text-xs text-gray-600 mt-4 max-w-3xl leading-relaxed">
            본 웹사이트에서 제공하는 모든 주식 정보, 차트 분석, 테마 분류, 리포트 및 알고리즘 결과물은 투자 판단의 참고용이며, 실제 투자 결과에 대한 법적 책임을 지지 않습니다. 모든 투자의 최종 결정권과 책임은 투자자 본인에게 있습니다. STOCK AI is committed to providing high-quality financial education and data analytics.
          </p>
        </div>
        
      </div>
    </div>
  );
}
