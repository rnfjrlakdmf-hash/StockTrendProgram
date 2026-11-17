'use client';

import React, { useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import {
    Sparkles, Play, CheckCircle2, AlertTriangle, ShieldAlert,
    TrendingUp, TrendingDown, ArrowRight, RefreshCw,
    Sliders, FileText, Check, Bot, Zap, Info, ShieldCheck, ExternalLink
} from 'lucide-react';

interface TuningStep {
    step: number;
    title: string;
    description: string;
    reason: string;
    buy_dip: number;
    take_profit: number;
    stop_loss: number;
    metrics: {
        total_return_pct: number;
        win_rate_pct: number;
        total_trades: number;
        mdd_pct: number;
        halted: boolean;
        profit_factor: number;
    };
    loss_analysis?: {
        total_losses: number;
        reasons: {
            falling_knife: number;
            stop_loss: number;
            max_drawdown: number;
            time_decay: number;
        };
        main_loss_cause: string;
    };
}

interface OutOfSampleResult {
    period: string;
    before_tune: {
        return_pct: number;
        win_rate_pct: number;
        trades: number;
    };
    after_tune: {
        return_pct: number;
        win_rate_pct: number;
        trades: number;
    };
    status: 'OVERFITTING_WARNING' | 'STABLE_IMPROVEMENT' | 'INSUFFICIENT_SAMPLES';
    warning_message: string;
}

interface StrategyLabResponse {
    status: string;
    symbol: string;
    searched_name?: string;
    resolved_symbol?: string;
    rule_summary: {
        buy_rule: string;
        sell_rule: string;
    };
    benchmark_buy_and_hold_return_pct: number;
    tuning_steps: TuningStep[];
    out_of_sample_1year: OutOfSampleResult;
    strategy_config: any;
}

interface StrategyLabWidgetProps {
    onDeploySuccess?: (symbol: string) => void;
}

export default function StrategyLabWidget({ onDeploySuccess }: StrategyLabWidgetProps) {
    // 입력 상태
    const [symbolInput, setSymbolInput] = useState('삼성전자');
    const [buyDip, setBuyDip] = useState<number>(3.0);
    const [takeProfit, setTakeProfit] = useState<number>(5.0);
    const [stopLoss, setStopLoss] = useState<number>(5.0);
    const [maxDd, setMaxDd] = useState<number>(15.0);
    const [years, setYears] = useState<number>(5);

    // 실행 및 결과 상태
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [result, setResult] = useState<StrategyLabResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [deploying, setDeploying] = useState(false);
    const [deploySuccess, setDeploySuccess] = useState<string | null>(null);

    // 인기 종목 퀵 버튼
    const quickPicks = [
        { name: '삼성전자', code: '005930' },
        { name: 'SK하이닉스', code: '000660' },
        { name: '현대차', code: '005380' },
        { name: '카카오', code: '035720' },
        { name: '에코프로비엠', code: '247540' },
        { name: '알테오젠', code: '196170' },
        { name: '셀트리온', code: '068270' },
        { name: '테슬라', code: 'TSLA' },
        { name: '엔비디아', code: 'NVDA' },
        { name: '애플', code: 'AAPL' },
        { name: '팔란티어', code: 'PLTR' }
    ];

    // 백테스트 & AI 자가 교정 실행
    const handleRunAutoTuning = async () => {
        if (!symbolInput.trim()) {
            alert('종목명 또는 종목코드를 입력해주세요.');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        setDeploySuccess(null);
        setResult(null);

        try {
            setLoadingStage('과거 5년치 실시간 주가 캔들 데이터 수집 중...');
            
            const payload = {
                symbol: symbolInput.trim(),
                buy_dip: Number(buyDip),
                take_profit: Number(takeProfit),
                stop_loss: Number(stopLoss),
                max_dd: Number(maxDd),
                years: Number(years),
            };

            const res = await fetch(`${API_BASE_URL}/api/strategy-lab/tune`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || '매매 연습장 엔진 응답 실패');
            }

            const data: StrategyLabResponse = await res.json();
            setResult(data);
        } catch (err: any) {
            console.error('Tuning error:', err);
            setErrorMsg(err.message || '시험 중 오류가 발생했습니다. 종목명을 다시 확인해주세요.');
        } finally {
            setLoading(false);
            setLoadingStage('');
        }
    };

    // 실전 자동매매 봇에 등록
    const handleDeployToAutoTrader = async () => {
        if (!result || !result.strategy_config) return;
        setDeploying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/strategy-lab/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strategy_config: result.strategy_config
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || '자동매매 등록에 실패했습니다.');
            }

            setDeploySuccess(data.message || '성공적으로 자동매매 엔진에 등록되었습니다!');
            if (onDeploySuccess) {
                onDeploySuccess(result.symbol);
            }
        } catch (err: any) {
            alert('등록 실패: ' + err.message);
        } finally {
            setDeploying(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* 상단 헤더 배너 */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1222] via-[#141b34] to-[#1c1236] border-2 border-violet-500/40 p-6 sm:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-violet-400" />
                            <span>AI 자율 매매 연습장</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            스스로 손실 원인 분석 &amp; 3회 규칙 교정
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            최근 1년 블라인드 과적합(Overfitting) 검증
                        </span>
                    </div>

                    <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                        <span>🧪</span>
                        <span>돈 잃을 때마다 스스로 고치는 AI 매매 연습장</span>
                    </h2>

                    <p className="text-xs sm:text-sm text-zinc-300 mt-2.5 leading-relaxed max-w-4xl">
                        대표님께서 평소 생각하신 <strong className="text-violet-300">매매 기준(언제 사고, 언제 팔지)</strong>을 입력하시면, 
                        AI가 지난 5년 치 실제 주가로 시험하고, <strong className="text-amber-300">돈을 잃은 거래만 골라 왜 잃었는지(떨어지는 칼날 매수, 손절선 터치 등) 분석</strong>한 뒤 
                        규칙을 3번 스스로 고쳐 수익률을 개선합니다. 마지막 1년은 미사용 데이터로 남겨두어 <strong className="text-emerald-300">과적합 여부까지 검증</strong>한 후 대표이사 자동매매 봇에 즉시 등록할 수 있습니다.
                    </p>
                </div>
            </div>

            {/* 매매 규칙 설정 패널 */}
            <div className="bg-[#0b101d] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-3">
                        <Sliders className="w-5 h-5 text-violet-400" />
                        <span>1. 종목 및 매매 규칙 입력</span>
                    </h3>

                    {/* 추천 종목 퀵 칩 */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        <span className="text-xs text-zinc-400 mr-1">추천 종목:</span>
                        {quickPicks.map((p) => (
                            <button
                                key={p.code}
                                type="button"
                                onClick={() => setSymbolInput(p.name)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    symbolInput === p.name || symbolInput === p.code
                                        ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/30'
                                        : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10'
                                }`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>

                    {/* 입력 그리드 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                        {/* 종목 입력 */}
                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                                <span>🔍 종목 검색 (국내/해외)</span>
                                <span className="text-[10px] text-zinc-400">엔터(Enter) 지원</span>
                            </label>
                            <input
                                type="text"
                                value={symbolInput}
                                onChange={(e) => setSymbolInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRunAutoTuning();
                                }}
                                placeholder="예: 카카오, 셀트리온, TSLA, 엔비디아"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500 transition-all font-medium placeholder:text-zinc-500"
                            />
                        </div>

                        {/* 매수 하락폭 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                                <span>🔻 살 때 (일일 급락폭)</span>
                                <span className="text-violet-400 font-bold">-{buyDip}%</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="20"
                                    value={buyDip}
                                    onChange={(e) => setBuyDip(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500 font-bold"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-zinc-400">% 하락 시</span>
                            </div>
                        </div>

                        {/* 익절 목표 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                                <span>🎯 팔 때 (익절 목표)</span>
                                <span className="text-emerald-400 font-bold">+{takeProfit}%</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="50"
                                    value={takeProfit}
                                    onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500 font-bold text-emerald-300"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-zinc-400">% 수익 시</span>
                            </div>
                        </div>

                        {/* 손절선 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                                <span>🛑 손절선 (위험 차단)</span>
                                <span className="text-rose-400 font-bold">-{stopLoss}%</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="30"
                                    value={stopLoss}
                                    onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500 font-bold text-rose-300"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-zinc-400">% 손실 시</span>
                            </div>
                        </div>

                        {/* 최대 손실 한도 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                                <span>🛡️ 계좌 한도 (매매 중단)</span>
                                <span className="text-amber-400 font-bold">최대 {maxDd}%</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="1"
                                    min="5"
                                    max="50"
                                    value={maxDd}
                                    onChange={(e) => setMaxDd(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-violet-500 font-bold text-amber-300"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-zinc-400">% 감소 시</span>
                            </div>
                        </div>
                    </div>

                    {/* 쉬운 설명 팁 */}
                    <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5 text-xs text-zinc-400">
                        <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                        <div>
                            <strong className="text-zinc-200">규칙 작동 방식: </strong>
                            장 마감 후 하루 <span className="text-violet-300">-{buyDip}%</span> 이상 급락하면, 다음 날 아침 시초가에 매수하고,
                            산 값보다 <span className="text-emerald-300">+{takeProfit}%</span> 오르면 익절, 
                            <span className="text-rose-300">-{stopLoss}%</span> 떨어지면 손절합니다.
                            최근 5년 데이터 중 <span className="text-amber-300">앞선 4년으로 학습 및 규칙을 교정</span>하고, <span className="text-sky-300">마지막 1년은 미사용 블라인드 검증용</span>으로 남겨둡니다.
                        </div>
                    </div>
                </div>

                {/* 시작 버튼 */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
                    <div className="text-xs text-zinc-400">
                        {loading && (
                            <span className="inline-flex items-center gap-2 text-violet-300 font-medium animate-pulse">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                {loadingStage || 'AI 알고리즘이 과거 주가를 시험하고 있습니다...'}
                            </span>
                        )}
                        {!loading && !result && (
                            <span>💡 입력 후 버튼을 누르면 AI가 손실 원인을 스스로 고치는 3단계 시뮬레이션을 수행합니다.</span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleRunAutoTuning}
                        disabled={loading}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-violet-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>AI 학습 및 규칙 교정 진행 중...</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 fill-white" />
                                <span>AI 자율 학습 &amp; 3단계 규칙 교정 시작</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 에러 메시지 */}
            {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* 결과 리포트 영역 */}
            {result && (
                <div className="space-y-6 animate-fade-in">
                    {/* 1. 내가 정리한 매매 규칙 & 비교 카드 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 규칙 두 줄 요약 */}
                        <div className="bg-[#0e1424] border border-violet-500/30 rounded-2xl p-5 shadow-lg">
                            <div className="flex items-center gap-2 text-violet-400 text-xs font-bold mb-2">
                                <FileText className="w-4 h-4" />
                                <span>1. 대표님의 매매 방법을 정리한 규칙</span>
                            </div>
                            <div className="space-y-2 mt-3">
                                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-zinc-200">
                                    <span className="text-violet-300 font-bold mr-1.5">[살 때]</span>
                                    {result.rule_summary.buy_rule}
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-zinc-200">
                                    <span className="text-amber-300 font-bold mr-1.5">[팔 때]</span>
                                    {result.rule_summary.sell_rule}
                                </div>
                            </div>
                        </div>

                        {/* 처음 결과 & 단순 보유 비교 */}
                        <div className="bg-[#0e1424] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400 text-xs font-bold">2. 초기 규칙 결과 vs 단순 보유</span>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/5 text-zinc-300">
                                    학습 기간 4년
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 my-3">
                                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                                    <div className="text-[11px] text-zinc-400 mb-1">처음 규칙 수익률</div>
                                    <div className={`text-lg sm:text-xl font-black ${
                                        result.tuning_steps[0]?.metrics.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                        {result.tuning_steps[0]?.metrics.total_return_pct > 0 ? '+' : ''}
                                        {result.tuning_steps[0]?.metrics.total_return_pct.toFixed(1)}%
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-1">
                                        승률 {result.tuning_steps[0]?.metrics.win_rate_pct.toFixed(0)}% · {result.tuning_steps[0]?.metrics.total_trades}회 매매
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                                    <div className="text-[11px] text-zinc-400 mb-1">그냥 들고 있었을 때</div>
                                    <div className={`text-lg sm:text-xl font-black ${
                                        result.benchmark_buy_and_hold_return_pct >= 0 ? 'text-amber-400' : 'text-zinc-400'
                                    }`}>
                                        {result.benchmark_buy_and_hold_return_pct > 0 ? '+' : ''}
                                        {result.benchmark_buy_and_hold_return_pct.toFixed(1)}%
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-1">
                                        Buy &amp; Hold 기준
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] text-zinc-400">
                                💡 돈을 잃었더라도 걱정하지 마세요. 아래에서 AI가 손실 원인을 찾아 스스로 규칙을 바꿉니다.
                            </p>
                        </div>
                    </div>

                    {/* 2. 🔁 AI 3단계 자율 교정 표 (하이라이트) */}
                    <div className="bg-[#0b101d] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    <span>3. AI 손실 원인 분석 &amp; 단계별 규칙 교정 과정</span>
                                </h3>
                                <p className="text-xs text-zinc-400 mt-1">
                                    AI가 돈을 잃은 거래를 집중 분석하여 가장 문제가 된 규칙을 하나씩 수정해 나간 과정입니다.
                                </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 w-fit">
                                총 3회 자가 개선 완료
                            </span>
                        </div>

                        {/* 단계별 비교 테이블 */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 text-[11px]">
                                        <th className="py-3 px-3">단계</th>
                                        <th className="py-3 px-3">적용된 규칙</th>
                                        <th className="py-3 px-3 text-center">수익률</th>
                                        <th className="py-3 px-3 text-center">승률 / 거래수</th>
                                        <th className="py-3 px-3">손실 원인 및 수정 사유</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-zinc-200">
                                    {result.tuning_steps.map((st) => {
                                        const isFinal = st.step === 3;
                                        const isInitial = st.step === 0;
                                        const ret = st.metrics.total_return_pct;

                                        return (
                                            <tr
                                                key={st.step}
                                                className={`transition-colors ${
                                                    isFinal
                                                        ? 'bg-violet-950/20 hover:bg-violet-950/30'
                                                        : 'hover:bg-white/[0.02]'
                                                }`}
                                            >
                                                {/* 단계 배지 */}
                                                <td className="py-3.5 px-3 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1 ${
                                                        isFinal
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                            : isInitial
                                                            ? 'bg-zinc-800 text-zinc-300'
                                                            : 'bg-violet-500/20 text-violet-300'
                                                    }`}>
                                                        {st.title}
                                                        {isFinal && ' (최적)'}
                                                    </span>
                                                </td>

                                                {/* 적용된 규칙 */}
                                                <td className="py-3.5 px-3">
                                                    <div className="font-semibold text-white">
                                                        {st.description}
                                                    </div>
                                                    <div className="text-[11px] text-zinc-400 mt-0.5">
                                                        매수: -{st.buy_dip}% | 익절: +{st.take_profit}% | 손절: -{st.stop_loss}%
                                                    </div>
                                                </td>

                                                {/* 수익률 */}
                                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                    <span className={`text-sm sm:text-base font-black ${
                                                        ret > 0 ? 'text-emerald-400' : ret < 0 ? 'text-rose-400' : 'text-zinc-300'
                                                    }`}>
                                                        {ret > 0 ? '+' : ''}{ret.toFixed(1)}%
                                                    </span>
                                                </td>

                                                {/* 승률 / 거래수 */}
                                                <td className="py-3.5 px-3 text-center whitespace-nowrap text-zinc-300">
                                                    <div className="font-bold">{st.metrics.win_rate_pct.toFixed(0)}%</div>
                                                    <div className="text-[10px] text-zinc-500">{st.metrics.total_trades}회 매매</div>
                                                </td>

                                                {/* 수정 사유 & 손실 원인 분석 */}
                                                <td className="py-3.5 px-3 text-zinc-300 leading-relaxed max-w-sm">
                                                    <p className="text-xs">{st.reason}</p>
                                                    {st.loss_analysis && (
                                                        <div className="mt-1 text-[11px] text-amber-300/80 font-medium">
                                                            🔍 {st.loss_analysis.main_loss_cause}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. 🛡️ 최근 1년 블라인드 검증 (과적합 방지 알림) */}
                    <div className="bg-[#0e1424] border border-sky-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-sky-400" />
                                <h4 className="text-sm sm:text-base font-bold text-white">
                                    4. 최근 1년 블라인드 검증 (과적합 확인용 미사용 기간)
                                </h4>
                            </div>
                            <span className="text-xs text-sky-300 font-medium">
                                {result.out_of_sample_1year.period}
                            </span>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed">
                            규칙을 고칠 때 일부러 쓰지 않고 남겨둔 <strong className="text-sky-300">최근 1년 실제 주가</strong>에 다시 돌려본 결과입니다.
                            과거 주가에만 딱 들어맞는 억지 규칙(과적합)인지 객관적으로 판별합니다.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                <span className="text-xs text-zinc-400">규칙 고치기 전 (처음 기준)</span>
                                <span className={`text-base font-bold ${
                                    result.out_of_sample_1year.before_tune.return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                    {result.out_of_sample_1year.before_tune.return_pct > 0 ? '+' : ''}
                                    {result.out_of_sample_1year.before_tune.return_pct.toFixed(1)}%
                                    <span className="text-[11px] text-zinc-500 font-normal ml-1">
                                        ({result.out_of_sample_1year.before_tune.trades}회)
                                    </span>
                                </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                <span className="text-xs text-zinc-400">규칙 고친 후 (3차 최적 기준)</span>
                                <span className={`text-base font-bold ${
                                    result.out_of_sample_1year.after_tune.return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                    {result.out_of_sample_1year.after_tune.return_pct > 0 ? '+' : ''}
                                    {result.out_of_sample_1year.after_tune.return_pct.toFixed(1)}%
                                    <span className="text-[11px] text-zinc-500 font-normal ml-1">
                                        ({result.out_of_sample_1year.after_tune.trades}회)
                                    </span>
                                </span>
                            </div>
                        </div>

                        {/* 과적합 경고/안정성 배너 */}
                        <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                            result.out_of_sample_1year.status === 'OVERFITTING_WARNING'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                : result.out_of_sample_1year.status === 'STABLE_IMPROVEMENT'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                : 'bg-zinc-800/40 border-white/10 text-zinc-300'
                        }`}>
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>{result.out_of_sample_1year.warning_message}</div>
                        </div>
                    </div>

                    {/* 4. 🎯 대표이사 자동매매 등록 액션 바 */}
                    <div className="bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-indigo-900/40 border-2 border-violet-400/50 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-400 text-slate-950">
                                    검증 완료
                                </span>
                                <h4 className="text-base sm:text-lg font-black text-white">
                                    이 최적화 규칙으로 실전/모의 자동매매를 실행하시겠습니까?
                                </h4>
                            </div>
                            <p className="text-xs text-zinc-300">
                                등록 즉시 대표이사 집무실의 <strong className="text-emerald-300">트레이딩 운용팀</strong>과 연동되어 
                                일일 조건 충족 시 안전 분할 매수 및 자동 익절/손절이 집행됩니다.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto shrink-0">
                            {deploySuccess ? (
                                <div className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>{deploySuccess}</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleDeployToAutoTrader}
                                    disabled={deploying}
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {deploying ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>자동매매 봇 탑재 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 fill-slate-950" />
                                            <span>🎯 이 검증된 규칙으로 자동매매 등록</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
