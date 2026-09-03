'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface AIDisclaimerProps {
  className?: string;
  isCompact?: boolean;
}

const AIDisclaimer: React.FC<AIDisclaimerProps> = ({ className = '', isCompact = false }) => {
  return (
    <div className={`mt-6 p-4 rounded-2xl bg-zinc-950/80 border border-white/10 flex gap-3.5 items-start group hover:border-amber-500/30 transition-colors shadow-lg ${className}`}>
      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 border border-amber-500/20">
        <ShieldAlert size={isCompact ? 16 : 18} />
      </div>
      <div className="flex flex-col gap-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-amber-400 tracking-wider">법적 면책 고지 및 투자 유의사항</span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/10 text-zinc-400">DISCLAIMER</span>
        </div>
        <p className={`${isCompact ? 'text-[11px]' : 'text-xs'} leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors break-keep`}>
          본 서비스는 자본시장법상 유사투자자문업 또는 금융투자업에 해당하지 않으며, 1:1 투자 자문이나 개별 종목 매수·매도 지시를 일절 행하지 않습니다. 
          화면에 표출되는 모든 데이터(DART 전자공시, 재무제표, 뉴스 감성 분석, 알고리즘 퀀트 점수)는 공개된 시장 정보를 전산적으로 취합한 <strong className="text-zinc-200">단순 사실 자료 및 통계적 참고 지표</strong>입니다. 
          특정 금융투자상품의 가치 상승이나 수익률을 보장하지 않으며, 모든 투자의 최종 판단과 결과에 대한 책임은 <strong className="text-zinc-200">투자자 본인</strong>에게 귀속됩니다.
        </p>
      </div>
    </div>
  );
};

export default AIDisclaimer;
