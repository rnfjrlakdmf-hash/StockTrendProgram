'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AIDisclaimerProps {
  className?: string;
  isCompact?: boolean;
}

const AIDisclaimer: React.FC<AIDisclaimerProps> = ({ className = '', isCompact = false }) => {
  return (
    <div className={`mt-6 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 flex gap-3 items-start group hover:border-amber-500/30 transition-colors ${className}`}>
      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
        <AlertTriangle size={isCompact ? 16 : 18} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-amber-500/90 uppercase tracking-wider">법적 면책 고지</span>
        <p className={`${isCompact ? 'text-[11px]' : 'text-xs'} leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors`}>
          본 서비스에서 제공하는 모든 AI 분석 및 정보는 통계 데이터와 알고리즘을 바탕으로 한 **투자 참고용**이며, 
          특정 종목에 대한 **투자 권유나 추천이 아닙니다.** 모든 투자의 최종 결정과 결과에 대한 책임은 **투자자 본인**에게 있습니다.
        </p>
      </div>
    </div>
  );
};

export default AIDisclaimer;
