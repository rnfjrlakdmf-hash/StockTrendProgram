# -*- coding: utf-8 -*-
"""
AI 매매 전략 자율 연습장 & 자율 교정 엔진 (Strategy Lab & Self-Correction Loop v2)
- 3가지 실전 매매 전략 지원:
  1) SAFE_DIP   : 🛡️ 악재 칼날 방지 눌림목 매수 (60일선 지지 + 악재 투매 거래량 폭탄 차단 + RSI 과열 배제)
  2) BREAKOUT   : 🚀 거래량·수급 추세 돌파 매수 (20일선 상승 추세 + 평균 대비 1.5배+ 거래량 급증 돌파 + 꼭대기 과열 배제)
  3) SIMPLE_DIP : 📉 기존 단순 하락 매수 (비교 기준선)
- 최근 3~5년 과거 주가(KRX / yfinance)로 학습 구간(In-sample) & 최근 1년 블라인드(Out-of-sample) 분리 검증
- 손실 원인 분석 후 규칙을 3단계 점진 개선하되, 실제 성과가 가장 우수한 최적 규칙을 자동 선택
- 3대 전략(단순 하락 vs 칼날방지 눌림목 vs 거래량·수급 돌파) 동일 구간 자동 비교표 함께 산출
"""

import re
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger("StrategyLab")
logger.setLevel(logging.INFO)

KST = timezone(timedelta(hours=9))

STRATEGY_META: Dict[str, Dict[str, str]] = {
    "SAFE_DIP": {
        "name": "🛡️ 악재 칼날 방지 눌림목",
        "short_name": "칼날방지 눌림목",
        "easy_desc": "주가가 떨어질 때 싸게 사되, 장기 하락 추세(60일선 이탈)나 악재 폭락(거래량 폭탄 음봉)은 자동으로 걸러내고 건강한 조정만 잡는 안정형 전략입니다.",
    },
    "BREAKOUT": {
        "name": "🚀 거래량·수급 추세 돌파",
        "short_name": "거래량·수급 돌파",
        "easy_desc": "평소보다 거래량이 1.5배 이상 터지면서 20일선 위 상승 추세를 강하게 돌파할 때 올라타는 상승장·주도주 전용 추세 전략입니다.",
    },
    "SIMPLE_DIP": {
        "name": "📉 기존 단순 하락 매수",
        "short_name": "단순 하락 매수",
        "easy_desc": "필터 없이 하루 일정 % 하락하면 바로 진입하는 기본 역추세 방식입니다. (칼날 방지 필터 효과 비교용)",
    },
}


def _normalize_strategy_type(raw: Optional[str], knife_filter: bool = True) -> str:
    st = str(raw or "").strip().upper()
    if st in ("BREAKOUT", "TREND_BREAKOUT", "VOLUME_BREAKOUT"):
        return "BREAKOUT"
    if st in ("SIMPLE_DIP", "SIMPLE", "DIP"):
        return "SIMPLE_DIP" if not knife_filter else "SAFE_DIP"
    if st in ("SAFE_DIP", "SAFE"):
        return "SAFE_DIP" if knife_filter else "SIMPLE_DIP"
    return "SAFE_DIP" if knife_filter else "SIMPLE_DIP"


def fetch_historical_candles(symbol: str, years: int = 5) -> Optional[pd.DataFrame]:
    """과거 주가 일봉 데이터 조회 (yfinance + FinanceDataReader 폴백, 국내·해외 전 종목 & 신규상장주 지원)"""
    import yfinance as yf

    sym = symbol.strip().upper()
    is_kr_code = bool(re.match(r"^\d{6}$", sym))
    if is_kr_code:
        candidates = [f"{sym}.KS", f"{sym}.KQ"]
    elif "." not in sym and len(sym) <= 6:
        candidates = [sym]
    else:
        candidates = [sym]

    df = None
    for ticker_sym in candidates:
        try:
            tk = yf.Ticker(ticker_sym)
            hist = tk.history(period=f"{years}y", auto_adjust=True)
            if hist is None or len(hist) < 60:
                hist = tk.history(period="max", auto_adjust=True)
            if hist is not None and len(hist) >= 60:
                df = hist.copy()
                df["Ticker"] = ticker_sym
                break
        except Exception as e:
            logger.warning(f"Failed to fetch {ticker_sym}: {e}")

    if (df is None or len(df) < 60) and is_kr_code:
        try:
            import FinanceDataReader as fdr
            start_dt = (datetime.now(KST) - timedelta(days=years * 365 + 30)).strftime("%Y-%m-%d")
            fdr_df = fdr.DataReader(sym, start_dt)
            if fdr_df is not None and len(fdr_df) >= 60:
                df = fdr_df.copy()
                df["Ticker"] = sym
        except Exception as e:
            logger.warning(f"FinanceDataReader fallback failed for {sym}: {e}")

    if df is None or len(df) < 60:
        return None

    df = df.reset_index()
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


def _add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """백테스트에 필요한 핵심 차트·거래량·RSI 지표를 1회 일괄 계산"""
    out = df.copy()
    out["PrevClose"] = out["Close"].shift(1)
    out["DailyChangePct"] = (out["Close"] - out["PrevClose"]) / out["PrevClose"] * 100.0
    out["MA20"] = out["Close"].rolling(20, min_periods=10).mean()
    out["MA60"] = out["Close"].rolling(60, min_periods=20).mean()
    out["VolMA20"] = out["Volume"].rolling(20, min_periods=5).mean()
    out["VolRatio"] = np.where(out["VolMA20"] > 0, out["Volume"] / out["VolMA20"], 1.0)
    out["High10"] = out["Close"].shift(1).rolling(10, min_periods=5).max()

    # RSI(14)
    delta = out["Close"].diff()
    gain = delta.clip(lower=0).rolling(14, min_periods=5).mean()
    loss = (-delta.clip(upper=0)).rolling(14, min_periods=5).mean()
    rs = gain / loss.replace(0, np.nan)
    out["RSI14"] = (100.0 - (100.0 / (1.0 + rs))).fillna(50.0)
    return out


def run_single_backtest(
    df: pd.DataFrame,
    buy_dip_pct: float,                  # SAFE_DIP/SIMPLE_DIP: 하락률(%), BREAKOUT: 돌파 상승률(%)
    take_profit_pct: float,              # 익절 목표 (+%)
    stop_loss_pct: float,                # 손절선 (-%)
    max_portfolio_dd_pct: float = 15.0,  # 계좌 최대 손실 한도 (-%)
    fee_pct: float = 0.0015,             # 편도 수수료/거래세 0.15%
    capital: float = 10000000.0,         # 시뮬레이션 기본 자금 (1,000만원)
    strategy_type: str = "SAFE_DIP",     # SAFE_DIP | BREAKOUT | SIMPLE_DIP
    vol_mult: float = 1.5,               # 돌파 매수 시 최소 거래량 배수
) -> Dict[str, Any]:
    """
    단일 백테스트 엔진 (v2):
    - SAFE_DIP   : 하락 기준 충족 + 60일선 지지(>=96%) + 악재 투매 거래량 폭탄(<=2.8배) 차단 + RSI<=60
    - BREAKOUT   : 상승 기준 충족 + 거래량 vol_mult배 이상 급증 + 20일선 상향 정배열 + RSI<=78(꼭대기 추격 방지)
    - SIMPLE_DIP : 전일 대비 -buy_dip_pct% 하락 시 무조건 매수 (비교 기준)
    """
    if len(df) < 15:
        return {"error": "데이터가 부족합니다."}

    df_ind = df if "RSI14" in df.columns else _add_technical_indicators(df)
    st_type = str(strategy_type or "SAFE_DIP").upper()

    cash = capital
    peak_cash = capital
    position = None
    trades: List[Dict[str, Any]] = []
    is_halted = False
    halt_date = None
    blocked_knives_count = 0

    for i in range(1, len(df_ind) - 1):
        curr_row = df_ind.iloc[i]
        next_row = df_ind.iloc[i + 1]
        date_str = str(curr_row["Date"].strftime("%Y-%m-%d"))

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
            if position is not None:
                exit_price = float(curr_row["Close"])
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

        # 포지션 보유 중: 익절 / 손절 체크
        if position is not None:
            entry_p = position["buy_price"]
            high_p = float(curr_row["High"])
            low_p = float(curr_row["Low"])
            tp_target = entry_p * (1.0 + abs(take_profit_pct) / 100.0)
            sl_target = entry_p * (1.0 - abs(stop_loss_pct) / 100.0)

            if low_p <= sl_target:
                exit_p = min(float(curr_row["Open"]), sl_target)
                pnl_pct = (exit_p - entry_p) / entry_p * 100.0
                pnl = (exit_p - entry_p) * position["shares"]
                cash += position["shares"] * exit_p * (1.0 - fee_pct)

                fail_tag = "STOP_LOSS_HIT"
                fail_reason = f"매수가 대비 -{abs(stop_loss_pct):.1f}% 손절선 도달 방어 청산"
                if float(curr_row.get("DailyChangePct") or 0) < -3.0:
                    fail_tag = "FALLING_KNIFE"
                    fail_reason = "추가 급락으로 손절 방어선 이탈 청산"

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
                exit_p = max(float(curr_row["Open"]), tp_target)
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
                    "reason": f"목표 수익률(+{abs(take_profit_pct):.1f}%) 달성 익절",
                    "failure_tag": "NONE",
                })
                position = None

        # 미보유 시 매수 시그널 판정
        if position is None and not is_halted:
            daily_chg = float(curr_row["DailyChangePct"]) if pd.notna(curr_row["DailyChangePct"]) else 0.0
            close_p = float(curr_row["Close"])
            ma20 = float(curr_row["MA20"]) if pd.notna(curr_row["MA20"]) else close_p
            ma60 = float(curr_row["MA60"]) if pd.notna(curr_row["MA60"]) else ma20
            vol_ratio = float(curr_row["VolRatio"]) if pd.notna(curr_row["VolRatio"]) else 1.0
            rsi14 = float(curr_row["RSI14"]) if pd.notna(curr_row["RSI14"]) else 50.0
            high10 = float(curr_row["High10"]) if pd.notna(curr_row["High10"]) else close_p

            trigger_buy = False
            if st_type == "BREAKOUT":
                # 🚀 거래량·수급 추세 돌파: 상승률 충족 + 거래량 급증 + 20일선 위 정배열 + 과열 꼭대기 배제
                price_break = (daily_chg >= abs(buy_dip_pct)) or (close_p > high10 and daily_chg >= max(1.0, abs(buy_dip_pct) * 0.6))
                vol_ok = vol_ratio >= max(1.1, float(vol_mult))
                trend_ok = close_p >= ma20 * 0.995
                not_overheated = rsi14 <= 78.0
                if price_break:
                    if vol_ok and trend_ok and not_overheated:
                        trigger_buy = True
                    else:
                        blocked_knives_count += 1
            elif st_type == "SAFE_DIP":
                # 🛡️ 악재 칼날 방지 눌림목: 하락률 충족 + 장기 추세 생존(60일선 96%↑) + 악재 투매 거래량 폭탄(<=2.8배) 차단 + RSI<=62
                if daily_chg <= -abs(buy_dip_pct):
                    trend_alive = close_p >= ma60 * 0.96
                    not_panic_dump = vol_ratio <= 2.8
                    not_overbought = rsi14 <= 62.0
                    if trend_alive and not_panic_dump and not_overbought:
                        trigger_buy = True
                    else:
                        blocked_knives_count += 1
            else:
                # 📉 기존 단순 하락 매수 (필터 없음)
                if daily_chg <= -abs(buy_dip_pct):
                    trigger_buy = True

            if trigger_buy:
                next_open = float(next_row["Open"])
                if next_open > 0:
                    invest_amt = cash * 0.95
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
        last_close = float(df_ind.iloc[-1]["Close"])
        pnl = (last_close - position["buy_price"]) * position["shares"]
        pnl_pct = (last_close - position["buy_price"]) / position["buy_price"] * 100.0
        cash += position["shares"] * last_close * (1.0 - fee_pct)
        trades.append({
            "entry_date": position["buy_date"],
            "exit_date": str(df_ind.iloc[-1]["Date"].strftime("%Y-%m-%d")),
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

    first_close = float(df_ind.iloc[0]["Close"])
    last_close = float(df_ind.iloc[-1]["Close"])
    bnh_return_pct = (last_close - first_close) / first_close * 100.0 if first_close > 0 else 0.0

    return {
        "strategy_type": st_type,
        "buy_dip_pct": buy_dip_pct,
        "take_profit_pct": take_profit_pct,
        "stop_loss_pct": stop_loss_pct,
        "vol_mult": vol_mult,
        "max_portfolio_dd_pct": max_portfolio_dd_pct,
        "total_trades": len(trades),
        "win_trades": len(win_trades),
        "loss_trades": len(loss_trades),
        "win_rate_pct": round(win_rate, 1),
        "total_return_pct": round(total_return_pct, 1),
        "bnh_return_pct": round(bnh_return_pct, 1),
        "blocked_knives_count": blocked_knives_count,
        "is_halted": is_halted,
        "halt_date": halt_date,
        "trades": trades,
        "loss_details": loss_trades,
    }


def _score_backtest(res: Dict[str, Any]) -> float:
    """수익률 + 승률 보너스 - 거래수 부족/중단 페널티 종합 점수"""
    trades = int(res.get("total_trades") or 0)
    ret = float(res.get("total_return_pct") or 0.0)
    wr = float(res.get("win_rate_pct") or 0.0)
    halted_pen = -15.0 if res.get("is_halted") else 0.0
    if trades == 0:
        return -999.0
    low_sample_pen = -8.0 if trades < 3 else 0.0
    return ret + (wr - 50.0) * 0.35 + halted_pen + low_sample_pen


def _build_easy_rule_texts(
    st_type: str,
    buy_pct: float,
    tp_pct: float,
    sl_pct: float,
    vol_mult: float,
) -> Dict[str, str]:
    if st_type == "BREAKOUT":
        return {
            "entry_rule": f"20일선 상승 추세 + 거래량 {vol_mult:.1f}배↑ 급증하며 +{buy_pct:.1f}% 돌파 시 자동 진입",
            "buy_rule": f"주가 +{buy_pct:.1f}% 이상 상승 돌파 + 거래량 평균 대비 {vol_mult:.1f}배↑ + 20일선 지지 + 과열(RSI 78↑) 배제 시 매수",
            "sell_rule": f"매수가 대비 +{tp_pct:.1f}% 상승 시 익절, -{sl_pct:.1f}% 하락 시 손절 방어",
        }
    if st_type == "SAFE_DIP":
        return {
            "entry_rule": f"60일선 지지·악재 투매 차단 통과 + 당일 -{buy_pct:.1f}% 눌림목 포착 시 자동 진입",
            "buy_rule": f"전일 대비 -{buy_pct:.1f}% 하락 + [🛡️ 칼날 방지: 60일선 지지 · 거래량 폭탄 투매 차단 · RSI 62↓] 통과 시 매수",
            "sell_rule": f"매수가 대비 +{tp_pct:.1f}% 상승 시 익절, -{sl_pct:.1f}% 하락 시 손절 방어",
        }
    return {
        "entry_rule": f"전일 대비 -{buy_pct:.1f}% 이상 급락 시 분할 매수 (단순 하락 기준)",
        "buy_rule": f"전일 종가 대비 -{buy_pct:.1f}% 이상 하락한 날 ➔ 필터 없이 조건 포착 즉시 매수",
        "sell_rule": f"매수가 대비 +{tp_pct:.1f}% 상승 시 익절, -{sl_pct:.1f}% 하락 시 손절 방어",
    }


def run_strategy_auto_tuning_loop(
    symbol: str,
    user_prompt: str = "",
    init_buy_dip: float = 3.0,
    init_tp: float = 5.0,
    init_sl: float = 5.0,
    max_dd: float = 15.0,
    years: int = 5,
    strategy_type: str = "SAFE_DIP",
    knife_filter: bool = True,
    vol_mult: float = 1.5,
) -> Dict[str, Any]:
    """
    자가 교정 AI 최적화 루프 (v2):
    1. 5년 주가 로드 & 기술지표(MA20/MA60/RSI14/거래량배수) 일괄 계산
    2. 최근 1년 블라인드(OOS) 분리
    3. 선택한 전략(SAFE_DIP / BREAKOUT / SIMPLE_DIP)으로 초기 테스트 + 3단계 자가 교정 수행
    4. 4개 단계 중 실제 성과 점수가 가장 우수한 최적 규칙을 최종 채택 (악화 시 자동 롤백!)
    5. 동일 종목에 대해 3대 전략(단순 하락 vs 칼날방지 눌림목 vs 거래량·수급 돌파) 자동 비교표 동시 생성
    """
    raw_df = fetch_historical_candles(symbol, years=years)
    if raw_df is None or len(raw_df) < 60:
        return {
            "status": "error",
            "message": f"'{symbol}'의 과거 주가 데이터를 충분히 불러오지 못했습니다. 종목코드나 티커를 확인해 주세요.",
        }

    st_type = _normalize_strategy_type(strategy_type, knife_filter=knife_filter)
    df = _add_technical_indicators(raw_df)

    # 최근 1년(약 250거래일)을 블라인드 검증용(OOS)으로 분리
    if len(df) >= 340:
        split_idx = len(df) - 250
    else:
        split_idx = max(35, int(len(df) * 0.75))
    train_df = df.iloc[:split_idx].reset_index(drop=True)
    test_df = df.iloc[split_idx:].reset_index(drop=True)

    test_start_date = test_df.iloc[0]["Date"].strftime("%Y-%m-%d")
    test_end_date = test_df.iloc[-1]["Date"].strftime("%Y-%m-%d")

    history_steps: List[Dict[str, Any]] = []
    cur_buy = abs(float(init_buy_dip or (2.5 if st_type == "BREAKOUT" else 3.0)))
    cur_tp = abs(float(init_tp or (8.0 if st_type == "BREAKOUT" else 6.0)))
    cur_sl = abs(float(init_sl or 4.5))
    cur_vol = max(1.1, float(vol_mult or 1.5))

    # Step 0: 초기 규칙 실행 (거래 횟수 부족 시 자동 완화)
    step0 = run_single_backtest(
        train_df, cur_buy, cur_tp, cur_sl, max_portfolio_dd_pct=max_dd, strategy_type=st_type, vol_mult=cur_vol
    )
    relaxed_note = ""
    if step0["total_trades"] < 4 and cur_buy > 1.5:
        orig_b = cur_buy
        cur_buy = max(1.5, round(cur_buy * 0.7, 2))
        if st_type == "BREAKOUT":
            cur_vol = max(1.2, round(cur_vol * 0.85, 2))
        step0 = run_single_backtest(
            train_df, cur_buy, cur_tp, cur_sl, max_portfolio_dd_pct=max_dd, strategy_type=st_type, vol_mult=cur_vol
        )
        relaxed_note = f"거래 모수 확보를 위해 진입 기준을 {orig_b:.1f}% → {cur_buy:.1f}%로 완화"

    step0["step_name"] = "초기 규칙 (시작)"
    step0["buy_dip"] = cur_buy
    step0["take_profit"] = cur_tp
    step0["stop_loss"] = cur_sl
    step0["vol_mult"] = cur_vol
    if st_type == "BREAKOUT":
        step0["change_desc"] = f"20일선 위 거래량 {cur_vol:.1f}배↑ · +{cur_buy:.1f}% 돌파 매수 / +{cur_tp:.1f}% 익절 / -{cur_sl:.1f}% 손절"
    elif st_type == "SAFE_DIP":
        step0["change_desc"] = f"칼날방지 통과 · -{cur_buy:.1f}% 눌림목 매수 / +{cur_tp:.1f}% 익절 / -{cur_sl:.1f}% 손절"
    else:
        step0["change_desc"] = f"하루 -{cur_buy:.1f}% 단순 하락 매수 / +{cur_tp:.1f}% 익절 / -{cur_sl:.1f}% 손절"
    if relaxed_note:
        step0["change_desc"] += f" ({relaxed_note})"
    history_steps.append(step0)

    # 3단계 자가 교정 루프 (이전 최고 성적 기준으로 점진 개선)
    best_step = step0
    best_score = _score_backtest(step0)

    for iter_num in range(1, 4):
        base_b = float(best_step["buy_dip"])
        base_tp = float(best_step["take_profit"])
        base_sl = float(best_step["stop_loss"])
        base_vol = float(best_step.get("vol_mult", cur_vol))

        if st_type == "BREAKOUT":
            if iter_num == 1:
                # 1차: 거래량 배수 & 돌파 강도 미세 조정 (가장 좋은 조합 선택)
                cand_list = [
                    (round(max(1.5, base_b * 0.85), 2), base_tp, base_sl, round(min(2.2, base_vol + 0.25), 2),
                     f"가짜 돌파 차단을 위해 거래량 기준을 {base_vol:.1f}배 → {min(2.2, base_vol + 0.25):.1f}배로 강화하고 진입 탄력 조정"),
                    (round(min(6.0, base_b * 1.2), 2), base_tp, base_sl, base_vol,
                     f"확실한 장대양봉 돌파만 잡기 위해 진입 기준을 +{base_b:.1f}% → +{min(6.0, base_b * 1.2):.1f}%로 상향"),
                ]
            elif iter_num == 2:
                cand_list = [
                    (base_b, round(min(25.0, base_tp * 1.35), 2), base_sl, base_vol,
                     f"추세 돌파 수익을 길게 끌고 가기 위해 익절 목표를 +{base_tp:.1f}% → +{min(25.0, base_tp * 1.35):.1f}%로 확대"),
                    (base_b, round(max(4.0, base_tp * 0.85), 2), base_sl, base_vol,
                     f"단기 차익 실현 승률을 높이기 위해 익절 목표를 +{base_tp:.1f}% → +{max(4.0, base_tp * 0.85):.1f}%로 현실화"),
                ]
            else:
                cand_list = [
                    (base_b, base_tp, max(3.0, round(base_sl * 0.85, 1)), base_vol,
                     f"돌파 실패 시 손실을 짧게 끊기 위해 손절선을 -{base_sl:.1f}% → -{max(3.0, round(base_sl * 0.85, 1)):.1f}%로 강화"),
                    (base_b, base_tp, min(8.0, round(base_sl * 1.2, 1)), base_vol,
                     f"장중 흔들림 털림을 줄이기 위해 손절 여유폭을 -{base_sl:.1f}% → -{min(8.0, round(base_sl * 1.2, 1)):.1f}%로 조정"),
                ]
        else:
            if iter_num == 1:
                cand_list = [
                    (round(min(8.0, base_b * 1.2), 2), base_tp, base_sl, base_vol,
                     f"충분한 가격 할인 구간만 잡도록 매수 하락폭을 -{base_b:.1f}% → -{min(8.0, base_b * 1.2):.1f}%로 강화"),
                    (round(max(1.5, base_b * 0.8), 2), base_tp, base_sl, base_vol,
                     f"우량 상승 종목의 얕은 눌림목도 포착하도록 하락폭을 -{base_b:.1f}% → -{max(1.5, base_b * 0.8):.1f}%로 민감화"),
                ]
            elif iter_num == 2:
                cand_list = [
                    (base_b, round(min(20.0, base_tp * 1.3), 2), base_sl, base_vol,
                     f"반등 수익을 키우기 위해 익절 목표를 +{base_tp:.1f}% → +{min(20.0, base_tp * 1.3):.1f}%로 상향"),
                    (base_b, round(max(3.5, base_tp * 0.85), 2), base_sl, base_vol,
                     f"익절 성공률(승률)을 높이기 위해 익절 목표를 +{base_tp:.1f}% → +{max(3.5, base_tp * 0.85):.1f}%로 조정"),
                ]
            else:
                cand_list = [
                    (base_b, base_tp, max(3.0, round(base_sl * 0.85, 1)), base_vol,
                     f"손실 리스크 조기 차단을 위해 손절선을 -{base_sl:.1f}% → -{max(3.0, round(base_sl * 0.85, 1)):.1f}%로 타이트화"),
                    (base_b, base_tp, min(8.0, round(base_sl * 1.2, 1)), base_vol,
                     f"단기 변동성 털림 방지를 위해 손절선을 -{base_sl:.1f}% → -{min(8.0, round(base_sl * 1.2, 1)):.1f}%로 완화"),
                ]

        picked_res = None
        picked_score = -1e9
        for cb, ctp, csl, cvol, cdesc in cand_list:
            r_try = run_single_backtest(
                train_df, cb, ctp, csl, max_portfolio_dd_pct=max_dd, strategy_type=st_type, vol_mult=cvol
            )
            sc = _score_backtest(r_try)
            if sc > picked_score:
                picked_score = sc
                picked_res = r_try
                picked_res["step_name"] = f"{iter_num}번째 자율 수정"
                picked_res["buy_dip"] = cb
                picked_res["take_profit"] = ctp
                picked_res["stop_loss"] = csl
                picked_res["vol_mult"] = cvol
                picked_res["change_desc"] = cdesc

        if picked_res is not None:
            if picked_score >= best_score:
                best_step = picked_res
                best_score = picked_score
                picked_res["adopted"] = True
            else:
                picked_res["adopted"] = False
                picked_res["change_desc"] += " (기존 최적 규칙보다 성과가 낮아 이전 최적 수치 유지)"
            history_steps.append(picked_res)

    final_buy = float(best_step["buy_dip"])
    final_tp = float(best_step["take_profit"])
    final_sl = float(best_step["stop_loss"])
    final_vol = float(best_step.get("vol_mult", cur_vol))

    # 최근 1년(OOS) 블라인드 검증: 초기 규칙 vs 최종 최적 규칙
    test_initial = run_single_backtest(
        test_df, cur_buy, init_tp, init_sl, max_portfolio_dd_pct=max_dd, strategy_type=st_type, vol_mult=cur_vol
    )
    test_improved = run_single_backtest(
        test_df, final_buy, final_tp, final_sl, max_portfolio_dd_pct=max_dd, strategy_type=st_type, vol_mult=final_vol
    )

    # 3대 전략 동일 구간 자동 비교표 (단순 하락 vs 🛡️ 칼날방지 눌림목 vs 🚀 거래량·수급 돌파)
    comparison_list: List[Dict[str, Any]] = []
    compare_presets = [
        ("SIMPLE_DIP", abs(float(init_buy_dip or 3.0)), abs(float(init_tp or 6.0)), abs(float(init_sl or 4.5)), 1.5),
        ("SAFE_DIP", final_buy if st_type == "SAFE_DIP" else abs(float(init_buy_dip or 3.0)),
         final_tp if st_type == "SAFE_DIP" else max(6.0, abs(float(init_tp or 6.0))),
         final_sl if st_type == "SAFE_DIP" else abs(float(init_sl or 4.5)), 1.5),
        ("BREAKOUT", final_buy if st_type == "BREAKOUT" else 2.5,
         final_tp if st_type == "BREAKOUT" else 9.0,
         final_sl if st_type == "BREAKOUT" else 4.5,
         final_vol if st_type == "BREAKOUT" else 1.5),
    ]
    for cmp_type, cb, ctp, csl, cvol in compare_presets:
        r_train = run_single_backtest(train_df, cb, ctp, csl, max_portfolio_dd_pct=max_dd, strategy_type=cmp_type, vol_mult=cvol)
        r_oos = run_single_backtest(test_df, cb, ctp, csl, max_portfolio_dd_pct=max_dd, strategy_type=cmp_type, vol_mult=cvol)
        meta = STRATEGY_META[cmp_type]
        oos_ret = float(r_oos["total_return_pct"])
        oos_wr = float(r_oos["win_rate_pct"])
        train_wr = float(r_train["win_rate_pct"])
        # 실전 추천 기준: 최근 1년 수익률 > 0 AND (최근1년 또는 5년 승률 >= 55%)
        pass_live = (oos_ret > 0) and (max(oos_wr, train_wr) >= 55.0)
        comparison_list.append({
            "strategy_type": cmp_type,
            "name": meta["name"],
            "short_name": meta["short_name"],
            "easy_desc": meta["easy_desc"],
            "is_selected": cmp_type == st_type,
            "train_return_pct": r_train["total_return_pct"],
            "train_win_rate_pct": r_train["win_rate_pct"],
            "train_trades": r_train["total_trades"],
            "oos_return_pct": r_oos["total_return_pct"],
            "oos_win_rate_pct": r_oos["win_rate_pct"],
            "oos_trades": r_oos["total_trades"],
            "blocked_knives": int(r_train["blocked_knives_count"]) + int(r_oos["blocked_knives_count"]),
            "pass_live_criteria": pass_live,
            "rank_score": oos_ret * 1.4 + float(r_train["total_return_pct"]) * 0.4 + (oos_wr - 50.0) * 0.5,
        })

    best_cmp = max(comparison_list, key=lambda x: x["rank_score"])
    for c_item in comparison_list:
        c_item["is_best_match"] = c_item["strategy_type"] == best_cmp["strategy_type"]

    # 실전 적합성 & 과최적화 판정
    oos_ret_final = float(test_improved["total_return_pct"])
    oos_wr_final = float(test_improved["win_rate_pct"])
    train_wr_final = float(best_step["win_rate_pct"])
    total_blocked_knives = int(best_step.get("blocked_knives_count", 0)) + int(test_improved.get("blocked_knives_count", 0))

    if oos_ret_final > 0 and max(oos_wr_final, train_wr_final) >= 55.0:
        oos_eval = "STABLE"
        live_readiness = "PASS"
        oos_comment = (
            f"✅ 최근 1년 블라인드 시험에서도 {oos_ret_final:+.1f}% (승률 {oos_wr_final:.0f}%)로 플러스 수익을 기록했습니다! "
            f"가상매매(10만원)로 먼저 1주일 검증 후 실전 승격 후보로 적합합니다."
        )
    elif oos_ret_final > 0:
        oos_eval = "STABLE"
        live_readiness = "WATCH"
        oos_comment = (
            f"🟢 최근 1년 수익률은 {oos_ret_final:+.1f}% 플러스이나 승률({oos_wr_final:.0f}%)이 55% 미만입니다. "
            f"가상매매로 실제 체결 흐름을 먼저 점검해 보세요."
        )
    else:
        oos_eval = "OVERFITTING_CAUTION"
        live_readiness = "CAUTION"
        best_alt_hint = (
            f" 참고로 아래 비교표에서 [{best_cmp['name']}] 전략이 최근 1년 {best_cmp['oos_return_pct']:+.1f}%로 더 유리했습니다."
            if best_cmp["strategy_type"] != st_type and best_cmp["oos_return_pct"] > oos_ret_final
            else ""
        )
        oos_comment = (
            f"⚠️ 최근 1년 블라인드 시험에서 {oos_ret_final:+.1f}%로 다소 부진했습니다. "
            f"실전 투입 전 반드시 가상매매로 검증하거나 다른 전략으로 전환해 비교해 보세요.{best_alt_hint}"
        )

    rule_texts = _build_easy_rule_texts(st_type, final_buy, final_tp, final_sl, final_vol)
    meta_sel = STRATEGY_META[st_type]

    strategy_config = {
        "strategy_id": f"STRAT-{symbol}-{datetime.now(KST).strftime('%Y%m%d%H%M')}",
        "symbol": symbol,
        "strategy_type": st_type,
        "strategy_name": meta_sel["name"],
        "knife_filter_enabled": st_type != "SIMPLE_DIP",
        "vol_mult": final_vol,
        "created_at": datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S KST"),
        "entry_rule": rule_texts["entry_rule"],
        "exit_rule": f"매수가 대비 +{final_tp:.1f}% 도달 시 기계적 익절 / -{final_sl:.1f}% 손절",
        "stop_loss_pct": final_sl,
        "max_drawdown_limit_pct": max_dd,
        "buy_dip_threshold_pct": final_buy,
        "take_profit_threshold_pct": final_tp,
        "blocked_knives_count": total_blocked_knives,
        "test_period": f"최근 {years}년 (검증용 1년: {test_start_date} ~ {test_end_date})",
        "train_performance": {
            "initial_return": f"{history_steps[0]['total_return_pct']:+.1f}%",
            "improved_return": f"{best_step['total_return_pct']:+.1f}%",
            "win_rate": f"{best_step['win_rate_pct']:.1f}%",
            "trades_count": best_step["total_trades"],
            "bnh_return": f"{best_step['bnh_return_pct']:+.1f}%",
        },
        "oos_1year_performance": {
            "before_improved": f"{test_initial['total_return_pct']:+.1f}%",
            "after_improved": f"{test_improved['total_return_pct']:+.1f}%",
            "win_rate": f"{test_improved['win_rate_pct']:.1f}%",
            "trades_count": test_improved["total_trades"],
            "evaluation": oos_eval,
            "live_readiness": live_readiness,
            "comment": oos_comment,
        },
    }

    return {
        "status": "success",
        "symbol": symbol,
        "years": years,
        "strategy_type": st_type,
        "strategy_name": meta_sel["name"],
        "strategy_easy_desc": meta_sel["easy_desc"],
        "knife_filter_enabled": st_type != "SIMPLE_DIP",
        "vol_mult": final_vol,
        "blocked_knives_count": total_blocked_knives,
        "live_readiness": live_readiness,
        "strategy_comparison": comparison_list,
        "recommended_strategy": best_cmp["strategy_type"],
        "test_range": {
            "train_start": df.iloc[0]["Date"].strftime("%Y-%m-%d"),
            "train_end": train_df.iloc[-1]["Date"].strftime("%Y-%m-%d"),
            "oos_start": test_start_date,
            "oos_end": test_end_date,
        },
        "initial_rules": {
            "buy_dip": cur_buy,
            "tp": init_tp,
            "sl": init_sl,
            "max_dd": max_dd,
            "vol_mult": cur_vol,
        },
        "improved_rules": {
            "buy_dip": final_buy,
            "tp": final_tp,
            "sl": final_sl,
            "max_dd": max_dd,
            "vol_mult": final_vol,
        },
        "steps_table": [
            {
                "step": s["step_name"],
                "change": s["change_desc"],
                "reason": s.get("change_desc", ""),
                "buy_dip": s.get("buy_dip", final_buy),
                "tp": s.get("take_profit", final_tp),
                "sl": s.get("stop_loss", final_sl),
                "vol_mult": s.get("vol_mult", final_vol),
                "adopted": bool(s.get("adopted", s is best_step)),
                "is_best": s is best_step,
                "blocked_knives": s.get("blocked_knives_count", 0),
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
            "initial_win_rate_pct": test_initial["win_rate_pct"],
            "improved_win_rate_pct": test_improved["win_rate_pct"],
            "initial_trades": test_initial["total_trades"],
            "improved_trades": test_improved["total_trades"],
            "eval_status": oos_eval,
            "live_readiness": live_readiness,
            "comment": oos_comment,
        },
        "strategy_config": strategy_config,
    }
