'use client';

import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/config';
import {
    Sparkles, Play, CheckCircle2, AlertTriangle, ShieldAlert,
    RefreshCw, Sliders, FileText, Bot, Zap, Info, ShieldCheck,
    Search, Trash2, Power, ArrowLeftRight, Activity, Flame, FlaskConical, Clock
} from 'lucide-react';

interface TuningStep {
    step: number;
    title: string;
    description: string;
    reason: string;
    buy_dip: number;
    take_profit: number;
    stop_loss: number;
    vol_mult?: number;
    is_best?: boolean;
    adopted?: boolean;
    blocked_knives?: number;
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
        main_loss_cause: string;
    };
}

interface StrategyComparisonItem {
    strategy_type: 'SAFE_DIP' | 'BREAKOUT' | 'SIMPLE_DIP';
    name: string;
    short_name: string;
    easy_desc: string;
    is_selected: boolean;
    is_best_match: boolean;
    train_return_pct: number;
    train_win_rate_pct: number;
    train_trades: number;
    oos_return_pct: number;
    oos_win_rate_pct: number;
    oos_trades: number;
    blocked_knives: number;
    pass_live_criteria: boolean;
}

interface OutOfSampleResult {
    period: string;
    before_tune: { return_pct: number; win_rate_pct: number; trades: number };
    after_tune: { return_pct: number; win_rate_pct: number; trades: number };
    status: 'OVERFITTING_WARNING' | 'STABLE_IMPROVEMENT' | 'INSUFFICIENT_SAMPLES';
    live_readiness?: 'PASS' | 'WATCH' | 'CAUTION';
    warning_message: string;
}

interface StrategyLabResponse {
    status: string;
    message?: string;
    symbol: string;
    stock_name?: string;
    searched_name?: string;
    resolved_symbol?: string;
    strategy_type?: 'SAFE_DIP' | 'BREAKOUT' | 'SIMPLE_DIP';
    strategy_name?: string;
    strategy_easy_desc?: string;
    knife_filter_enabled?: boolean;
    vol_mult?: number;
    blocked_knives_count?: number;
    live_readiness?: 'PASS' | 'WATCH' | 'CAUTION';
    recommended_strategy?: 'SAFE_DIP' | 'BREAKOUT' | 'SIMPLE_DIP';
    strategy_comparison?: StrategyComparisonItem[];
    improved_rules?: { buy_dip: number; tp: number; sl: number; max_dd: number; vol_mult?: number };
    rule_summary: { buy_rule: string; sell_rule: string };
    benchmark_buy_and_hold_return_pct: number;
    tuning_steps: TuningStep[];
    out_of_sample_1year: OutOfSampleResult;
    strategy_config: any;
}

interface SearchStockItem {
    symbol: string;
    name: string;
    market: string;
    label: string;
}

interface DeployedStrategy {
    strategy_id: string;
    symbol: string;
    stock_name?: string;
    strategy_type?: 'SAFE_DIP' | 'BREAKOUT' | 'SIMPLE_DIP';
    strategy_name?: string;
    vol_mult?: number;
    filter_badge?: string;
    trade_mode: 'PAPER' | 'REAL';
    allocation_krw: number;
    enabled: boolean;
    buy_dip_threshold_pct: number;
    take_profit_threshold_pct: number;
    stop_loss_pct: number;
    deployed_at?: string;
    last_checked_at?: string;
    last_price?: number;
    last_change_pct?: number;
    gap_to_trigger_pct?: number;
    is_us?: boolean;
    market_open?: boolean;
    holding?: boolean;
    holding_qty?: number;
    holding_avg_price?: number;
    holding_pnl_pct?: number;
    monitor_status?: string;
}

interface LabLogItem {
    id: string;
    timestamp: string;
    action: string;
    symbol: string;
    name: string;
    qty: number;
    price: number;
    amount_krw: number;
    pnl_krw: number;
    pnl_pct: number;
    reason: string;
    trade_mode?: string;
}

interface StrategyLabWidgetProps {
    onDeploySuccess?: (symbol: string) => void;
}

export default function StrategyLabWidget({ onDeploySuccess }: StrategyLabWidgetProps) {
    // 1. 종목 검색 & 입력 상태
    const [symbolInput, setSymbolInput] = useState('삼성전자');
    const [selectedLabel, setSelectedLabel] = useState('삼성전자 (005930)');
    const [searchResults, setSearchResults] = useState<SearchStockItem[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchWrapRef = useRef<HTMLDivElement>(null);

    const [strategyType, setStrategyType] = useState<'SAFE_DIP' | 'BREAKOUT' | 'SIMPLE_DIP'>('SAFE_DIP');
    const [volMult, setVolMult] = useState<number>(1.5);
    const [showEasyGuide, setShowEasyGuide] = useState<boolean>(true);
    const [buyDip, setBuyDip] = useState<number>(3.0);
    const [takeProfit, setTakeProfit] = useState<number>(6.0);
    const [stopLoss, setStopLoss] = useState<number>(4.5);
    const [maxDd, setMaxDd] = useState<number>(15.0);
    const [years, setYears] = useState<number>(5);

    const handleSelectStrategyType = (nextType: 'SAFE_DIP' | 'BREAKOUT' | 'SIMPLE_DIP') => {
        setStrategyType(nextType);
        if (nextType === 'BREAKOUT') {
            setBuyDip(2.5);
            setTakeProfit(9.0);
            setStopLoss(4.5);
            setVolMult(1.5);
        } else if (nextType === 'SAFE_DIP') {
            setBuyDip(3.0);
            setTakeProfit(6.0);
            setStopLoss(4.5);
        } else {
            setBuyDip(3.0);
            setTakeProfit(5.0);
            setStopLoss(5.0);
        }
    };

    // 2. 백테스트 실행 및 결과 상태
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [result, setResult] = useState<StrategyLabResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // 3. 자동매매 등록 설정 (가상매매 vs 실전매매 분리)
    const [deployMode, setDeployMode] = useState<'PAPER' | 'REAL'>('PAPER');
    const [allocationKrw, setAllocationKrw] = useState<number>(2000000);
    const [realConfirmChecked, setRealConfirmChecked] = useState<boolean>(false);
    const [autoEnableRealMaster, setAutoEnableRealMaster] = useState<boolean>(true);
    const [deploying, setDeploying] = useState(false);
    const [deploySuccess, setDeploySuccess] = useState<string | null>(null);
    const [showDeployModal, setShowDeployModal] = useState(false);
    const [lastDeployedInfo, setLastDeployedInfo] = useState<any>(null);

    // 4. 등록된 전략 실시간 감시 현황판 상태
    const [labSettings, setLabSettings] = useState<{ paper_enabled: boolean; real_enabled: boolean }>({
        paper_enabled: true,
        real_enabled: false,
    });
    const [paperStrategies, setPaperStrategies] = useState<DeployedStrategy[]>([]);
    const [realStrategies, setRealStrategies] = useState<DeployedStrategy[]>([]);
    const [labLogs, setLabLogs] = useState<LabLogItem[]>([]);
    const [kisConfigured, setKisConfigured] = useState<boolean>(false);
    const [kisAccountMasked, setKisAccountMasked] = useState<string>('');
    const [lastCycleAt, setLastCycleAt] = useState<string>('');
    const [monitorTab, setMonitorTab] = useState<'PAPER' | 'REAL' | 'LOGS'>('PAPER');
    const [loadingMonitor, setLoadingMonitor] = useState<boolean>(false);

    const quickPicks = [
        { name: '삼성전자', code: '005930' },
        { name: 'SK하이닉스', code: '000660' },
        { name: '엘앤에프', code: '066970' },
        { name: '한중엔시에스', code: '107640' },
        { name: '리노공업', code: '058470' },
        { name: '현대차', code: '005380' },
        { name: '알테오젠', code: '196170' },
        { name: '테슬라', code: 'TSLA' },
        { name: '엔비디아', code: 'NVDA' },
        { name: '애플', code: 'AAPL' },
        { name: '팔란티어', code: 'PLTR' },
        { name: 'SOXL', code: 'SOXL' },
        { name: 'TQQQ', code: 'TQQQ' },
    ];

    // 외부 클릭 시 검색 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 실시간 감시 전략 현황 조회
    const fetchMonitorStatus = async (forceRefresh = true) => {
        setLoadingMonitor(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/strategy-lab/strategies?refresh=${forceRefresh ? 'true' : 'false'}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.status === 'ok') {
                setLabSettings(data.settings || { paper_enabled: true, real_enabled: false });
                setPaperStrategies(data.paper_strategies || []);
                setRealStrategies(data.real_strategies || []);
                setLabLogs(data.logs || []);
                setKisConfigured(Boolean(data.kis_configured));
                setKisAccountMasked(data.kis_account_masked || '');
                setLastCycleAt(data.last_cycle_at || '');
            }
        } catch (err) {
            console.error('전략 감시 현황 조회 실패:', err);
        } finally {
            setLoadingMonitor(false);
        }
    };

    useEffect(() => {
        fetchMonitorStatus(true);
    }, []);

    // 전 종목 실시간 자동완성 디바운스 검색
    useEffect(() => {
        const q = symbolInput.trim();
        if (!q || !showDropdown) {
            return;
        }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/strategy-lab/search-stocks?q=${encodeURIComponent(q)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.results || []);
                }
            } catch {
                // ignore
            } finally {
                setSearchLoading(false);
            }
        }, 220);
        return () => clearTimeout(timer);
    }, [symbolInput, showDropdown]);

    // 가상/실전 마스터 스위치 전환
    const handleToggleMasterSetting = async (field: 'paper_enabled' | 'real_enabled', nextVal: boolean) => {
        if (field === 'real_enabled' && nextVal) {
            const ok = window.confirm(
                '⚠️ [실전매매 마스터 스위치 ON]\n\n한국투자증권 실전 계좌로 등록된 AI 전략의 조건 충족 시 실제 주문이 자동으로 전송됩니다. 실전매매 엔진을 가동하시겠습니까?'
            );
            if (!ok) return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/strategy-lab/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: nextVal }),
            });
            const data = await res.json();
            if (data.status === 'ok') {
                setLabSettings(data.settings);
                await fetchMonitorStatus(false);
            }
        } catch (err: any) {
            alert('설정 변경 실패: ' + err.message);
        }
    };

    // 개별 전략 ON/OFF 또는 모드 변경
    const handlePatchStrategy = async (strategyId: string, patch: Record<string, any>) => {
        if (patch.trade_mode === 'REAL') {
            const ok = window.confirm('이 전략을 [🔥 실전매매 (한국투자증권 실계좌)] 모드로 전환하시겠습니까?');
            if (!ok) return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/strategy-lab/strategies/${encodeURIComponent(strategyId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            const data = await res.json();
            if (data.status === 'ok') {
                await fetchMonitorStatus(false);
            } else {
                alert(data.message || '전략 수정 실패');
            }
        } catch (err: any) {
            alert('전략 수정 오류: ' + err.message);
        }
    };

    // 개별 전략 삭제
    const handleDeleteStrategy = async (strategyId: string, label: string) => {
        if (!window.confirm(`'${label}' 자동매매 감시 전략을 삭제(중지)하시겠습니까?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/strategy-lab/strategies/${encodeURIComponent(strategyId)}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.status === 'ok') {
                await fetchMonitorStatus(false);
            }
        } catch (err: any) {
            alert('전략 삭제 오류: ' + err.message);
        }
    };

    // 백테스트 & AI 3단계 자가 교정 실행
    const handleRunAutoTuning = async (
        overrideSymbol?: string,
        overrideType?: 'SAFE_DIP' | 'BREAKOUT' | 'SIMPLE_DIP'
    ) => {
        const target = (overrideSymbol ?? symbolInput).trim();
        const effType = overrideType ?? strategyType;
        if (!target) {
            alert('종목명 또는 종목코드·티커를 입력해주세요.');
            return;
        }
        if (overrideType) {
            setStrategyType(overrideType);
        }

        setShowDropdown(false);
        setLoading(true);
        setErrorMsg('');
        setDeploySuccess(null);
        setResult(null);

        try {
            const modeLabel =
                effType === 'BREAKOUT'
                    ? '🚀 거래량·수급 돌파'
                    : effType === 'SAFE_DIP'
                    ? '🛡️ 칼날방지 눌림목'
                    : '📉 단순 하락';
            setLoadingStage(`'${target}' [${modeLabel}] + 3대 전략 동시 비교 시뮬레이션 중...`);

            const payload = {
                symbol: target,
                strategy_type: effType,
                knife_filter: effType !== 'SIMPLE_DIP',
                vol_mult: Number(volMult),
                buy_dip: Number(overrideType === 'BREAKOUT' ? 2.5 : buyDip),
                take_profit: Number(overrideType === 'BREAKOUT' ? 9.0 : takeProfit),
                stop_loss: Number(stopLoss),
                max_dd: Number(maxDd),
                years: Number(years),
            };

            const res = await fetch(`${API_BASE_URL}/api/strategy-lab/tune`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data: StrategyLabResponse = await res.json();
            if (!res.ok || data.status !== 'success') {
                throw new Error(data.message || (data as any).detail || '매매 연습장 엔진 응답 실패');
            }

            setResult(data);
        } catch (err: any) {
            console.error('Tuning error:', err);
            setErrorMsg(err.message || '시험 중 오류가 발생했습니다. 종목명을 다시 확인해주세요.');
        } finally {
            setLoading(false);
            setLoadingStage('');
        }
    };

    // 가상매매 또는 실전매매 봇에 등록
    const handleDeployToAutoTrader = async () => {
        if (!result || !result.strategy_config) return;
        if (deployMode === 'REAL' && !realConfirmChecked) {
            alert('실전매매 등록을 위해 아래 안전 확인 체크박스에 동의해 주세요.');
            return;
        }

        setDeploying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/strategy-lab/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strategy_config: result.strategy_config,
                    stock_name: result.stock_name || result.searched_name || result.symbol,
                    strategy_type: result.strategy_type || strategyType,
                    vol_mult: result.vol_mult || volMult,
                    trade_mode: deployMode,
                    allocation_krw: Number(allocationKrw),
                    auto_enable_master: deployMode === 'REAL' ? autoEnableRealMaster : true,
                }),
            });

            const data = await res.json();
            if (!res.ok || data.status !== 'success') {
                throw new Error(data.message || data.detail || '자동매매 등록에 실패했습니다.');
            }

            setDeploySuccess(data.message || '성공적으로 자동매매 엔진에 등록되었습니다!');
            setLastDeployedInfo(data);
            setShowDeployModal(true);
            setMonitorTab(deployMode);
            await fetchMonitorStatus(false);
            if (onDeploySuccess) {
                onDeploySuccess(result.symbol);
            }
        } catch (err: any) {
            alert('등록 실패: ' + err.message);
        } finally {
            setDeploying(false);
        }
    };

    const activeMonitorList = monitorTab === 'REAL' ? realStrategies : paperStrategies;

    return (
        <div className="space-y-6">
            {/* 상단 헤더 배너 */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1222] via-[#141b34] to-[#1c1236] border-2 border-violet-500/40 p-6 sm:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-violet-400" />
                            <span>AI 자율 매매 연습장 · 실전/가상 자동매매 엔진 완전 연동</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                            국내·해외 전 종목 실시간 검색
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            가상매매 / 실전매매 독립 분리 작동
                        </span>
                    </div>

                    <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                        <span>🧪</span>
                        <span>돈 잃을 때마다 스스로 고치는 AI 매매 연습장</span>
                    </h2>

                    <p className="text-xs sm:text-sm text-zinc-300 mt-2.5 leading-relaxed max-w-4xl">
                        국내(코스피·코스닥·ETF)와 미국(나스닥·NYSE·ETF) <strong className="text-sky-300">모든 종목을 검색</strong>해 지난 주가로 시뮬레이션하고,
                        AI가 3번 규칙을 교정한 뒤 <strong className="text-emerald-300">🧪 가상매매(모의계좌)</strong> 또는{' '}
                        <strong className="text-rose-300">🔥 실전매매(한국투자증권 실계좌)</strong> 중 원하는 모드로 분리해 45초마다 실시간 자동매매를 가동할 수 있습니다.
                    </p>
                </div>
            </div>

            {/* 0. 📡 가상매매 vs 실전매매 실시간 자동매매 작동 현황판 */}
            <div className="bg-[#0b101d] border-2 border-indigo-500/35 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            <span>실시간 자동매매 작동 제어판 (가상매매 · 실전매매 분리 운영)</span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            등록된 전략은 45초 주기 자동매매 데몬이 실시간 등락률을 감시하며 조건 충족 시 자동 집행합니다.
                            {lastCycleAt && <span className="text-indigo-300 ml-1.5">· 최근 감시: {lastCycleAt}</span>}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchMonitorStatus(true)}
                        disabled={loadingMonitor}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-zinc-200 flex items-center gap-1.5 w-fit cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loadingMonitor ? 'animate-spin' : ''}`} />
                        <span>실시간 시세·감시 새로고침</span>
                    </button>
                </div>

                {/* 가상매매 / 실전매매 독립 마스터 스위치 2열 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* 🧪 가상매매 마스터 카드 */}
                    <div className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                        labSettings.paper_enabled
                            ? 'bg-emerald-950/25 border-emerald-500/45'
                            : 'bg-zinc-900/50 border-white/10'
                    }`}>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                    <FlaskConical className="w-3 h-3" /> 가상매매 (모의)
                                </span>
                                <span className={`text-xs font-black ${labSettings.paper_enabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    {labSettings.paper_enabled ? '● 실시간 가동 중' : '○ 일시 정지'}
                                </span>
                            </div>
                            <div className="text-xs text-zinc-300">
                                등록 전략 <strong className="text-white">{paperStrategies.length}개</strong> · 실제 돈 출금 없이 안전하게 실전처럼 자동매매 테스트
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggleMasterSetting('paper_enabled', !labSettings.paper_enabled)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                labSettings.paper_enabled
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/25'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/15'
                            }`}
                        >
                            <Power className="w-3.5 h-3.5" />
                            <span>{labSettings.paper_enabled ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>

                    {/* 🔥 실전매매 마스터 카드 */}
                    <div className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                        labSettings.real_enabled
                            ? 'bg-rose-950/30 border-rose-500/50'
                            : 'bg-zinc-900/50 border-white/10'
                    }`}>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                    <Flame className="w-3 h-3" /> 실전매매 (한투 실계좌)
                                </span>
                                <span className={`text-xs font-black ${labSettings.real_enabled ? 'text-rose-400' : 'text-zinc-500'}`}>
                                    {labSettings.real_enabled ? '● 실계좌 가동 중' : '○ 안전 잠금(OFF)'}
                                </span>
                            </div>
                            <div className="text-xs text-zinc-300">
                                등록 전략 <strong className="text-white">{realStrategies.length}개</strong> ·{' '}
                                {kisConfigured ? (
                                    <span className="text-amber-300 font-semibold">한투 연동됨 ({kisAccountMasked || '실계좌'})</span>
                                ) : (
                                    <span className="text-rose-300">한투 API 미연동 (자동매매 콘솔에서 연동 필요)</span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggleMasterSetting('real_enabled', !labSettings.real_enabled)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                labSettings.real_enabled
                                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/30'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/15'
                            }`}
                        >
                            <Power className="w-3.5 h-3.5" />
                            <span>{labSettings.real_enabled ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                </div>

                {/* 등록 전략 목록 탭 (가상매매 / 실전매매 / 체결 로그) */}
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2.5">
                        <button
                            type="button"
                            onClick={() => setMonitorTab('PAPER')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                monitorTab === 'PAPER'
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                            }`}
                        >
                            🧪 가상매매 감시 중 ({paperStrategies.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setMonitorTab('REAL')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                monitorTab === 'REAL'
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                            }`}
                        >
                            🔥 실전매매 감시 중 ({realStrategies.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setMonitorTab('LOGS')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                monitorTab === 'LOGS'
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                            }`}
                        >
                            📜 체결 이력 ({labLogs.length})
                        </button>
                    </div>

                    {monitorTab !== 'LOGS' ? (
                        activeMonitorList.length === 0 ? (
                            <div className="p-4 rounded-xl bg-black/35 border border-white/10 text-xs text-zinc-400 text-center">
                                현재 {monitorTab === 'REAL' ? '🔥 실전매매' : '🧪 가상매매'}로 등록된 전략이 없습니다. 아래에서 원하는 종목을 검색해 시뮬레이션한 뒤 등록해 보세요!
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activeMonitorList.map((st) => {
                                    const isReal = st.trade_mode === 'REAL';
                                    const chg = Number(st.last_change_pct || 0);
                                    return (
                                        <div
                                            key={st.strategy_id}
                                            className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                                                !st.enabled
                                                    ? 'bg-zinc-900/40 border-white/10 opacity-70'
                                                    : isReal
                                                    ? 'bg-rose-950/20 border-rose-500/35'
                                                    : 'bg-emerald-950/15 border-emerald-500/35'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                                            isReal
                                                                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                        }`}>
                                                            {isReal ? '🔥 실전매매' : '🧪 가상매매'}
                                                        </span>
                                                        <span className="text-sm font-black text-white">
                                                            {st.stock_name || st.symbol}
                                                        </span>
                                                        <span className="text-[11px] font-mono text-zinc-400">
                                                            ({st.symbol})
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${
                                                            st.strategy_type === 'BREAKOUT'
                                                                ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                                                                : st.strategy_type === 'SAFE_DIP'
                                                                ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                                                                : 'bg-zinc-800 text-zinc-300 border-white/10'
                                                        }`}>
                                                            {st.strategy_type === 'BREAKOUT'
                                                                ? '🚀 거래량·수급 돌파'
                                                                : st.strategy_type === 'SAFE_DIP'
                                                                ? '🛡️ 칼날방지 눌림목'
                                                                : '📉 단순 하락'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-zinc-300 mt-1 font-medium">
                                                        {st.strategy_type === 'BREAKOUT' ? (
                                                            <>돌파 <strong className="text-amber-300">+{st.buy_dip_threshold_pct}%</strong> (거래량 {st.vol_mult || 1.5}배↑) · </>
                                                        ) : (
                                                            <>매수 <strong className="text-sky-300">-{st.buy_dip_threshold_pct}%</strong> · </>
                                                        )}
                                                        익절 <strong className="text-emerald-300">+{st.take_profit_threshold_pct}%</strong> ·
                                                        손절 <strong className="text-rose-300">-{st.stop_loss_pct}%</strong> ·
                                                        1회 <strong className="text-amber-300">{(st.allocation_krw || 0).toLocaleString()}원</strong>
                                                    </div>
                                                    {st.filter_badge && (
                                                        <div className="text-[10px] text-sky-200/85 mt-1 font-semibold">
                                                            🔍 실시간 필터: {st.filter_badge}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        title={st.enabled ? '일시정지' : '감시 재개'}
                                                        onClick={() => handlePatchStrategy(st.strategy_id, { enabled: !st.enabled })}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                                            st.enabled
                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                                : 'bg-zinc-800 text-zinc-400 border border-white/10'
                                                        }`}
                                                    >
                                                        {st.enabled ? 'ON' : 'OFF'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title={isReal ? '가상매매로 전환' : '실전매매로 전환'}
                                                        onClick={() => handlePatchStrategy(st.strategy_id, { trade_mode: isReal ? 'PAPER' : 'REAL' })}
                                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/10 cursor-pointer"
                                                    >
                                                        <ArrowLeftRight className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="전략 삭제"
                                                        onClick={() => handleDeleteStrategy(st.strategy_id, st.stock_name || st.symbol)}
                                                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/25 cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 실시간 현재가 & 감시 상태 */}
                                            <div className="bg-black/45 border border-white/10 rounded-xl p-2.5 space-y-1 text-[11px]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-zinc-400">
                                                        현재가:{' '}
                                                        <strong className="text-white font-mono">
                                                            {st.last_price
                                                                ? st.is_us
                                                                    ? `$${st.last_price.toLocaleString()}`
                                                                    : `${Math.round(st.last_price).toLocaleString()}원`
                                                                : '조회 대기'}
                                                        </strong>
                                                    </span>
                                                    <span className={`font-black font-mono ${chg > 0 ? 'text-rose-400' : chg < 0 ? 'text-sky-400' : 'text-zinc-300'}`}>
                                                        오늘 {chg > 0 ? '+' : ''}{chg.toFixed(2)}%
                                                    </span>
                                                </div>
                                                <div className="text-emerald-200/95 font-medium break-keep">
                                                    {st.monitor_status || '🟢 45초 주기 실시간 감시 대기 중'}
                                                </div>
                                                {st.last_checked_at && (
                                                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        <span>마지막 점검: {st.last_checked_at}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : labLogs.length === 0 ? (
                        <div className="p-4 rounded-xl bg-black/35 border border-white/10 text-xs text-zinc-400 text-center">
                            아직 조건에 도달해 체결된 전략랩 주문 내역이 없습니다. 등록된 전략이 매수/익절/손절 조건에 도달하면 여기에 실시간 기록됩니다.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {labLogs.map((lg) => (
                                <div key={lg.id} className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                            lg.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                        }`}>
                                            {lg.action === 'BUY' ? '매수' : '매도'}
                                        </span>
                                        <span className="font-bold text-white">{lg.name} ({lg.symbol})</span>
                                        <span className="text-zinc-400">{lg.qty}주 · {lg.amount_krw.toLocaleString()}원</span>
                                    </div>
                                    <div className="text-[11px] text-zinc-300">{lg.reason}</div>
                                    <div className="text-[10px] text-zinc-500 font-mono">{lg.timestamp}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 1. 종목 검색 & 실전 전략 선택 패널 */}
            <div className="bg-[#0b101d] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-5">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-violet-400" />
                            <span>1. 실전 매매 전략 선택 &amp; 전 종목 검색</span>
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowEasyGuide((prev) => !prev)}
                            className="px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 text-xs font-bold cursor-pointer transition-colors"
                        >
                            {showEasyGuide ? '📘 쉬운 작동 원리 접기 ▲' : '📘 어떻게 적용되나요? 3초 해설 펼치기 ▼'}
                        </button>
                    </div>

                    {/* 📘 초보자 3초 쉬운 설명 카드 (어떻게 적용되는지 한눈에 이해!) */}
                    {showEasyGuide && (
                        <div className="rounded-2xl bg-gradient-to-br from-sky-950/35 via-indigo-950/30 to-slate-950 border border-sky-500/35 p-4 space-y-2.5 text-xs">
                            <div className="font-black text-sky-300 flex items-center gap-1.5">
                                <span>💡</span>
                                <span>어떻게 적용되고 돈을 지켜주나요? (3초 쉬운 요약)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                <div className="rounded-xl bg-black/45 border border-sky-400/25 p-3 space-y-1">
                                    <div className="font-black text-sky-200">① 🛡️ 악재 칼날 방지 필터란?</div>
                                    <p className="text-[11px] text-zinc-300 leading-relaxed break-keep">
                                        단순히 &quot;싸졌다&quot;고 무조건 사지 않습니다. <strong className="text-white">60일선 상승 추세 생존 + 거래량 폭탄(악재 투매) 차단 + 외인·기관 동반 투매 배제</strong>를 모두 통과한 <strong className="text-sky-300">건강한 눌림목</strong>만 골라 삽니다.
                                    </p>
                                </div>
                                <div className="rounded-xl bg-black/45 border border-amber-400/25 p-3 space-y-1">
                                    <div className="font-black text-amber-200">② 🚀 거래량·수급 돌파란?</div>
                                    <p className="text-[11px] text-zinc-300 leading-relaxed break-keep">
                                        오르는 장에서는 떨어지길 기다리면 기회를 놓칩니다. <strong className="text-white">거래량이 평소 1.5배↑ 터지며 20일선 위에서 치고 올라갈 때</strong> 수급을 확인하고 올라타는 상승장·주도주 전용 전략입니다.
                                    </p>
                                </div>
                                <div className="rounded-xl bg-black/45 border border-emerald-400/25 p-3 space-y-1">
                                    <div className="font-black text-emerald-200">③ 🏆 자동 비교 &amp; 실전 승격 기준</div>
                                    <p className="text-[11px] text-zinc-300 leading-relaxed break-keep">
                                        버튼 한 번이면 <strong className="text-white">3가지 전략을 같은 종목으로 동시 채점</strong>해 최고 궁합을 찾아줍니다. <strong className="text-emerald-300">승률 55%+ &amp; 최근 1년 플러스(+)</strong> 종목만 가상매매 ➔ 실전매매로 올리세요!
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3대 실전 전략 선택 카드 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <button
                            type="button"
                            onClick={() => handleSelectStrategyType('SAFE_DIP')}
                            className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 ${
                                strategyType === 'SAFE_DIP'
                                    ? 'bg-sky-950/45 border-sky-400 shadow-lg shadow-sky-500/15'
                                    : 'bg-black/35 border-white/10 hover:border-sky-400/40'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs sm:text-sm font-black text-white">🛡️ 악재 칼날 방지 눌림목</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-400 text-slate-950 shrink-0">추천 · 안정형</span>
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-snug break-keep">
                                하락 시 싸게 사되, <strong>60일선 이탈·악재 투매·외인기관 동반 매도</strong>는 자동 차단합니다.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSelectStrategyType('BREAKOUT')}
                            className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 ${
                                strategyType === 'BREAKOUT'
                                    ? 'bg-amber-950/45 border-amber-400 shadow-lg shadow-amber-500/15'
                                    : 'bg-black/35 border-white/10 hover:border-amber-400/40'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs sm:text-sm font-black text-white">🚀 거래량·수급 추세 돌파</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shrink-0">상승장 · 주도주</span>
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-snug break-keep">
                                <strong>거래량 1.5배↑ 급증 + 20일선 정배열 돌파</strong> 시 상승 추세에 올라타 수익을 키웁니다.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSelectStrategyType('SIMPLE_DIP')}
                            className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 ${
                                strategyType === 'SIMPLE_DIP'
                                    ? 'bg-zinc-900 border-violet-400 shadow-lg shadow-violet-500/15'
                                    : 'bg-black/35 border-white/10 hover:border-white/25'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs sm:text-sm font-black text-white">📉 기존 단순 하락 매수</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-zinc-300 shrink-0">비교 기준</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-snug break-keep">
                                필터 없이 일정 % 빠지면 무조건 매수하는 기존 방식입니다. (칼날 방지 효과 비교용)
                            </p>
                        </button>
                    </div>

                    {/* 추천 종목 퀵 칩 */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-zinc-400 mr-1">인기 종목:</span>
                        {quickPicks.map((p) => (
                            <button
                                key={p.code}
                                type="button"
                                onClick={() => {
                                    setSymbolInput(p.name);
                                    setSelectedLabel(`${p.name} (${p.code})`);
                                    setShowDropdown(false);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
                        {/* 전 종목 실시간 자동완성 검색 */}
                        <div ref={searchWrapRef} className="space-y-1 sm:col-span-2 lg:col-span-1 relative">
                            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                                <span>🔍 전 종목 검색 (국내/해외)</span>
                                <span className="text-[10px] text-sky-400">자동완성</span>
                            </label>
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={symbolInput}
                                    onFocus={() => setShowDropdown(true)}
                                    onChange={(e) => {
                                        setSymbolInput(e.target.value);
                                        setSelectedLabel('');
                                        setShowDropdown(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setShowDropdown(false);
                                            handleRunAutoTuning();
                                        }
                                    }}
                                    placeholder="종목명·코드·미국티커 (예: 한중엔시에스, NVDA)"
                                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>
                            {selectedLabel && (
                                <div className="text-[10px] text-emerald-400 font-semibold truncate">
                                    ✓ 선택됨: {selectedLabel}
                                </div>
                            )}

                            {/* 자동완성 드롭다운 */}
                            {showDropdown && symbolInput.trim().length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#0f172a] border border-violet-500/40 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                                    {searchLoading ? (
                                        <div className="px-3.5 py-3 text-xs text-zinc-400 flex items-center gap-2">
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
                                            <span>국내·해외 전 종목 검색 중...</span>
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="px-3.5 py-3 text-xs text-zinc-400">
                                            자동완성 결과 없음 — 그대로 엔터를 누르시면 직접 조회합니다.
                                        </div>
                                    ) : (
                                        searchResults.map((item) => (
                                            <button
                                                key={`${item.market}-${item.symbol}`}
                                                type="button"
                                                onClick={() => {
                                                    setSymbolInput(item.symbol);
                                                    setSelectedLabel(`${item.name} (${item.symbol})`);
                                                    setShowDropdown(false);
                                                }}
                                                className="w-full text-left px-3.5 py-2.5 hover:bg-violet-500/20 border-b border-white/5 last:border-b-0 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">{item.name}</div>
                                                    <div className="text-[10px] font-mono text-zinc-400">{item.symbol}</div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                                    item.market.includes('US')
                                                        ? 'bg-sky-500/20 text-sky-300'
                                                        : 'bg-amber-500/20 text-amber-300'
                                                }`}>
                                                    {item.market}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 살 때 (하락률 또는 돌파 상승률) */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300">
                                {strategyType === 'BREAKOUT' ? '🚀 돌파 기준 (당일 상승률 %)' : '📉 살 때 (하루 하락률 %)'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    max="15"
                                    value={buyDip}
                                    onChange={(e) => setBuyDip(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                                />
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${strategyType === 'BREAKOUT' ? 'text-amber-400' : 'text-zinc-400'}`}>
                                    {strategyType === 'BREAKOUT' ? '% 돌파' : '% 하락'}
                                </span>
                            </div>
                        </div>

                        {/* 팔 때 (익절 목표) */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300">
                                📈 팔 때 (익절 목표 %)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="50"
                                    value={takeProfit}
                                    onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400">% 상승</span>
                            </div>
                        </div>

                        {/* 손절선 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300">
                                🛑 손절선 (바로 팔기 %)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="30"
                                    value={stopLoss}
                                    onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-violet-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-rose-400">% 하락</span>
                            </div>
                        </div>

                        {/* 거래량 배수(돌파) 또는 최대손실한도 & 기간 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-300">
                                {strategyType === 'BREAKOUT' ? '🔥 거래량 배수 / 기간' : '🛡️ 최대손실한도 / 기간'}
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {strategyType === 'BREAKOUT' ? (
                                    <select
                                        value={volMult}
                                        onChange={(e) => setVolMult(parseFloat(e.target.value))}
                                        title="20일 평균 대비 최소 거래량 배수"
                                        className="w-full px-2 py-2.5 rounded-xl bg-black/50 border border-amber-400/35 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400"
                                    >
                                        <option value={1.3}>거래량 1.3배↑</option>
                                        <option value={1.5}>거래량 1.5배↑★</option>
                                        <option value={1.8}>거래량 1.8배↑</option>
                                        <option value={2.0}>거래량 2.0배↑</option>
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        min="5"
                                        max="50"
                                        value={maxDd}
                                        onChange={(e) => setMaxDd(parseFloat(e.target.value) || 15)}
                                        title="최대 손실 한도 (%)"
                                        className="w-full px-2.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-violet-500"
                                    />
                                )}
                                <select
                                    value={years}
                                    onChange={(e) => setYears(parseInt(e.target.value, 10))}
                                    className="w-full px-2 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-violet-500"
                                >
                                    <option value={5}>최근 5년</option>
                                    <option value={3}>최근 3년</option>
                                    <option value={2}>최근 2년</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 실행 버튼 */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
                    <p className="text-xs text-zinc-400">
                        💡 <strong>Tip:</strong> 신규 상장주(예: 한중엔시에스)부터 국내 ETF, 미국 주식·ETF까지 검색창에서 바로 골라 시뮬레이션할 수 있습니다.
                    </p>
                    <button
                        type="button"
                        onClick={() => handleRunAutoTuning()}
                        disabled={loading}
                        className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-black shadow-xl shadow-violet-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>{loadingStage || 'AI 시뮬레이션 분석 중...'}</span>
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
                    {/* 🏆 0. 3대 전략 동일 구간 자동 비교표 (단순 하락 vs 🛡️ 칼날방지 눌림목 vs 🚀 거래량·수급 돌파) */}
                    {Array.isArray(result.strategy_comparison) && result.strategy_comparison.length > 0 && (
                        <div className="bg-gradient-to-br from-[#0d1528] via-[#0b101d] to-[#120e24] border-2 border-amber-400/35 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                                        <span>🏆</span>
                                        <span>[{result.stock_name || result.symbol}] 3대 전략 동일 기간 한눈에 비교</span>
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        같은 종목에 3가지 방식을 똑같이 시험했습니다. <strong className="text-emerald-300">최근 1년 플러스(+) &amp; 승률 55% 이상</strong> 전략을 고르는 것이 가장 안전합니다.
                                    </p>
                                </div>
                                {typeof result.blocked_knives_count === 'number' && result.blocked_knives_count > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-black shrink-0 w-fit">
                                        🛡️ 위험 급락·가짜 돌파 {result.blocked_knives_count}건 사전 차단!
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {result.strategy_comparison.map((cmp) => (
                                    <div
                                        key={cmp.strategy_type}
                                        className={`rounded-2xl p-4 border-2 flex flex-col justify-between gap-3 transition-all ${
                                            cmp.is_best_match
                                                ? 'bg-emerald-950/30 border-emerald-400/70 shadow-lg shadow-emerald-500/10'
                                                : cmp.is_selected
                                                ? 'bg-violet-950/25 border-violet-400/60'
                                                : 'bg-black/40 border-white/10'
                                        }`}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                                <span className="text-xs sm:text-sm font-black text-white">{cmp.name}</span>
                                                <div className="flex items-center gap-1">
                                                    {cmp.is_best_match && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                                                            🏆 최고 궁합
                                                        </span>
                                                    )}
                                                    {cmp.pass_live_criteria && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950">
                                                            ✅ 실전 적합
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-center">
                                                <div className="p-2 rounded-xl bg-black/45 border border-white/5">
                                                    <div className="text-[10px] text-zinc-400">학습 구간 수익률</div>
                                                    <div className={`text-sm font-black font-mono ${cmp.train_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {cmp.train_return_pct > 0 ? '+' : ''}{cmp.train_return_pct.toFixed(1)}%
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500">승률 {cmp.train_win_rate_pct.toFixed(0)}% · {cmp.train_trades}회</div>
                                                </div>
                                                <div className="p-2 rounded-xl bg-black/45 border border-white/5">
                                                    <div className="text-[10px] text-sky-300 font-bold">최근 1년 블라인드</div>
                                                    <div className={`text-sm font-black font-mono ${cmp.oos_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {cmp.oos_return_pct > 0 ? '+' : ''}{cmp.oos_return_pct.toFixed(1)}%
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500">승률 {cmp.oos_win_rate_pct.toFixed(0)}% · {cmp.oos_trades}회</div>
                                                </div>
                                            </div>

                                            {cmp.blocked_knives > 0 && (
                                                <div className="text-[10.5px] text-sky-300 font-semibold">
                                                    🛡️ 위험 타점 {cmp.blocked_knives}건 자동 걸러냄
                                                </div>
                                            )}
                                        </div>

                                        {cmp.is_selected ? (
                                            <div className="text-center py-1.5 rounded-xl bg-white/10 text-[11px] font-black text-emerald-300">
                                                ✓ 현재 선택된 전략 (아래 상세 결과)
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={loading}
                                                onClick={() => handleRunAutoTuning(result.symbol, cmp.strategy_type)}
                                                className="w-full py-2 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-amber-200 text-[11px] font-black transition-all cursor-pointer"
                                            >
                                                이 전략으로 바로 시험·적용하기 →
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 1. 규칙 요약 & 초기 비교 카드 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#0e1424] border border-violet-500/30 rounded-2xl p-5 shadow-lg">
                            <div className="flex items-center justify-between gap-2 text-violet-400 text-xs font-bold mb-2">
                                <span className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span>1. [{result.stock_name || result.symbol}] 매매 규칙 정리</span>
                                </span>
                                <span className="font-mono text-zinc-400">{result.symbol}</span>
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

                        <div className="bg-[#0e1424] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400 text-xs font-bold">2. 초기 규칙 결과 vs 단순 보유</span>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/5 text-zinc-300">
                                    학습 구간 검증
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
                                    <div className="text-[10px] text-zinc-500 mt-1">Buy &amp; Hold 기준</div>
                                </div>
                            </div>

                            <p className="text-[11px] text-zinc-400">
                                💡 아래 표에서 AI가 각 단계마다 어떤 수치를 어떻게 고쳤는지 확인해 보세요.
                            </p>
                        </div>
                    </div>

                    {/* 2. AI 3단계 자율 교정 표 */}
                    <div className="bg-[#0b101d] border border-white/10 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    <span>3. AI 손실 원인 분석 &amp; 단계별 규칙 교정 과정</span>
                                </h3>
                                <p className="text-xs text-zinc-400 mt-1">
                                    단계별로 매수 하락 기준·익절선·손절선을 하나씩 조정해 결과를 비교했습니다.
                                </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 w-fit">
                                총 3회 자가 개선 완료
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 text-[11px]">
                                        <th className="py-3 px-3">단계</th>
                                        <th className="py-3 px-3">적용된 규칙 (단계별 수치)</th>
                                        <th className="py-3 px-3 text-center">수익률</th>
                                        <th className="py-3 px-3 text-center">승률 / 거래수</th>
                                        <th className="py-3 px-3">수정 사유</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-zinc-200">
                                    {result.tuning_steps.map((st) => {
                                        const isFinal = Boolean(st.is_best) || st.step === 3;
                                        const isInitial = st.step === 0;
                                        const ret = st.metrics.total_return_pct;
                                        const isBrk = result.strategy_type === 'BREAKOUT';
                                        return (
                                            <tr
                                                key={st.step}
                                                className={`transition-colors ${
                                                    st.is_best ? 'bg-emerald-950/25 hover:bg-emerald-950/35' : 'hover:bg-white/[0.02]'
                                                }`}
                                            >
                                                <td className="py-3.5 px-3 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1 ${
                                                        st.is_best
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                            : isInitial
                                                            ? 'bg-zinc-800 text-zinc-300'
                                                            : 'bg-violet-500/20 text-violet-300'
                                                    }`}>
                                                        {st.title}
                                                        {st.is_best && ' ★최종채택'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3">
                                                    <div className="font-semibold text-white">{st.description}</div>
                                                    <div className="text-[11px] text-sky-300/90 font-mono mt-0.5">
                                                        {isBrk
                                                            ? `돌파: +${st.buy_dip}% (거래량 ${st.vol_mult || result.vol_mult || 1.5}배↑)`
                                                            : `매수: -${st.buy_dip}%`} | 익절: +{st.take_profit}% | 손절: -{st.stop_loss}%
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                    <span className={`text-sm sm:text-base font-black ${
                                                        ret > 0 ? 'text-emerald-400' : ret < 0 ? 'text-rose-400' : 'text-zinc-300'
                                                    }`}>
                                                        {ret > 0 ? '+' : ''}{ret.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 text-center whitespace-nowrap text-zinc-300">
                                                    <div className="font-bold">{st.metrics.win_rate_pct.toFixed(0)}%</div>
                                                    <div className="text-[10px] text-zinc-500">{st.metrics.total_trades}회 매매</div>
                                                </td>
                                                <td className="py-3.5 px-3 text-zinc-300 leading-relaxed max-w-sm">
                                                    <p className="text-xs">{st.reason}</p>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. 최근 1년 블라인드 검증 */}
                    <div className="bg-[#0e1424] border border-sky-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-sky-400" />
                                <h4 className="text-sm sm:text-base font-bold text-white">
                                    4. 최근 구간 블라인드 검증 (과적합 확인용 미사용 기간)
                                </h4>
                            </div>
                            <span className="text-xs text-sky-300 font-medium">{result.out_of_sample_1year.period}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                                <span className="text-xs text-zinc-400">규칙 고친 후 (3차 최종 기준)</span>
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

                        <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                            result.out_of_sample_1year.status === 'OVERFITTING_WARNING'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        }`}>
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>{result.out_of_sample_1year.warning_message}</div>
                        </div>
                    </div>

                    {/* 4. 🎯 가상매매 vs 실전매매 선택 & 자동매매 등록 패널 */}
                    <div className={`border-2 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 transition-all ${
                        deployMode === 'REAL'
                            ? 'bg-gradient-to-br from-rose-950/45 via-slate-900 to-amber-950/30 border-rose-500/60'
                            : 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-indigo-950/40 border-emerald-500/50'
                    }`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-emerald-400 text-slate-950">
                                        검증 완료
                                    </span>
                                    <span className="text-xs font-bold text-zinc-300">
                                        [{result.stock_name || result.symbol}] 자동매매 모드 선택
                                    </span>
                                </div>
                                <h4 className="text-base sm:text-lg font-black text-white">
                                    가상매매와 실전매매 중 어떤 방식으로 작동시킬까요?
                                </h4>
                            </div>

                            {/* 가상매매 vs 실전매매 선택 스위치 */}
                            <div className="inline-flex p-1 rounded-2xl bg-black/60 border border-white/15 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeployMode('PAPER');
                                        setAllocationKrw(2000000);
                                        setDeploySuccess(null);
                                    }}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                        deployMode === 'PAPER'
                                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    <FlaskConical className="w-3.5 h-3.5" />
                                    <span>🧪 가상매매 (모의)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeployMode('REAL');
                                        setAllocationKrw(500000);
                                        setRealConfirmChecked(false);
                                        setDeploySuccess(null);
                                    }}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                        deployMode === 'REAL'
                                            ? 'bg-rose-500 text-white shadow-md'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    <Flame className="w-3.5 h-3.5" />
                                    <span>🔥 실전매매 (실계좌)</span>
                                </button>
                            </div>
                        </div>

                        {/* 1회 투자금 설정 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-black/40 border border-white/10 rounded-xl p-4">
                            <div className="space-y-1.5">
                                <div className="text-xs font-bold text-zinc-200">
                                    💰 1회 자동 매수 투자금 ({deployMode === 'REAL' ? '실전 계좌 한도' : '모의 계좌 투자금'})
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {[100000, 300000, 500000, 1000000, 2000000, 5000000].map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setAllocationKrw(amt)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                                                allocationKrw === amt
                                                    ? deployMode === 'REAL'
                                                        ? 'bg-rose-500 text-white'
                                                        : 'bg-emerald-500 text-slate-950'
                                                    : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10'
                                            }`}
                                        >
                                            {(amt / 10000).toLocaleString()}만원
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="50000"
                                    min="50000"
                                    value={allocationKrw}
                                    onChange={(e) => setAllocationKrw(Math.max(50000, parseInt(e.target.value || '50000', 10)))}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-400"
                                />
                                <span className="text-xs font-bold text-zinc-400 shrink-0">원</span>
                            </div>
                        </div>

                        {/* 실전매매 전용 안전장치 */}
                        {deployMode === 'REAL' && (
                            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 space-y-2.5 text-xs text-rose-100">
                                <div className="font-black text-rose-300 flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 shrink-0" />
                                    <span>실전매매 주의: 한국투자증권 실계좌({kisAccountMasked || '계좌 확인 필요'})로 실제 주문이 전송됩니다.</span>
                                </div>
                                <label className="flex items-start gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={realConfirmChecked}
                                        onChange={(e) => setRealConfirmChecked(e.target.checked)}
                                        className="mt-0.5 accent-rose-500"
                                    />
                                    <span>
                                        정규장 중 {result.strategy_type === 'BREAKOUT'
                                            ? `거래량 ${result.vol_mult || 1.5}배↑ · 당일 +${result.improved_rules?.buy_dip ?? 2.5}% 돌파`
                                            : `당일 -${result.improved_rules?.buy_dip ?? 3.0}% ${result.strategy_type === 'SAFE_DIP' ? '칼날방지 눌림목' : '하락'}`} 조건 충족 시 1회 {allocationKrw.toLocaleString()}원 한도로 실제 매수 주문이 발주됨을 확인합니다.
                                    </span>
                                </label>
                                {!labSettings.real_enabled && (
                                    <label className="flex items-start gap-2 cursor-pointer select-none text-amber-200">
                                        <input
                                            type="checkbox"
                                            checked={autoEnableRealMaster}
                                            onChange={(e) => setAutoEnableRealMaster(e.target.checked)}
                                            className="mt-0.5 accent-amber-400"
                                        />
                                        <span>등록과 동시에 상단 [🔥 실전매매 마스터 스위치]도 바로 ON으로 켜기</span>
                                    </label>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-zinc-300">
                                {deployMode === 'REAL'
                                    ? '🔥 실전매매 엔진이 45초마다 실시간 시세를 감시하고 조건 충족 시 한투 실전 주문을 집행합니다.'
                                    : '🧪 가상매매 엔진이 실제 주가와 똑같은 조건으로 모의 자동매매를 24시간 실시간 감시·집행합니다.'}
                            </p>

                            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                                {deploySuccess && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeployModal(true)}
                                        className="px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>등록 상세 보기</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleDeployToAutoTrader}
                                    disabled={deploying || (deployMode === 'REAL' && !realConfirmChecked)}
                                    className={`w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                                        deployMode === 'REAL'
                                            ? 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white shadow-rose-500/30'
                                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                                    }`}
                                >
                                    {deploying ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>엔진 탑재 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            <span>
                                                {deployMode === 'REAL'
                                                    ? '🔥 실전매매로 자동매매 등록'
                                                    : '🧪 가상매매로 자동매매 등록'}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 자동매매 등록 완료 알림 모달 */}
            {showDeployModal && result && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className={`bg-[#0f172a] border-2 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden ${
                        deployMode === 'REAL' ? 'border-rose-500/50' : 'border-emerald-500/45'
                    }`}>
                        <div className="relative z-10 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl">
                                    {deployMode === 'REAL' ? '🔥' : '🧪'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                            deployMode === 'REAL' ? 'bg-rose-500 text-white' : 'bg-emerald-400 text-slate-950'
                                        }`}>
                                            {deployMode === 'REAL' ? '실전매매 엔진 탑재 완료' : '가상매매 엔진 탑재 완료'}
                                        </span>
                                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            45초 주기 실시간 감시 작동 중
                                        </span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                                        {result.stock_name || result.symbol} ({result.symbol})
                                    </h3>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDeployModal(false)}
                                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* 등록된 규칙 요약 */}
                        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                            <div className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                                <span>📋 자동매매 엔진에 탑재된 최종 규칙</span>
                                <span className="text-amber-300">1회 {allocationKrw.toLocaleString()}원</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                    <div className="text-[11px] text-zinc-400 mb-0.5">
                                        {result.strategy_type === 'BREAKOUT' ? '돌파 매수 조건' : '매수 조건'}
                                    </div>
                                    <div className="text-sm font-bold text-sky-400">
                                        {result.strategy_type === 'BREAKOUT'
                                            ? `+${result.improved_rules?.buy_dip ?? 2.5}% 돌파 (${result.vol_mult || 1.5}배↑)`
                                            : `-${result.improved_rules?.buy_dip ?? 3.0}% ${result.strategy_type === 'SAFE_DIP' ? '칼날방지' : '하락'}`}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                    <div className="text-[11px] text-zinc-400 mb-0.5">자동 익절</div>
                                    <div className="text-sm font-bold text-emerald-400">
                                        +{result.improved_rules?.tp ?? 6.0}%
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                    <div className="text-[11px] text-zinc-400 mb-0.5">자동 손절</div>
                                    <div className="text-sm font-bold text-rose-400">
                                        -{result.improved_rules?.sl ?? 4.5}%
                                    </div>
                                </div>
                            </div>

                            {lastDeployedInfo?.strategy?.monitor_status && (
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 font-semibold">
                                    📡 현재 상태: {lastDeployedInfo.strategy.monitor_status}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeployModal(false);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer"
                            >
                                📡 상단 실시간 감시 현황 보기
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeployModal(false);
                                    window.location.href = '/admin/auto-trade';
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-200 border border-white/10 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                            >
                                🤖 자동매매 관리 콘솔로 이동
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDeployModal(false)}
                                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs sm:text-sm font-medium cursor-pointer"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
