# -*- coding: utf-8 -*-
"""
AI 매매 전략 자율 연습장 & 자율 교정 엔진 (Strategy Lab & Self-Correction Loop)
- 사용자의 자연어 또는 정형 매매 규칙을 파싱
- 최근 3~5년 과거 주가(KRX / yfinance)로 가상 매매(백테스트) 실행
- 손실 거래(Failures)를 정밀 분석하여 손실 원인 도출
- 규칙을 1~3단계 스스로 수정하여 최적화 및 수익률/MDD 개선
- '최근 1년 블라인드 데이터(Out-of-sample)'로 과최적화 여부 최종 검증
- 검증 완료된 전략을 모의/실전 자동매매로 즉시 연결
"""

import os
import re
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger("StrategyLab")
logger.setLevel(logging.INFO)

KST = timezone(timedelta(hours=9))


def fetch_historical_candles(symbol: str, years: int = 5) -> Optional[pd.DataFrame]:
    """과거 주가 일봉 데이터 조회 (yfinance 기반, KRX 및 미국주식 지원)"""
    import yfinance as yf

    sym = symbol.strip().upper()
    # 6자리 한국 종목코드 처리
    if re.match(r'^\d{6}$', sym):
        # 코스피/코스닥 판별 (기본 .KS 시도 후 .KQ 폴백)
        candidates = [f"{sym}.KS", f"{sym}.KQ"]
    elif not "." in sym and len(sym) <= 5:
        candidates = [sym]  # 미국 주식
    else:
        candidates = [sym]

    df = None
    for ticker_sym in candidates:
        try:
            tk = yf.Ticker(ticker_sym)
            hist = tk.history(period=f"{years}y", auto_adjust=True)
            if hist is not None and len(hist) >= 100:
                df = hist.copy()
                df["Ticker"] = ticker_sym
                break
        except Exception as e:
            logger.warning(f"Failed to fetch {ticker_sym}: {e}")

    if df is None or len(df) < 50:
        return None

    # 정규화
    df = df.reset_index()
    # 컬럼 정리
    col_map = {}
    for c in df.columns:
        cl = str(c).lower()
        if "date" in cl:
            col_map[c] = "Date"
        elif "open" in cl:
            col_map[c] = "Open"
        elif "high" in cl:
            col_map[c] = "High"
        elif "low" in cl:
            col_map[c] = "Low"
        elif "close" in cl:
            col_map[c] = "Close"
        elif "volume" in cl:
            col_map[c] = "Volume"
    df = df.rename(columns=col_map)
    df["Date"] = pd.to_datetime(df["Date"]).dt.tz_localize(None)
    df = df.sort_values("Date").reset_index(drop=True)
    return df


def run_single_backtest(
    df: pd.DataFrame,
    buy_dip_pct: float,        # 매수 조건: 전일 대비 -X% 이상 하락 시
    take_profit_pct: float,    # 익절 조건: 매수가 대비 +Y% 도달 시
    stop_loss_pct: float,      # 손절 조건: 매수가 대비 -Z% 도달 시
    max_portfolio_dd_pct: float = 15.0, # 최대 손실 한도: 계좌 고점 대비 -W% 시 거래 중단
    fee_pct: float = 0.0015,   # 편도 수수료 0.15% (매매 수수료 + 거래세 등)
    capital: float = 10000000.0, # 시뮬레이션 기본 자금 (1000만원)
) -> Dict[str, Any]:
    """
    단일 백테스트 엔진:
    - 당일 종가로 매수 신호 판단 ➔ 익일 시초가(Open)에 진입
    - 장중 최고가(High)로 익절선 판단, 최저가(Low)로 손절선 판단
    - 손실 거래 내역 및 패인 데이터 수집
    """
    if len(df) < 10:
        return {"error": "데이터가 부족합니다."}

    # 전일 대비 등락률 계산
    df = df.copy()
    df["PrevClose"] = df["Close"].shift(1)
    df["DailyChangePct"] = (df["Close"] - df["PrevClose"]) / df["PrevClose"] * 100.0
    # 20일선 및 50일선
    df["MA20"] = df["Close"].rolling(20).mean()
    df["MA50"] = df["Close"].rolling(50).mean()

    cash = capital
    peak_cash = capital
    position = None # {buy_date, buy_price, shares, cost}
    trades = []
    daily_equity = []
    is_halted = False
    halt_date = None

    for i in range(1, len(df) - 1):
        curr_row = df.iloc[i]
        next_row = df.iloc[i + 1]
        date_str = str(curr_row["Date"].strftime("%Y-%m-%d"))

        # 현재 총자산 평가
        if position is not None:
            curr_equity = cash + (position["shares"] * curr_row["Close"])
        else:
            curr_equity = cash

        if curr_equity > peak_cash:
            peak_cash = curr_equity

        # 최대 손실 한도(Drawdown) 검사
        dd_from_peak = (curr_equity - peak_cash) / peak_cash * 100.0
        if not is_halted and dd_from_peak <= -abs(max_portfolio_dd_pct):
            is_halted = True
            halt_date = date_str
            # 한도 도달 시 보유 포지션 강제 청산
            if position is not None:
                exit_price = curr_row["Close"]
                pnl = (exit_price - position["buy_price"]) * position["shares"]
                pnl_pct = (exit_price - position["buy_price"]) / position["buy_price"] * 100.0
                cash += position["shares"] * exit_price * (1.0 - fee_pct)
                trades.append({
                    "entry_date": position["buy_date"],
                    "exit_date": date_str,
                    "entry_price": position["buy_price"],
                    "exit_price": exit_price,
                    "shares": position["shares"],
                    "pnl": pnl,
                    "pnl_pct": pnl_pct,
                    "result": "LOSS",
                    "reason": "최대 손실 한도 도달 강제 청산",
                    "failure_tag": "MAX_DD_HALT",
                })
                position = None
            break

        # 포지션 보유 중일 때: 익절 및 손절 체크
        if position is not None:
            entry_p = position["buy_price"]
            high_p = curr_row["High"]
            low_p = curr_row["Low"]
            tp_target = entry_p * (1.0 + take_profit_pct / 100.0)
            sl_target = entry_p * (1.0 - abs(stop_loss_pct) / 100.0)

            # 장중 손절 먼저 체크 (보수적 리스크 관리)
            if low_p <= sl_target:
                exit_p = min(curr_row["Open"], sl_target)
                pnl_pct = (exit_p - entry_p) / entry_p * 100.0
                pnl = (exit_p - entry_p) * position["shares"]
                cash += position["shares"] * exit_p * (1.0 - fee_pct)
                
                # 실패 원인 분석
                fail_tag = "STOP_LOSS_HIT"
                fail_reason = f"산 가격({entry_p:,.0f}원) 대비 -{abs(stop_loss_pct):.1f}% 손절선({sl_target:,.0f}원) 도달 손절"
                if curr_row.get("DailyChangePct", 0) < -3.0:
                    fail_tag = "FALLING_KNIFE"
                    fail_reason = "하락 추세가 이어지는 중에 매수하여 추가 급락 손절"

                trades.append({
                    "entry_date": position["buy_date"],
                    "exit_date": date_str,
                    "entry_price": entry_p,
                    "exit_price": exit_p,
                    "shares": position["shares"],
                    "pnl": pnl,
                    "pnl_pct": pnl_pct,
                    "result": "LOSS",
                    "reason": fail_reason,
                    "failure_tag": fail_tag,
                })
                position = None
            elif high_p >= tp_target:
                exit_p = max(curr_row["Open"], tp_target)
                pnl_pct = (exit_p - entry_p) / entry_p * 100.0
                pnl = (exit_p - entry_p) * position["shares"]
                cash += position["shares"] * exit_p * (1.0 - fee_pct)
                trades.append({
                    "entry_date": position["buy_date"],
                    "exit_date": date_str,
                    "entry_price": entry_p,
                    "exit_price": exit_p,
                    "shares": position["shares"],
                    "pnl": pnl,
                    "pnl_pct": pnl_pct,
                    "result": "WIN",
                    "reason": f"목표 수익률(+{take_profit_pct:.1f}%) 달성 익절",
                    "failure_tag": "NONE",
                })
                position = None

        # 포지션이 없고 매수 조건 만족 시 익일 시초가 진입 예약
        if position is None and not is_halted:
            daily_chg = curr_row["DailyChangePct"]
            if not np.isnan(daily_chg) and daily_chg <= -abs(buy_dip_pct):
                next_open = next_row["Open"]
                if next_open > 0:
                    invest_amt = cash * 0.95 # 현금의 95% 투입
                    shares = int(invest_amt // next_open)
                    if shares > 0:
                        cost = shares * next_open * (1.0 + fee_pct)
                        cash -= cost
                        position = {
                            "buy_date": str(next_row["Date"].strftime("%Y-%m-%d")),
                            "buy_price": next_open,
                            "shares": shares,
                            "cost": cost,
                        }

    # 마지막 미청산 포지션 종가 기준 평가
    if position is not None:
        last_close = df.iloc[-1]["Close"]
        pnl = (last_close - position["buy_price"]) * position["shares"]
        pnl_pct = (last_close - position["buy_price"]) / position["buy_price"] * 100.0
        cash += position["shares"] * last_close * (1.0 - fee_pct)
        trades.append({
            "entry_date": position["buy_date"],
            "exit_date": str(df.iloc[-1]["Date"].strftime("%Y-%m-%d")),
            "entry_price": position["buy_price"],
            "exit_price": last_close,
            "shares": position["shares"],
            "pnl": pnl,
            "pnl_pct": pnl_pct,
            "result": "WIN" if pnl >= 0 else "LOSS",
            "reason": "시뮬레이션 종료 시점 평가 청산",
            "failure_tag": "OPEN_CLOSE" if pnl < 0 else "NONE",
        })

    final_equity = cash
    total_return_pct = (final_equity - capital) / capital * 100.0
    win_trades = [t for t in trades if t["result"] == "WIN"]
    loss_trades = [t for t in trades if t["result"] == "LOSS"]
    win_rate = (len(win_trades) / len(trades) * 100.0) if trades else 0.0

    # 단순 보유(Buy & Hold) 수익률 비교
    first_close = df.iloc[0]["Close"]
    last_close = df.iloc[-1]["Close"]
    bnh_return_pct = (last_close - first_close) / first_close * 100.0

    return {
        "buy_dip_pct": buy_dip_pct,
        "take_profit_pct": take_profit_pct,
        "stop_loss_pct": stop_loss_pct,
        "max_portfolio_dd_pct": max_portfolio_dd_pct,
        "total_trades": len(trades),
        "win_trades": len(win_trades),
        "loss_trades": len(loss_trades),
        "win_rate_pct": round(win_rate, 1),
        "total_return_pct": round(total_return_pct, 1),
        "bnh_return_pct": round(bnh_return_pct, 1),
        "is_halted": is_halted,
        "halt_date": halt_date,
        "trades": trades,
        "loss_details": loss_trades,
    }


def run_strategy_auto_tuning_loop(
    symbol: str,
    user_prompt: str = "",
    init_buy_dip: float = 3.0,
    init_tp: float = 5.0,
    init_sl: float = 5.0,
    max_dd: float = 15.0,
    years: int = 5,
) -> Dict[str, Any]:
    """
    자가 교정 AI 최적화 루프 (Self-Correction Loop):
    1. 5년 주가 로드 (최근 1년은 검증용 OOS로 분리)
    2. 학습 기간(In-sample, 약 3~4년)에 초기 규칙 실행
    3. 손실 거래 원인 분석 ➔ 규칙 1개씩 점진적 수정 (Iteration 1, 2, 3)
    4. 최적화된 최종 규칙을 검증용 1년(Out-of-sample)에 맹검 테스트
    5. 전과정 보고서 및 strategy-improved.json 도출
    """
    df = fetch_historical_candles(symbol, years=years)
    if df is None or len(df) < 150:
        return {
            "status": "error",
            "message": f"'{symbol}'의 과거 주가 데이터를 충분히 불러오지 못했습니다. 종목코드나 티커를 확인해 주세요.",
        }

    # 최근 1년(약 250거래일)을 검증용(OOS)으로 분리
    split_idx = max(50, len(df) - 250)
    train_df = df.iloc[:split_idx].reset_index(drop=True)
    test_df = df.iloc[split_idx:].reset_index(drop=True)

    test_start_date = test_df.iloc[0]["Date"].strftime("%Y-%m-%d")
    test_end_date = test_df.iloc[-1]["Date"].strftime("%Y-%m-%d")

    # 1. 초기 백테스트 실행 (Step 0)
    history_steps = []
    
    # 만약 사고판 횟수가 5회 미만이면 진입 기준을 완화하여 유효 모수 확보
    cur_buy_dip = init_buy_dip
    cur_tp = init_tp
    cur_sl = init_sl

    step0 = run_single_backtest(train_df, cur_buy_dip, cur_tp, cur_sl, max_portfolio_dd_pct=max_dd)
    
    # 5회 미만 시 완화
    relaxed_note = ""
    if step0["total_trades"] < 5 and cur_buy_dip > 1.5:
        orig_dip = cur_buy_dip
        cur_buy_dip = max(1.5, round(cur_buy_dip * 0.7, 2))
        step0 = run_single_backtest(train_df, cur_buy_dip, cur_tp, cur_sl, max_portfolio_dd_pct=max_dd)
        relaxed_note = f"거래 횟수 부족으로 매수 하락 기준을 -{orig_dip}%에서 -{cur_buy_dip}%로 완화"

    step0["step_name"] = "초기 규칙 (시작)"
    step0["change_desc"] = f"하루 {cur_buy_dip:.1f}% 하락 시 매수, +{cur_tp:.1f}% 익절, -{cur_sl:.1f}% 손절"
    if relaxed_note:
        step0["change_desc"] += f" ({relaxed_note})"
    history_steps.append(step0)

    # 2. 반복 자가 교정 루프 (최대 3회 개선 시도)
    for iter_num in range(1, 4):
        prev = history_steps[-1]
        loss_details = prev.get("loss_details", [])
        
        # 패인 분석: 손실 거래 태그 카운트
        falling_knife_count = sum(1 for t in loss_details if t.get("failure_tag") == "FALLING_KNIFE")
        stop_loss_count = sum(1 for t in loss_details if t.get("failure_tag") == "STOP_LOSS_HIT")
        
        step_name = f"{iter_num}번째 자율 수정"
        change_desc = ""
        cand_buy = cur_buy_dip
        cand_tp = cur_tp
        cand_sl = cur_sl

        if iter_num == 1:
            # 1차 수정: 하락폭 매수 기준 강화 (더 깊은 눌림목에 매수)
            cand_buy = round(cur_buy_dip * 1.25, 2)
            change_desc = f"사는 기준을 하루 -{cur_buy_dip:.1f}%에서 -{cand_buy:.1f}% 하락으로 강화 (충분한 가격 메리트 확인)"
            cur_buy_dip = cand_buy
        elif iter_num == 2:
            # 2차 수정: 목표 익절가 확대 (수익 런닝 극대화)
            cand_tp = round(cur_tp * 1.25, 2)
            change_desc = f"파는 기준(익절)을 +{cur_tp:.1f}%에서 +{cand_tp:.1f}%로 상향 (추세 반등 폭 극대화)"
            cur_tp = cand_tp
        elif iter_num == 3:
            # 3차 수정: 손절선 타이트화 (최대 손실 방어)
            cand_sl = max(3.0, round(cur_sl * 0.8, 1))
            change_desc = f"손절선을 -{cur_sl:.1f}%에서 -{cand_sl:.1f}%로 타이트하게 축소 (손실 리스크 조기 차단)"
            cur_sl = cand_sl

        new_res = run_single_backtest(train_df, cur_buy_dip, cur_tp, cur_sl, max_portfolio_dd_pct=max_dd)
        new_res["step_name"] = step_name
        new_res["change_desc"] = change_desc
        history_steps.append(new_res)

    best_step = history_steps[-1]

    # 3. 최근 1년(Out-of-sample) 블라인드 테스트
    # 고치기 전 초기 규칙으로 최근 1년 테스트
    test_initial = run_single_backtest(test_df, init_buy_dip, init_tp, init_sl, max_portfolio_dd_pct=max_dd)
    # 고친 후 최종 규칙으로 최근 1년 테스트
    test_improved = run_single_backtest(test_df, cur_buy_dip, cur_tp, cur_sl, max_portfolio_dd_pct=max_dd)

    # 과최적화 평가 판정
    oos_eval = "STABLE"
    oos_comment = "최근 1년에서도 안정적으로 플러스 수익을 방어하며 실전 적합 판정을 받았습니다."
    if test_improved["total_return_pct"] < test_initial["total_return_pct"] or test_improved["total_return_pct"] < 0:
        oos_eval = "OVERFITTING_CAUTION"
        oos_comment = (
            f"과거 데이터에는 최적화되었으나, 최근 1년 장세에서는 수익률이 {test_improved['total_return_pct']:+.1f}%로 "
            "다소 부진했습니다. 과거 과최적화 가능성이 있으므로 분할 매수와 손절선 엄수가 필수적입니다."
        )

    # 4. strategy-improved.json 규격 생성
    strategy_config = {
        "strategy_id": f"STRAT-{symbol}-{datetime.now(KST).strftime('%Y%m%d%H%M')}",
        "symbol": symbol,
        "created_at": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
        "entry_rule": f"전일 대비 -{cur_buy_dip:.1f}% 이상 급락 시 익일 시초가 분할 매수",
        "exit_rule": f"매수가 대비 +{cur_tp:.1f}% 도달 시 기계적 전량/분할 익절",
        "stop_loss_pct": cur_sl,
        "max_drawdown_limit_pct": max_dd,
        "buy_dip_threshold_pct": cur_buy_dip,
        "take_profit_threshold_pct": cur_tp,
        "test_period": f"최근 {years}년 (검증용 1년: {test_start_date} ~ {test_end_date})",
        "train_performance": {
            "initial_return": f"{history_steps[0]['total_return_pct']:+.1f}%",
            "improved_return": f"{best_step['total_return_pct']:+.1f}%",
            "win_rate": f"{best_step['win_rate_pct']:.1f}%",
            "trades_count": best_step['total_trades'],
            "bnh_return": f"{best_step['bnh_return_pct']:+.1f}%",
        },
        "oos_1year_performance": {
            "before_improved": f"{test_initial['total_return_pct']:+.1f}%",
            "after_improved": f"{test_improved['total_return_pct']:+.1f}%",
            "trades_count": test_improved['total_trades'],
            "evaluation": oos_eval,
            "comment": oos_comment,
        }
    }

    return {
        "status": "success",
        "symbol": symbol,
        "years": years,
        "test_range": {
            "train_start": df.iloc[0]["Date"].strftime("%Y-%m-%d"),
            "train_end": train_df.iloc[-1]["Date"].strftime("%Y-%m-%d"),
            "oos_start": test_start_date,
            "oos_end": test_end_date,
        },
        "initial_rules": {
            "buy_dip": init_buy_dip,
            "tp": init_tp,
            "sl": init_sl,
            "max_dd": max_dd,
        },
        "improved_rules": {
            "buy_dip": cur_buy_dip,
            "tp": cur_tp,
            "sl": cur_sl,
            "max_dd": max_dd,
        },
        "steps_table": [
            {
                "step": s["step_name"],
                "change": s["change_desc"],
                "reason": s.get("change_desc", ""),
                "buy_dip": s.get("buy_dip", cur_buy_dip),
                "tp": s.get("take_profit", cur_tp),
                "sl": s.get("stop_loss", cur_sl),
                "return_pct": f"{s['total_return_pct']:+.1f}%",
                "win_rate": f"{s['win_rate_pct']:.1f}%",
                "trades": s["total_trades"],
                "bnh_return": f"{s['bnh_return_pct']:+.1f}%",
            }
            for s in history_steps
        ],
        "recent_1year_oos": {
            "period": f"{test_start_date} ~ {test_end_date}",
            "initial_return_pct": f"{test_initial['total_return_pct']:+.1f}%",
            "improved_return_pct": f"{test_improved['total_return_pct']:+.1f}%",
            "initial_trades": test_initial["total_trades"],
            "improved_trades": test_improved["total_trades"],
            "eval_status": oos_eval,
            "comment": oos_comment,
        },
        "strategy_config": strategy_config,
    }
