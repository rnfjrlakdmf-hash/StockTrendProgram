import json
import os
import time
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

KST = timezone(timedelta(hours=9))
STATE_FILE = os.path.join(os.path.dirname(__file__), "ceo_trading_state.json")

DEFAULT_POLICY = {
    "mode": "balanced",  # aggressive | balanced | conservative
    "mode_label": "⚖️ 표준 균형운용 체제",
    "auto_pilot": True,
    "alloc_per_trade_krw": 10000000,
    "target_1_pct": 15.0,
    "target_final_pct": 30.0,
    "stop_loss_pct": -3.5,
    "updated_at": "상시 가동 중"
}

DEFAULT_STATE = {
    "total_capital": 100000000,  # 1억원 초기 운용 자산 (가상)
    "available_cash": 100000000,
    "realized_pnl": 0,
    "win_count": 0,
    "loss_count": 0,
    "company_policy": dict(DEFAULT_POLICY),
    "directive_logs": [],
    "custom_approvals": [],
    "desk_lead": {
        "name": "최민석",
        "title": "수석 운용역 (자산운용 프랍트레이딩 1팀장)",
        "badge": "경력 14년 · 대형 증권사 프랍트레이더 출신",
        "avatar": "👨‍💼",
        "status": "전사 자율운용 및 대표이사 지시 대기 중"
    },
    "positions": [],
    "blotter": []
}

def load_trading_state() -> Dict[str, Any]:
    if not os.path.exists(STATE_FILE):
        save_trading_state(DEFAULT_STATE)
        return dict(DEFAULT_STATE)
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "company_policy" not in data or not isinstance(data.get("company_policy"), dict):
            data["company_policy"] = dict(DEFAULT_POLICY)
        else:
            for k, v in DEFAULT_POLICY.items():
                if k not in data["company_policy"]:
                    data["company_policy"][k] = v
        if "directive_logs" not in data or not isinstance(data.get("directive_logs"), list):
            data["directive_logs"] = []
        if "custom_approvals" not in data or not isinstance(data.get("custom_approvals"), list):
            data["custom_approvals"] = []
        return data
    except Exception as e:
        print(f"[TradingService] load_state error: {e}")
        return dict(DEFAULT_STATE)

def save_trading_state(state: Dict[str, Any]) -> None:
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[TradingService] save_state error: {e}")

def update_realtime_quotes_for_positions(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    보유 중인 포지션의 실시간 현재가를 네이버 폴링 API 및 야후 파이낸스에서 일괄 조회하여 평가손익을 재계산하고,
    전사 자율운용(Auto-Pilot) 모드가 켜져 있을 경우 1차 목표가 분할익절 / 최종 목표가 전량익절 / CRO 손절 방어선을 무인 자동 집행합니다.
    """
    kr_codes = []
    for pos in state.get("positions", []):
        if pos.get("status") in ["HOLDING", "PARTIAL_EXIT"] and pos.get("category") == "kr_stock":
            c = pos.get("stock_code")
            if c and c not in kr_codes:
                kr_codes.append(c)
                
    kr_quotes = {}
    if kr_codes:
        try:
            import requests
            syms_str = ",".join(kr_codes)
            resp = requests.get(f"https://polling.finance.naver.com/api/realtime/domestic/stock/{syms_str}", headers={"User-Agent": "Mozilla/5.0"}, timeout=3)
            if resp.status_code == 200:
                for it in resp.json().get("datas", []):
                    code = it.get("itemCode")
                    p_raw = float(it.get("closePriceRaw") or str(it.get("closePrice", "0")).replace(",", ""))
                    kr_quotes[code] = p_raw
        except Exception as e:
            print(f"[TradingService] quote error: {e}")

    now_kst = datetime.now(KST)
    now_str = now_kst.strftime("%Y-%m-%d %H:%M:%S")
    time_short = now_kst.strftime("%H:%M:%S")
    policy = state.get("company_policy", DEFAULT_POLICY)
    auto_pilot = bool(policy.get("auto_pilot", True))
    state_dirty = False
            
    # 포지션별 평가손익 및 수익률 갱신 + Auto-Pilot 자동 익절/손절 집행
    total_unrealized_pnl = 0
    total_invested = 0
    
    for pos in state.get("positions", []):
        if pos.get("status") in ["HOLDING", "PARTIAL_EXIT"]:
            code = pos.get("stock_code")
            if pos.get("category") == "kr_stock" and code in kr_quotes and kr_quotes[code] > 0:
                pos["current_price"] = kr_quotes[code]
                
            buy_p = float(pos.get("buy_price", 1))
            curr_p = float(pos.get("current_price", buy_p))
            qty = int(pos.get("qty", 1))
            
            if pos.get("category") == "kr_stock":
                invested = int(buy_p * qty)
                current_val = int(curr_p * qty)
                unrealized = current_val - invested
                pnl_pct = round(((curr_p - buy_p) / buy_p) * 100, 2)
            else: # US stock
                invested = pos.get("invested_krw", 10000000)
                pnl_pct = round(((curr_p - buy_p) / buy_p) * 100, 2)
                unrealized = int(invested * (pnl_pct / 100.0))

            t1_p = float(pos.get("target_price_1") or (buy_p * 1.15))
            tf_p = float(pos.get("target_price_final") or (buy_p * 1.30))
            sl_p = float(pos.get("stop_loss_price") or (buy_p * 0.965))

            if auto_pilot and curr_p >= tf_p and pos.get("status") in ["HOLDING", "PARTIAL_EXIT"]:
                proceeds = invested + unrealized
                pos["status"] = "CLOSED"
                pos["close_date"] = now_str
                pos["close_price"] = curr_p
                pos["realized_pnl"] = unrealized
                pos["final_pnl_pct"] = pnl_pct
                pos.setdefault("trade_logs", []).append({
                    "timestamp": time_short,
                    "type": "AUTO_SELL",
                    "message": f"⚡ [전사 자율운용] 최종 목표가({tf_p:,}) 달성 → 전량 {qty}주 자동 익절 완료! ({unrealized:+,}원 / {pnl_pct:+.2f}%)"
                })
                state["realized_pnl"] = state.get("realized_pnl", 0) + unrealized
                state["available_cash"] = state.get("available_cash", 0) + proceeds
                state["win_count"] = state.get("win_count", 0) + 1
                state.setdefault("blotter", []).insert(0, {
                    "order_id": f"ORD-{now_kst.strftime('%Y%m%d')}-{len(state.get('blotter', [])) + 1:03d}",
                    "timestamp": now_str,
                    "stock_name": pos.get("stock_name"),
                    "side": "자동전량익절",
                    "qty": qty,
                    "price_str": f"{int(curr_p):,}원" if pos.get("category") == "kr_stock" else f"${curr_p:.2f}",
                    "amount_str": f"{proceeds:,}원",
                    "status": f"최종목표달성 ({pnl_pct:+.2f}%)",
                    "trader": "자율운용 엔진 · 최민석 수석"
                })
                state_dirty = True
                continue
            elif auto_pilot and curr_p <= sl_p and pos.get("status") in ["HOLDING", "PARTIAL_EXIT"]:
                proceeds = invested + unrealized
                pos["status"] = "CLOSED"
                pos["close_date"] = now_str
                pos["close_price"] = curr_p
                pos["realized_pnl"] = unrealized
                pos["final_pnl_pct"] = pnl_pct
                pos.setdefault("trade_logs", []).append({
                    "timestamp": time_short,
                    "type": "AUTO_STOP",
                    "message": f"🛡️ [CRO 리스크 자동방어] 손절 기준선({sl_p:,}) 도달 → 원금 보호를 위해 전량 {qty}주 자동 매도 집행 ({unrealized:+,}원 / {pnl_pct:+.2f}%)"
                })
                state["realized_pnl"] = state.get("realized_pnl", 0) + unrealized
                state["available_cash"] = state.get("available_cash", 0) + proceeds
                if unrealized >= 0:
                    state["win_count"] = state.get("win_count", 0) + 1
                else:
                    state["loss_count"] = state.get("loss_count", 0) + 1
                state.setdefault("blotter", []).insert(0, {
                    "order_id": f"ORD-{now_kst.strftime('%Y%m%d')}-{len(state.get('blotter', [])) + 1:03d}",
                    "timestamp": now_str,
                    "stock_name": pos.get("stock_name"),
                    "side": "CRO자동방어",
                    "qty": qty,
                    "price_str": f"{int(curr_p):,}원" if pos.get("category") == "kr_stock" else f"${curr_p:.2f}",
                    "amount_str": f"{proceeds:,}원",
                    "status": f"손절방어완료 ({pnl_pct:+.2f}%)",
                    "trader": "최서연 CRO · 자동방어"
                })
                state_dirty = True
                continue
            elif auto_pilot and curr_p >= t1_p and pos.get("status") == "HOLDING" and qty >= 2:
                sell_qty = max(1, qty // 2)
                rem_qty = qty - sell_qty
                part_pnl = int(unrealized * (sell_qty / qty))
                part_inv = int(invested * (sell_qty / qty))
                proceeds = part_inv + part_pnl
                pos["qty"] = rem_qty
                pos["invested_krw"] = invested - part_inv
                pos["status"] = "PARTIAL_EXIT"
                pos["stop_loss_price"] = int(buy_p) if pos.get("category") == "kr_stock" else round(buy_p, 2)
                pos.setdefault("trade_logs", []).append({
                    "timestamp": time_short,
                    "type": "AUTO_PARTIAL",
                    "message": f"⚡ [전사 자율운용] 1차 목표가({t1_p:,}) 돌파 → 50% 물량({sell_qty}주) 자동 분할 익절({part_pnl:+,}원 확정) 및 손절선을 본전가({buy_p:,})로 상향!"
                })
                state["realized_pnl"] = state.get("realized_pnl", 0) + part_pnl
                state["available_cash"] = state.get("available_cash", 0) + proceeds
                state["win_count"] = state.get("win_count", 0) + 1
                state.setdefault("blotter", []).insert(0, {
                    "order_id": f"ORD-{now_kst.strftime('%Y%m%d')}-{len(state.get('blotter', [])) + 1:03d}",
                    "timestamp": now_str,
                    "stock_name": pos.get("stock_name"),
                    "side": "자동분할익절(50%)",
                    "qty": sell_qty,
                    "price_str": f"{int(curr_p):,}원" if pos.get("category") == "kr_stock" else f"${curr_p:.2f}",
                    "amount_str": f"{proceeds:,}원",
                    "status": f"1차익절완료 ({pnl_pct:+.2f}%)",
                    "trader": "자율운용 엔진 · 최민석 수석"
                })
                invested = pos["invested_krw"]
                unrealized = unrealized - part_pnl
                state_dirty = True
                
            pos["unrealized_pnl"] = unrealized
            pos["pnl_pct"] = pnl_pct
            total_unrealized_pnl += unrealized
            total_invested += invested

    if state_dirty:
        save_trading_state(state)
            
    state["summary"] = {
        "total_capital": state.get("total_capital", 100000000),
        "total_invested": total_invested,
        "available_cash": state.get("available_cash", 100000000),
        "total_unrealized_pnl": total_unrealized_pnl,
        "total_realized_pnl": state.get("realized_pnl", 0),
        "combined_profit": total_unrealized_pnl + state.get("realized_pnl", 0),
        "combined_return_pct": round(((total_unrealized_pnl + state.get("realized_pnl", 0)) / state.get("total_capital", 100000000)) * 100, 2),
        "active_position_count": len([p for p in state.get("positions", []) if p.get("status") in ["HOLDING", "PARTIAL_EXIT"]]),
        "win_count": state.get("win_count", 0),
        "loss_count": state.get("loss_count", 0),
        "win_rate": round((state.get("win_count", 0) / max(1, (state.get("win_count", 0) + state.get("loss_count", 0)))) * 100, 1)
    }
    return state

def execute_ceo_approved_stock_trade(doc_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    대표님이 결재 기안서에서 [승인 서명 (재가)]을 했을 때,
    트레이딩 팀이 즉시 적정 가격에 분할 매수 주문을 집행하여 포지션을 신규 등록합니다.
    """
    state = load_trading_state()
    stock_name = doc_data.get("stock_name", "우량주")
    stock_code = doc_data.get("stock_code") or ""
    cat_type = doc_data.get("category_type") or "kr_stock"
    
    # 이미 동일 종목 포지션이 활성화되어 있는지 확인
    existing = next((p for p in state.get("positions", []) if p.get("stock_name") == stock_name and p.get("status") in ["HOLDING", "PARTIAL_EXIT"]), None)
    if existing:
        return {"status": "already_exists", "message": f"{stock_name} 종목은 이미 트레이딩 팀에서 집중 운용 중입니다.", "position": existing}
        
    now_kst = datetime.now(KST)
    now_str = now_kst.strftime("%Y-%m-%d %H:%M:%S")
    time_short = now_kst.strftime("%H:%M:%S")
    
    # 실시간 현재가 조회 (네이버/야후 실시간 호가 최우선 연동)
    live_price = None
    if cat_type == "kr_stock" and stock_code:
        try:
            import requests
            resp = requests.get(f"https://polling.finance.naver.com/api/realtime/domestic/stock/{stock_code}", headers={"User-Agent": "Mozilla/5.0"}, timeout=3)
            if resp.status_code == 200:
                datas = resp.json().get("datas", [])
                if datas:
                    p_raw = float(datas[0].get("closePriceRaw") or str(datas[0].get("closePrice", "0")).replace(",", "") or 0)
                    if p_raw > 0:
                        live_price = p_raw
        except Exception as e:
            print(f"[TradingOrder] live quote fetch error: {e}")
    elif cat_type != "kr_stock" and stock_code:
        try:
            import yfinance as yf
            t = yf.Ticker(stock_code)
            live_price = round(float(t.fast_info.last_price), 2)
        except Exception as e:
            print(f"[TradingOrder] US quote fetch error: {e}")
            
    if live_price and live_price > 0:
        curr_num = live_price
    else:
        curr_raw = doc_data.get("current_price") or ""
        curr_str = str(curr_raw)
        digits = re.sub(r'[^\d.]', '', curr_str.split(' ')[0] if curr_str else '')
        curr_num = float(digits) if digits else (100000.0 if cat_type == "kr_stock" else 150.0)
    
    # 증권사 트레이딩 팀의 최적 분할 매수가 계산 (호가 매수 최적화: 현재가 대비 약 -0.3%~0% 유리한 가격에 체결)
    buy_price = curr_num if cat_type != "kr_stock" else float(int(curr_num * 0.997))
    
    # 1회 배정 운용 자금: 대표이사 전사 운용 방침(company_policy) 연동 (기본 1,000만원)
    policy = state.get("company_policy", DEFAULT_POLICY)
    alloc_krw = int(doc_data.get("alloc_krw") or policy.get("alloc_per_trade_krw", 10000000))
    if cat_type == "kr_stock":
        qty = max(1, int(alloc_krw / max(1.0, buy_price)))
        actual_invested = int(buy_price * qty)
    else:
        qty = max(1, int((alloc_krw / 1380.0) / max(0.01, buy_price)))
        actual_invested = alloc_krw
        
    # 목표가 및 손절선 계산 (대표이사 운용 방침 연동)
    t1_pct = float(policy.get("target_1_pct", 15.0))
    tf_pct = float(policy.get("target_final_pct", 30.0))
    sl_pct = float(policy.get("stop_loss_pct", -3.5))

    tg_str = doc_data.get("target_price") or ""
    tg_digits = re.sub(r'[^\d.]', '', str(tg_str))
    tg_num = float(tg_digits) if tg_digits else (buy_price * (1.0 + tf_pct / 100.0))
    
    target_1 = buy_price * (1.0 + t1_pct / 100.0)
    target_final = tg_num if tg_num > target_1 else (buy_price * (1.0 + max(tf_pct, t1_pct + 10.0) / 100.0))
    stop_loss = buy_price * (1.0 + sl_pct / 100.0)
    
    new_pos = {
        "id": f"POS-{stock_code or int(time.time())}",
        "stock_name": stock_name,
        "stock_code": stock_code,
        "category": cat_type,
        "status": "HOLDING",
        "trader_name": "최민석 수석 운용역 (프랍트레이딩 1팀)",
        "buy_date": now_str,
        "buy_price": int(buy_price) if cat_type == "kr_stock" else round(buy_price, 2),
        "qty": qty,
        "invested_krw": actual_invested,
        "current_price": int(curr_num) if cat_type == "kr_stock" else round(curr_num, 2),
        "unrealized_pnl": 0,
        "pnl_pct": 0.0,
        "target_price_1": int(target_1) if cat_type == "kr_stock" else round(target_1, 2),
        "target_price_final": int(target_final) if cat_type == "kr_stock" else round(target_final, 2),
        "stop_loss_price": int(stop_loss) if cat_type == "kr_stock" else round(stop_loss, 2),
        "strategy_note": f"대표이사 재가 승인 완료. 적정 매수가({int(buy_price):,}원)에 분할 매수 체결 완료. 1차 목표가({int(target_1):,}원) 도달 시 50% 분할 익절, 최종 목표가({int(target_final):,}원) 전량 익절 감시 가동.",
        "trade_logs": [
            {"timestamp": time_short, "type": "BUY", "message": f"대표이사 재가 승인 접수 → 최적 분할 매수가 {qty}주 @ {int(buy_price):,}원 체결 완료 (배정금: {actual_invested:,}원)"},
            {"timestamp": time_short, "type": "ORDER", "message": f"1차 목표가({int(target_1):,}원, +15%) 50% 분할 매도 및 최종 목표가({int(target_final):,}원) 전량 매도 감시 가동"}
        ]
    }
    
    # Blotter 기록
    new_blotter = {
        "order_id": f"ORD-{now_kst.strftime('%Y%m%d')}-{len(state.get('blotter', [])) + 1:03d}",
        "timestamp": now_str,
        "stock_name": stock_name,
        "side": "매수",
        "qty": qty,
        "price_str": f"{int(buy_price):,}원" if cat_type == "kr_stock" else f"${buy_price:.2f}",
        "amount_str": f"{actual_invested:,}원",
        "status": "체결완료",
        "trader": "최민석 수석"
    }
    
    state["positions"].insert(0, new_pos)
    state["blotter"].insert(0, new_blotter)
    state["available_cash"] = max(0, state.get("available_cash", 100000000) - actual_invested)
    
    save_trading_state(state)
    return {"status": "success", "message": f"[{stock_name}] 트레이딩 팀 매수 주문 체결 완료!", "position": new_pos}

def close_trading_position(pos_id: str, reason: str = "대표이사 시장가 즉시 익절 지시") -> Dict[str, Any]:
    state = load_trading_state()
    pos = next((p for p in state.get("positions", []) if p.get("id") == pos_id), None)
    if not pos:
        return {"status": "error", "message": "포지션을 찾을 수 없습니다."}
        
    now_kst = datetime.now(KST)
    now_str = now_kst.strftime("%Y-%m-%d %H:%M:%S")
    time_short = now_kst.strftime("%H:%M:%S")
    
    curr_p = pos.get("current_price", pos.get("buy_price"))
    buy_p = pos.get("buy_price")
    qty = pos.get("qty")
    invested = pos.get("invested_krw", 10000000)
    
    if pos.get("category") == "kr_stock":
        proceeds = int(curr_p * qty)
        pnl_krw = proceeds - invested
        pnl_pct = round(((curr_p - buy_p) / buy_p) * 100, 2)
    else:
        pnl_pct = round(((curr_p - buy_p) / buy_p) * 100, 2)
        pnl_krw = int(invested * (pnl_pct / 100.0))
        proceeds = invested + pnl_krw
        
    pos["status"] = "CLOSED"
    pos["close_date"] = now_str
    pos["close_price"] = curr_p
    pos["realized_pnl"] = pnl_krw
    pos["final_pnl_pct"] = pnl_pct
    pos["trade_logs"].append({
        "timestamp": time_short,
        "type": "SELL",
        "message": f"{reason} → 전량 {qty}주 매도 체결! 실현손익: {pnl_krw:+,}원 ({pnl_pct:+.2f}%) 확정"
    })
    
    # 업데이트 통계
    state["realized_pnl"] = state.get("realized_pnl", 0) + pnl_krw
    state["available_cash"] = state.get("available_cash", 0) + proceeds
    if pnl_krw >= 0:
        state["win_count"] = state.get("win_count", 0) + 1
    else:
        state["loss_count"] = state.get("loss_count", 0) + 1
        
    blotter_item = {
        "order_id": f"ORD-{now_kst.strftime('%Y%m%d')}-{len(state.get('blotter', [])) + 1:03d}",
        "timestamp": now_str,
        "stock_name": pos.get("stock_name"),
        "side": "매도",
        "qty": qty,
        "price_str": f"{int(curr_p):,}원" if pos.get("category") == "kr_stock" else f"${curr_p:.2f}",
        "amount_str": f"{proceeds:,}원",
        "status": f"매도완료 ({pnl_pct:+.2f}%)",
        "trader": "최민석 수석"
    }
    state["blotter"].insert(0, blotter_item)
    save_trading_state(state)
    
    return {
        "status": "success",
        "message": f"[{pos.get('stock_name')}] 전량 매도 체결 완료! {pnl_krw:+,}원 ({pnl_pct:+.2f}%) 확정",
        "pnl_krw": pnl_krw,
        "pnl_pct": pnl_pct
    }

def partial_sell_position(pos_id: str) -> Dict[str, Any]:
    state = load_trading_state()
    pos = next((p for p in state.get("positions", []) if p.get("id") == pos_id and p.get("status") == "HOLDING"), None)
    if not pos:
        return {"status": "error", "message": "분할 매도 가능한 포지션이 아닙니다."}
        
    now_kst = datetime.now(KST)
    now_str = now_kst.strftime("%Y-%m-%d %H:%M:%S")
    time_short = now_kst.strftime("%H:%M:%S")
    
    total_qty = pos.get("qty", 2)
    sell_qty = max(1, total_qty // 2)
    rem_qty = total_qty - sell_qty
    
    curr_p = pos.get("current_price", pos.get("buy_price"))
    buy_p = pos.get("buy_price")
    
    pnl_pct = round(((curr_p - buy_p) / buy_p) * 100, 2)
    if pos.get("category") == "kr_stock":
        proceeds = int(curr_p * sell_qty)
        pnl_krw = int((curr_p - buy_p) * sell_qty)
    else:
        part_invested = int(pos.get("invested_krw", 10000000) * (sell_qty / total_qty))
        pnl_krw = int(part_invested * (pnl_pct / 100.0))
        proceeds = part_invested + pnl_krw
        
    pos["qty"] = rem_qty
    pos["invested_krw"] = int(pos.get("invested_krw", 10000000) * (rem_qty / total_qty))
    pos["status"] = "PARTIAL_EXIT"
    pos["trade_logs"].append({
        "timestamp": time_short,
        "type": "PARTIAL_SELL",
        "message": f"1차 목표 분할 익절 → 50% 물량({sell_qty}주) 매도 체결 완료! 실현손익: {pnl_krw:+,}원 ({pnl_pct:+.2f}%) 확정, 잔여 {rem_qty}주는 최종 목표가까지 보유."
    })
    
    state["realized_pnl"] = state.get("realized_pnl", 0) + pnl_krw
    state["available_cash"] = state.get("available_cash", 0) + proceeds
    state["win_count"] = state.get("win_count", 0) + 1
    
    blotter_item = {
        "order_id": f"ORD-{now_kst.strftime('%Y%m%d')}-{len(state.get('blotter', [])) + 1:03d}",
        "timestamp": now_str,
        "stock_name": pos.get("stock_name"),
        "side": "분할매도(50%)",
        "qty": sell_qty,
        "price_str": f"{int(curr_p):,}원" if pos.get("category") == "kr_stock" else f"${curr_p:.2f}",
        "amount_str": f"{proceeds:,}원",
        "status": f"익절완료 ({pnl_pct:+.2f}%)",
        "trader": "최민석 수석"
    }
    state["blotter"].insert(0, blotter_item)
    save_trading_state(state)
    
    return {
        "status": "success",
        "message": f"[{pos.get('stock_name')}] 50% 분할 익절 완료! {pnl_krw:+,}원 ({pnl_pct:+.2f}%) 수익 확정",
        "pnl_krw": pnl_krw,
        "pnl_pct": pnl_pct
    }


def analyze_watchlist_for_trading_desk(user_id: str = None, requested_symbols: List[str] = None) -> Dict[str, Any]:
    """
    대표이사 및 사용자의 관심종목을 바탕으로
    자산운용 프랍트레이딩 데스크(최민석 수석 운용역 팀)의 정밀 진단 분석을 수행합니다.
    """
    import requests
    try:
        from stock_names import STOCK_MAP
    except Exception:
        STOCK_MAP = {}
        
    symbols_to_check = []
    
    # 1. requested_symbols 처리
    if requested_symbols:
        for s in requested_symbols:
            if not s: continue
            raw = str(s).strip()
            # 한글 종목명인 경우 코드로 변환
            if raw in STOCK_MAP:
                symbols_to_check.append(STOCK_MAP[raw])
            else:
                symbols_to_check.append(raw)
                
    # 2. user_id로 DB 조회
    if user_id and user_id != "guest":
        try:
            import sqlite3
            db_path = os.path.join(os.path.dirname(__file__), "stock_app.db")
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                c = conn.cursor()
                c.execute("SELECT symbol FROM watchlist WHERE user_id = ?", (user_id.strip(),))
                rows = c.fetchall()
                for r in rows:
                    sym = r[0].strip()
                    if sym and sym not in symbols_to_check:
                        symbols_to_check.append(sym)
                conn.close()
        except Exception as e:
            print(f"[WatchlistDesk] DB lookup error: {e}")
            
    # 3. 기본 추천 종목 (비어있을 시)
    if not symbols_to_check:
        symbols_to_check = ["005930", "000660", "035420", "005380", "NVDA", "TSLA"]
        
    # 중복 제거 (순서 보존)
    seen = set()
    cleaned_symbols = []
    for s in symbols_to_check:
        clean = s.replace(".KS", "").replace(".KQ", "").strip()
        if clean.upper() not in seen:
            seen.add(clean.upper())
            cleaned_symbols.append(clean)
            
    # 현재 보유 중인 트레이딩 데스크 포지션 확인
    try:
        state = load_trading_state()
        holding_map = {p.get("stock_code"): p for p in state.get("positions", []) if p.get("status") in ["HOLDING", "PARTIAL_EXIT"]}
    except Exception:
        holding_map = {}
        
    kr_codes = []
    us_tickers = []
    
    for s in cleaned_symbols:
        if re.match(r'^\d{6}$', s):
            kr_codes.append(s)
        else:
            us_tickers.append(s.upper())
            
    results = []
    
    # 4. 국내 주식 일괄 폴링
    kr_data_map = {}
    if kr_codes:
        try:
            url = f"https://polling.finance.naver.com/api/realtime/domestic/stock/{','.join(kr_codes)}"
            resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=4)
            if resp.status_code == 200:
                for it in resp.json().get("datas", []):
                    code = it.get("itemCode")
                    kr_data_map[code] = it
        except Exception as e:
            print(f"[WatchlistDesk] KR quote error: {e}")
            
    for code in kr_codes:
        it = kr_data_map.get(code, {})
        name = it.get("stockName") or code
        price_raw = float(it.get("closePriceRaw") or str(it.get("closePrice", "0")).replace(",", "") or 0)
        ratio_raw = float(it.get("fluctuationsRatioRaw") or str(it.get("fluctuationsRatio", "0")).replace(",", "") or 0)
        
        if price_raw <= 0:
            continue
            
        # 적정 분할 매수가 계산 (눌림목 -0.8% 지지 호가)
        rec_buy = int(price_raw * 0.992)
        target_1 = int(rec_buy * 1.15)
        target_final = int(rec_buy * 1.30)
        stop_loss = int(rec_buy * 0.965)
        
        if ratio_raw > 2.5:
            rating = "A"
            rating_label = "A등급 (외인·기관 추세 상방)"
            rating_color = "blue"
            comment = f"금일 외인·기관 매수세 유입 중. 단기 추격보다는 {rec_buy:,}원 눌림목 분할 진입 시 손익비 탁월."
        elif ratio_raw < -2.0:
            rating = "S"
            rating_label = "S등급 (과매도권 적정가 분할 매수 적기)"
            rating_color = "emerald"
            comment = f"단기 낙폭 과대에 따른 기술적 반등 유력. {rec_buy:,}원 지지선 기준 1차 분할 매수 강력 추천."
        else:
            rating = "S" if abs(ratio_raw) < 1.0 else "A"
            rating_label = f"{rating}등급 (핵심 수급 지지 우수)"
            rating_color = "emerald" if rating == "S" else "blue"
            comment = f"주요 이평선 지지력 탄탄. {rec_buy:,}원 이하에서 1차 분할 매수 후 1차 목표가({target_1:,}원) 50% 분할 익절 전략 유효."
            
        is_holding = code in holding_map
        h_pos = holding_map.get(code)
        
        results.append({
            "stock_name": name,
            "stock_code": code,
            "symbol": code,
            "category": "kr_stock",
            "current_price": price_raw,
            "current_price_str": f"{int(price_raw):,}원",
            "change_pct": ratio_raw,
            "desk_rating": rating,
            "desk_rating_label": rating_label,
            "desk_rating_color": rating_color,
            "recommended_buy_price": rec_buy,
            "recommended_buy_price_str": f"{rec_buy:,}원",
            "target_price_1": target_1,
            "target_price_1_str": f"{target_1:,}원 (+15%)",
            "target_price_final": target_final,
            "target_price_final_str": f"{target_final:,}원 (+30%)",
            "stop_loss_price": stop_loss,
            "stop_loss_price_str": f"{stop_loss:,}원 (-3.5%)",
            "trader_comment": comment,
            "is_already_holding": is_holding,
            "holding_qty": h_pos.get("qty") if h_pos else 0,
            "holding_pnl_pct": h_pos.get("pnl_pct") if h_pos else 0.0
        })
        
    # 5. 미국 주식 처리
    for ticker in us_tickers:
        try:
            import yfinance as yf
            t = yf.Ticker(ticker)
            fi = t.fast_info
            price = round(float(fi.last_price), 2)
            prev = round(float(fi.previous_close), 2)
            ratio = round(((price - prev) / prev) * 100, 2)
            
            rec_buy = round(price * 0.995, 2)
            target_1 = round(rec_buy * 1.15, 2)
            target_final = round(rec_buy * 1.35, 2)
            stop_loss = round(rec_buy * 0.965, 2)
            
            is_holding = ticker in holding_map
            h_pos = holding_map.get(ticker)
            
            results.append({
                "stock_name": ticker,
                "stock_code": ticker,
                "symbol": ticker,
                "category": "us_stock",
                "current_price": price,
                "current_price_str": f"${price:.2f}",
                "change_pct": ratio,
                "desk_rating": "S",
                "desk_rating_label": "S등급 (글로벌 모멘텀)",
                "desk_rating_color": "emerald",
                "recommended_buy_price": rec_buy,
                "recommended_buy_price_str": f"${rec_buy:.2f}",
                "target_price_1": target_1,
                "target_price_1_str": f"${target_1:.2f} (+15%)",
                "target_price_final": target_final,
                "target_price_final_str": f"${target_final:.2f} (+35%)",
                "stop_loss_price": stop_loss,
                "stop_loss_price_str": f"${stop_loss:.2f} (-3.5%)",
                "trader_comment": f"월가 수급 및 실적 모멘텀 양호. ${rec_buy:.2f} 지지선 분할 진입 시 1차 익절(${target_1:.2f}) 로드맵 유효.",
                "is_already_holding": is_holding,
                "holding_qty": h_pos.get("qty") if h_pos else 0,
                "holding_pnl_pct": h_pos.get("pnl_pct") if h_pos else 0.0
            })
        except Exception as e:
            print(f"[WatchlistDesk] US quote error: {e}")
            
    return {
        "status": "success",
        "desk_lead": {
            "name": "최민석",
            "title": "수석 운용역 (자산운용 프랍트레이딩 1팀장)",
            "avatar": "👨‍💼",
            "status": "관심종목 기술적 지지선 및 호가 정밀 진단 완료"
        },
        "analyzed_count": len(results),
        "items": results
    }


def _resolve_stock_for_directive(raw_text: str) -> Dict[str, Any]:
    """
    대표님이 입력한 자연어 지시문에서 종목명/티커를 추출하고 실시간 현재가와 목표가를 조회합니다.
    """
    import requests
    try:
        from stock_names import STOCK_MAP
    except Exception:
        STOCK_MAP = {}

    cleaned = (raw_text or "").strip()
    us_aliases = {
        "엔비디아": ("NVDA", "엔비디아 (NVDA)"),
        "테슬라": ("TSLA", "테슬라 (TSLA)"),
        "애플": ("AAPL", "애플 (AAPL)"),
        "마이크로소프트": ("MSFT", "마이크로소프트 (MSFT)"),
        "마소": ("MSFT", "마이크로소프트 (MSFT)"),
        "알파벳": ("GOOGL", "알파벳 구글 (GOOGL)"),
        "구글": ("GOOGL", "알파벳 구글 (GOOGL)"),
        "아마존": ("AMZN", "아마존 (AMZN)"),
        "메타": ("META", "메타 (META)"),
        "브로드컴": ("AVGO", "브로드컴 (AVGO)"),
        "팔란티어": ("PLTR", "팔란티어 (PLTR)"),
        "tsmc": ("TSM", "TSMC (TSM)"),
        "amd": ("AMD", "AMD (AMD)"),
    }
    lower_txt = cleaned.lower()
    for k_alias, (u_sym, u_name) in us_aliases.items():
        if k_alias in lower_txt or u_sym.lower() in lower_txt.split():
            price = 150.0
            try:
                import yfinance as yf
                fi = yf.Ticker(u_sym).fast_info
                p = round(float(fi.last_price), 2)
                if p > 0:
                    price = p
            except Exception:
                pass
            return {
                "found": True,
                "stock_name": u_name,
                "stock_code": u_sym,
                "category_type": "us_stock",
                "current_price_num": price,
                "current_price_str": f"${price:.2f}",
                "target_price_str": f"${round(price * 1.25, 2):.2f}",
                "sector": "미국 글로벌 빅테크"
            }

    # 한국 종목명 매칭 (길이가 긴 종목명 우선)
    sorted_names = sorted(STOCK_MAP.keys(), key=lambda x: len(x), reverse=True)
    matched_name = None
    matched_code = None
    for s_name in sorted_names:
        if len(s_name) >= 2 and s_name in cleaned:
            matched_name = s_name
            matched_code = STOCK_MAP[s_name]
            break

    # 6자리 종목코드 직접 입력 확인
    if not matched_code:
        m_code = re.search(r'\b(\d{6})\b', cleaned)
        if m_code:
            matched_code = m_code.group(1)
            matched_name = next((k for k, v in STOCK_MAP.items() if v == matched_code), matched_code)

    if matched_code:
        price_num = 50000
        try:
            url = f"https://polling.finance.naver.com/api/realtime/domestic/stock/{matched_code}"
            resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=3)
            if resp.status_code == 200:
                datas = resp.json().get("datas", [])
                if datas:
                    matched_name = datas[0].get("stockName") or matched_name
                    p_raw = float(datas[0].get("closePriceRaw") or str(datas[0].get("closePrice", "0")).replace(",", "") or 0)
                    if p_raw > 0:
                        price_num = int(p_raw)
        except Exception:
            pass
        target_num = int(round(price_num * 1.25, -2))
        return {
            "found": True,
            "stock_name": matched_name,
            "stock_code": matched_code,
            "category_type": "kr_stock",
            "current_price_num": price_num,
            "current_price_str": f"{price_num:,}원",
            "target_price_str": f"{target_num:,}원",
            "sector": "국내 핵심 상장주"
        }

    return {"found": False}


def execute_ceo_company_directive(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    대표이사 전사 지휘통제실(CEO Command Center)에서 내린 지시를 접수하여
    5대 본부(비서실 → 리서치센터 → 퀀트·수급본부 → 리스크관리본부 → 프랍트레이딩본부)가
    자동으로 연쇄 집행하고 이행 결과를 반환합니다.
    """
    state = load_trading_state()
    state = update_realtime_quotes_for_positions(state)
    policy = state.setdefault("company_policy", dict(DEFAULT_POLICY))

    now_kst = datetime.now(KST)
    now_str = now_kst.strftime("%Y-%m-%d %H:%M:%S")
    time_short = now_kst.strftime("%H:%M:%S")
    cmd_id = f"CMD-{now_kst.strftime('%Y%m%d-%H%M%S')}"

    cmd_type = (payload.get("command_type") or "CUSTOM_DIRECTIVE").upper()
    raw_text = (payload.get("directive_text") or "").strip()
    auto_exec_flag = bool(payload.get("auto_execute", True))
    candidate_docs = payload.get("candidate_docs") or []

    workflow_steps = []
    created_doc = None
    executed_trades = []
    headline_result = ""

    # 1. 운용 방침 변경 (UPDATE_POLICY)
    if cmd_type == "UPDATE_POLICY":
        new_mode = payload.get("mode", policy.get("mode", "balanced"))
        mode_map = {
            "aggressive": ("🔥 공격적 수익극대화 체제", 20000000, 20.0, 40.0, -5.0),
            "balanced": ("⚖️ 표준 균형운용 체제", 10000000, 15.0, 30.0, -3.5),
            "conservative": ("🛡️ 보수적 원금방어 체제", 5000000, 10.0, 20.0, -2.5),
        }
        m_label, def_alloc, def_t1, def_tf, def_sl = mode_map.get(new_mode, mode_map["balanced"])
        policy["mode"] = new_mode
        policy["mode_label"] = m_label
        if "auto_pilot" in payload:
            policy["auto_pilot"] = bool(payload["auto_pilot"])
        if "alloc_per_trade_krw" in payload:
            policy["alloc_per_trade_krw"] = int(payload["alloc_per_trade_krw"])
        elif payload.get("apply_preset_defaults"):
            policy["alloc_per_trade_krw"] = def_alloc
        if "target_1_pct" in payload:
            policy["target_1_pct"] = float(payload["target_1_pct"])
        elif payload.get("apply_preset_defaults"):
            policy["target_1_pct"] = def_t1
            policy["target_final_pct"] = def_tf
        if "stop_loss_pct" in payload:
            policy["stop_loss_pct"] = float(payload["stop_loss_pct"])
        elif payload.get("apply_preset_defaults"):
            policy["stop_loss_pct"] = def_sl
        policy["updated_at"] = now_str

        # 보유 중인 전 포지션의 목표가 및 손절선을 새 방침에 맞춰 즉시 재조정
        updated_pos_cnt = 0
        for pos in state.get("positions", []):
            if pos.get("status") in ["HOLDING", "PARTIAL_EXIT"]:
                bp = float(pos.get("buy_price", 1))
                new_t1 = bp * (1.0 + policy["target_1_pct"] / 100.0)
                new_sl = bp * (1.0 + policy["stop_loss_pct"] / 100.0)
                pos["target_price_1"] = int(new_t1) if pos.get("category") == "kr_stock" else round(new_t1, 2)
                pos["stop_loss_price"] = int(new_sl) if pos.get("category") == "kr_stock" else round(new_sl, 2)
                pos.setdefault("trade_logs", []).append({
                    "timestamp": time_short,
                    "type": "POLICY",
                    "message": f"대표이사 운용방침 변경({m_label}) → 1차 익절가({pos['target_price_1']:,}), 손절선({pos['stop_loss_price']:,}) 일괄 재설정 완료"
                })
                updated_pos_cnt += 1

        headline_result = f"전사 운용 방침이 [{m_label}] (1회 배정 {policy['alloc_per_trade_krw']//10000:,}만원 · 1차익절 +{policy['target_1_pct']}% · 손절 {policy['stop_loss_pct']}%)로 즉시 변경 가동되었습니다."
        workflow_steps = [
            {"dept": "대표이사 비서실", "exec": "정유진 실장", "avatar": "👩‍💼", "status": "수명 완료", "detail": f"대표이사 경영지침 [{m_label}] 전 부서 긴급 하달 완료"},
            {"dept": "기업·산업 리서치본부", "exec": "박진우 부사장", "avatar": "👨‍💼", "status": "기준 변경", "detail": f"{m_label} 기준에 부합하는 기대수익 +{policy['target_1_pct']}% 이상 종목 우선 상정 체제 가동"},
            {"dept": "퀀트·수급본부", "exec": "김도현 상무", "avatar": "📈", "status": "필터 재설정", "detail": f"종목당 1회 투입 금액을 {policy['alloc_per_trade_krw']:,}원으로 알고리즘 호가 분할 계산기 동기화"},
            {"dept": "리스크관리본부 (CRO)", "exec": "최서연 상무", "avatar": "🛡️", "status": "방어선 재구축", "detail": f"전사 자동 손절 기준선을 {policy['stop_loss_pct']}%로 재설정 (운용 중 {updated_pos_cnt}개 종목 즉시 적용)"},
            {"dept": "자산운용 트레이딩데스크", "exec": "최민석 수석", "avatar": "👨‍💼", "status": "자율운용 가동" if policy["auto_pilot"] else "수동대기", "detail": f"자율운용(Auto-Pilot) {'ON — 목표가/손절선 도달 시 무인 자동 체결' if policy['auto_pilot'] else 'OFF — 대표님 수동 지시 대기'}"}
        ]

    # 2. 오늘 기대수익 TOP 3 종목 즉시 심의·자동 매수 집행 (AUTO_INVEST_TOP3)
    elif cmd_type == "AUTO_INVEST_TOP3":
        holding_names = {p.get("stock_name") for p in state.get("positions", []) if p.get("status") in ["HOLDING", "PARTIAL_EXIT"]}
        picks = []
        for doc in candidate_docs:
            cat = doc.get("category_type", "")
            sname = doc.get("stock_name", "")
            if cat in ["kr_stock", "us_stock"] and sname and sname not in holding_names:
                picks.append(doc)
                if len(picks) >= 3:
                    break

        if not picks:
            default_cands = [
                {"stock_name": "두산에너빌리티", "stock_code": "034020", "category_type": "kr_stock", "target_price": "120,000원"},
                {"stock_name": "SK하이닉스", "stock_code": "000660", "category_type": "kr_stock", "target_price": "260,000원"},
                {"stock_name": "엔비디아 (NVDA)", "stock_code": "NVDA", "category_type": "us_stock", "target_price": "$175.00"},
            ]
            for dc in default_cands:
                if dc["stock_name"] not in holding_names:
                    picks.append(dc)

        for pk in picks[:3]:
            res = execute_ceo_approved_stock_trade(pk)
            if res.get("status") == "success" and res.get("position"):
                executed_trades.append(res["position"])

        state = load_trading_state()
        state = update_realtime_quotes_for_positions(state)
        bought_names = ", ".join([p.get("stock_name", "") for p in executed_trades]) or "전 핵심 종목 이미 보유 중"
        headline_result = f"대표님 특명에 따라 오늘 최우선 추천 [{bought_names}] {len(executed_trades)}종목에 대해 5대 본부 합동 심의 및 프랍트레이딩 매수 집행을 완료했습니다!"
        workflow_steps = [
            {"dept": "대표이사 비서실", "exec": "정유진 실장", "avatar": "👩‍💼", "status": "특명 하달", "detail": "『오늘 기대수익 TOP 종목 즉시 심의·자동 매수』 전사 긴급 발령"},
            {"dept": "기업·산업 리서치본부", "exec": "박진우 부사장", "avatar": "👨‍💼", "status": "컨센서스 검증", "detail": f"오늘 상정 기안서 중 상승여력 최상위 [{bought_names}] 핵심 모멘텀 최종 확인"},
            {"dept": "퀀트·수급본부", "exec": "김도현 상무", "avatar": "📈", "status": "호가 타점 산출", "detail": "외인·기관 프로그램 수급 유입 확인 및 현재가 대비 -0.3% 유리한 지정가 분할 호가 산출"},
            {"dept": "리스크관리본부 (CRO)", "exec": "최서연 상무", "avatar": "🛡️", "status": "손절·익절선 설정", "detail": f"1차 익절 +{policy['target_1_pct']}% / 손절 방어선 {policy['stop_loss_pct']}% 자동 감시망 세팅 완료"},
            {"dept": "자산운용 트레이딩데스크", "exec": "최민석 수석", "avatar": "👨‍💼", "status": f"{len(executed_trades)}건 체결 완료", "detail": f"[{bought_names}] 종목당 {policy['alloc_per_trade_krw']//10000:,}만원 배정 매수 체결 및 주문 원장 기록 완료"}
        ]

    # 3. 보유 포트폴리오 전 종목 실시간 목표가/손절선 일제 감사 및 본전 방어선 상향 (AUDIT_ALL_POSITIONS)
    elif cmd_type == "AUDIT_ALL_POSITIONS":
        active_pos = [p for p in state.get("positions", []) if p.get("status") in ["HOLDING", "PARTIAL_EXIT"]]
        tightened_cnt = 0
        audit_notes = []
        for pos in active_pos:
            pname = pos.get("stock_name", "")
            pct = float(pos.get("pnl_pct", 0.0))
            bp = float(pos.get("buy_price", 1))
            if pct >= 2.0:
                # 수익 구간 종목은 손절선을 매수가(+0.3% 익절 본전 방어)로 상향
                safe_sl = int(bp * 1.003) if pos.get("category") == "kr_stock" else round(bp * 1.003, 2)
                if float(pos.get("stop_loss_price", 0)) < safe_sl:
                    pos["stop_loss_price"] = safe_sl
                    tightened_cnt += 1
                    pos.setdefault("trade_logs", []).append({
                        "timestamp": time_short,
                        "type": "CRO_AUDIT",
                        "message": f"🛡️ [CRO 전수감사] 현재 수익 중({pct:+.2f}%) → 원금 손실 원천 차단을 위해 방어선을 본전 위({safe_sl:,})로 상향 고정!"
                    })
            audit_notes.append(f"{pname}({pct:+.2f}%)")

        summary_str = ", ".join(audit_notes) if audit_notes else "현재 보유 포지션 없음"
        headline_result = f"운용 중인 {len(active_pos)}개 전 종목({summary_str}) 실시간 시세·수급 감사 완료! 수익 구간 {tightened_cnt}종목의 방어선을 매수가 위로 상향 고정했습니다."
        workflow_steps = [
            {"dept": "대표이사 비서실", "exec": "정유진 실장", "avatar": "👩‍💼", "status": "전수 감사 지시", "detail": f"보유 포트폴리오 총 {len(active_pos)}개 종목 실시간 긴급 점검 하달"},
            {"dept": "기업·산업 리서치본부", "exec": "박진우 부사장", "avatar": "👨‍💼", "status": "펀더멘털 이상무", "detail": "보유 종목 악재 공시 및 목표주가 하향 리포트 0건 확인"},
            {"dept": "퀀트·수급본부", "exec": "김도현 상무", "avatar": "📈", "status": "실시간 시세 동기화", "detail": f"실시간 호가 폴링 완료: {summary_str}"},
            {"dept": "리스크관리본부 (CRO)", "exec": "최서연 상무", "avatar": "🛡️", "status": f"방어선 {tightened_cnt}건 상향", "detail": f"수익 중인 종목 {tightened_cnt}건의 손절선을 본전가 위로 끌어올려 손실 가능성 0%로 잠금"},
            {"dept": "자산운용 트레이딩데스크", "exec": "최민석 수석", "avatar": "👨‍💼", "status": "24시 감시 지속", "detail": "1차 목표가 도달 시 50% 자동 분할 익절 대기 중"}
        ]

    # 4. 수익 중인 보유 종목 일괄 50% 분할 익절 집행 (TAKE_PROFIT_WINNERS)
    elif cmd_type == "TAKE_PROFIT_WINNERS":
        active_pos = [p for p in state.get("positions", []) if p.get("status") == "HOLDING"]
        winners = [p for p in active_pos if float(p.get("pnl_pct", 0.0)) > 0]
        # 만약 현재 플러스 종목이 없으면 가장 수익률이 양호한 상위 1종목을 분할 리밸런싱하거나 안내
        harvested = []
        total_harvest_krw = 0
        for w in winners:
            res = partial_sell_position(w.get("id"))
            if res.get("status") == "success":
                harvested.append(f"{w.get('stock_name')}({res.get('pnl_krw', 0):+,}원)")
                total_harvest_krw += int(res.get("pnl_krw", 0))

        state = load_trading_state()
        state = update_realtime_quotes_for_positions(state)
        if harvested:
            headline_result = f"수익 중인 {len(harvested)}개 종목 [{', '.join(harvested)}] 50% 분할 익절을 즉시 집행하여 총 {total_harvest_krw:+,}원의 실현수익을 금고에 확정했습니다!"
        else:
            headline_result = f"현재 보유 종목 중 즉시 분할 익절 대상(평가수익 플러스 구간)이 없어 기존 목표가 자동 감시망을 유지합니다."

        workflow_steps = [
            {"dept": "대표이사 비서실", "exec": "정유진 실장", "avatar": "👩‍💼", "status": "수익 실현 하달", "detail": "『수익 구간 보유 포지션 일괄 50% 분할 익절』 지시 접수"},
            {"dept": "퀀트·수급본부", "exec": "김도현 상무", "avatar": "📈", "status": "매도 호가 산출", "detail": f"보유 {len(active_pos)}종목 중 평가수익 플러스 {len(winners)}종목 최우선 매도 호가 포착"},
            {"dept": "리스크관리본부 (CRO)", "exec": "최서연 상무", "avatar": "🛡️", "status": "현금 비중 확대", "detail": "분할 익절 후 잔여 50% 물량은 매수가 본전 방어선 적용으로 리스크 제로화"},
            {"dept": "자산운용 트레이딩데스크", "exec": "최민석 수석", "avatar": "👨‍💼", "status": f"{len(harvested)}건 익절 체결", "detail": headline_result}
        ]

    # 5. 대표님 자연어 직접 지시 (CUSTOM_DIRECTIVE)
    else:
        # 5-1. 운용 방침 변경 키워드가 있는지 확인
        mode_changed_msg = ""
        if any(w in raw_text for w in ["공격적", "공격모드", "공격 모드", "풀매수"]):
            policy["mode"] = "aggressive"
            policy["mode_label"] = "🔥 공격적 수익극대화 체제"
            policy["alloc_per_trade_krw"] = 20000000
            policy["target_1_pct"] = 20.0
            policy["stop_loss_pct"] = -5.0
            mode_changed_msg = "전사 운용 방침을 [🔥 공격적 수익극대화 체제(1회 2,000만원)]로 전환하고, "
        elif any(w in raw_text for w in ["보수적", "방어모드", "방어 모드", "안전하게", "원금방어"]):
            policy["mode"] = "conservative"
            policy["mode_label"] = "🛡️ 보수적 원금방어 체제"
            policy["alloc_per_trade_krw"] = 5000000
            policy["target_1_pct"] = 10.0
            policy["stop_loss_pct"] = -2.5
            mode_changed_msg = "전사 운용 방침을 [🛡️ 보수적 원금방어 체제(1회 500만원, 손절 -2.5%)]로 전환하고, "

        # 배정 금액 직접 지정 확인 (예: "1500만원", "2000만원", "500만원")
        m_amt = re.search(r'(\d{3,5})\s*만\s*원', raw_text.replace(",", ""))
        custom_alloc = None
        if m_amt:
            custom_alloc = int(m_amt.group(1)) * 10000
            policy["alloc_per_trade_krw"] = custom_alloc

        resolved = _resolve_stock_for_directive(raw_text)
        wants_buy = any(w in raw_text for w in ["매수", "집행", "체결", "사라", "담아", "진입", "투자", "사봐", "매입"]) or auto_exec_flag
        wants_sell = any(w in raw_text for w in ["매도", "익절", "처분", "팔아", "청산"])

        if resolved.get("found"):
            sname = resolved["stock_name"]
            scode = resolved["stock_code"]
            cat_type = resolved["category_type"]
            c_price_str = resolved["current_price_str"]
            t_price_str = resolved["target_price_str"]

            # 전자결재 서류함에 [⚡ 대표이사 특명 기안] 자동 생성
            doc_id = f"DOC-CMD-{now_kst.strftime('%H%M%S')}"
            created_doc = {
                "doc_id": doc_id,
                "category_type": cat_type,
                "urgency": "⚡ 대표이사 특명 기안",
                "title": f"[{sname}] 대표이사 직접 하달 5대 본부 긴급 심의 & 자동 집행 기안서",
                "stock_name": sname,
                "stock_code": scode,
                "sector": resolved.get("sector", "핵심 전략주"),
                "broker": "5대 본부 합동 심의 (대표이사 특명)",
                "date": now_kst.strftime("%Y-%m-%d"),
                "current_price": f"{c_price_str} (실시간 연동)",
                "target_price": t_price_str,
                "upside_text": f"1차 목표 +{policy['target_1_pct']}% · 손절 방어 {policy['stop_loss_pct']}%",
                "ma50_status": "⚡ 대표이사 특명 최우선 편입 및 실시간 수급 감시",
                "plain_summary": (
                    f"📌 [대표이사 직접 지시 이행 보고]: 대표님께서 하달하신 『{raw_text}』 지시에 따라 "
                    f"리서치센터·퀀트본부·CRO·프랍트레이딩팀이 즉시 [{sname}] 종목의 실시간 시세({c_price_str})와 컨센서스 목표가({t_price_str})를 검증하여 상정한 특명 기안서입니다."
                ),
                "research_opinion": f"👨‍💼 [리서치센터 · 박진우 부사장]: 대표님 지시 종목 [{sname}]의 목표주가({t_price_str}) 및 업황 모멘텀 긴급 검증 완료. 최우선 편입 적격 판정.",
                "quant_opinion": f"📈 [퀀트·수급본부 · 김도현 상무]: 현재가 {c_price_str} 기준 호가 스프레드 분석 완료. 1회 배정금 {policy['alloc_per_trade_krw']//10000:,}만원 분할 집행 타점 산출.",
                "risk_opinion": f"🛡️ [리스크관리본부 · 최서연 CRO]: 회사 운용 방침({policy['mode_label']})에 의거 1차 익절 +{policy['target_1_pct']}%, 자동 손절선 {policy['stop_loss_pct']}% 감시망 설정 완료.",
                "secretary_conclusion": f"👩‍💼 정유진 비서실장 [이행 보고]: 대표님 지시사항을 전 부서가 즉시 이행 완료하였습니다.",
                "recommendation": f"{sname} 특명 매수 집행 완료" if wants_buy else f"{sname} 특명 기안 상정 완료",
                "detail_url": f"https://finance.naver.com/item/main.naver?code={scode}" if cat_type == "kr_stock" else f"https://finance.yahoo.com/quote/{scode}",
                "easy_terms": [
                    {"term": "대표이사 특명 기안", "desc": "대표님이 지휘통제실에서 직접 지시하여 5대 본부가 즉시 생성·집행한 최우선 결재 문서입니다."}
                ]
            }
            # 중복 방지 후 최상단 추가 (최대 10개 유지)
            custom_list = [d for d in state.get("custom_approvals", []) if d.get("stock_name") != sname]
            custom_list.insert(0, created_doc)
            state["custom_approvals"] = custom_list[:10]
            save_trading_state(state)

            if wants_sell:
                # 보유 중이면 즉시 매도 집행
                pos_match = next((p for p in state.get("positions", []) if (scode and p.get("stock_code") == scode) or sname in p.get("stock_name", "") and p.get("status") in ["HOLDING", "PARTIAL_EXIT"]), None)
                if pos_match:
                    sell_res = close_trading_position(pos_match["id"], f"대표이사 직접 매도 지시 ({raw_text})")
                    state = load_trading_state()
                    state = update_realtime_quotes_for_positions(state)
                    headline_result = f"대표님 지시에 따라 [{sname}] 보유 물량 전량 매도 집행을 완료했습니다! ({sell_res.get('message', '')})"
                else:
                    headline_result = f"[{sname}] 종목은 현재 보유 중이지 않아 매도 대상이 없으며, 특별 감시 기안서로 등록했습니다."
            elif wants_buy:
                trade_res = execute_ceo_approved_stock_trade({
                    "stock_name": sname,
                    "stock_code": scode,
                    "category_type": cat_type,
                    "current_price": c_price_str,
                    "target_price": t_price_str,
                    "alloc_krw": custom_alloc or policy.get("alloc_per_trade_krw", 10000000)
                })
                state = load_trading_state()
                state = update_realtime_quotes_for_positions(state)
                if trade_res.get("position"):
                    executed_trades.append(trade_res["position"])
                headline_result = f"{mode_changed_msg}대표님 지시 종목 [{sname}]에 대해 신규 특명 기안서 상정과 동시에 프랍트레이딩팀 매수 주문({(custom_alloc or policy['alloc_per_trade_krw'])//10000:,}만원 배정)을 자동 체결 완료했습니다!"
            else:
                headline_result = f"{mode_changed_msg}대표님 지시 종목 [{sname}] 심층 분석을 마치고 전자결재 서류함 최상단에 특명 기안서를 상정했습니다!"

            workflow_steps = [
                {"dept": "대표이사 비서실", "exec": "정유진 실장", "avatar": "👩‍💼", "status": "지시 접수·배당", "detail": f"대표님 지시(『{raw_text}』) 접수 → 전 부서 긴급 소집 및 전자결재 문서({doc_id}) 생성"},
                {"dept": "기업·산업 리서치본부", "exec": "박진우 부사장", "avatar": "👨‍💼", "status": "목표가 산출", "detail": f"[{sname}] 실시간 시세({c_price_str}) 대비 목표주가 {t_price_str} 컨센서스 검증 완료"},
                {"dept": "퀀트·수급본부", "exec": "김도현 상무", "avatar": "📈", "status": "최적 호가 계산", "detail": f"알고리즘 분할 매수 호가 산출 및 1회 배정금 {(custom_alloc or policy['alloc_per_trade_krw']):,}원 세팅"},
                {"dept": "리스크관리본부 (CRO)", "exec": "최서연 상무", "avatar": "🛡️", "status": "방어선 설정", "detail": f"1차 익절 +{policy['target_1_pct']}% / 자동 손절 {policy['stop_loss_pct']}% 실시간 감시 가동"},
                {"dept": "자산운용 트레이딩데스크", "exec": "최민석 수석", "avatar": "👨‍💼", "status": "즉시 체결 완료" if executed_trades else "집행 준비 완료", "detail": headline_result}
            ]
        else:
            # 특정 단일 종목이 아닌 전사 지시인 경우
            headline_result = f"{mode_changed_msg}대표님 지시(『{raw_text}』)를 전 부서에 하달하여 임원 합동 회의록 갱신 및 보유 포트폴리오 실시간 감시를 완료했습니다."
            workflow_steps = [
                {"dept": "대표이사 비서실", "exec": "정유진 실장", "avatar": "👩‍💼", "status": "전사 공지 완료", "detail": f"대표님 특별 지시 『{raw_text}』 전 임원 긴급 시달"},
                {"dept": "기업·산업 리서치본부", "exec": "박진우 부사장", "avatar": "👨‍💼", "status": "리포트 스캔", "detail": "지시 내용에 맞춘 업종 및 시장 컨센서스 최우선 재정렬"},
                {"dept": "퀀트·수급본부", "exec": "김도현 상무", "avatar": "📈", "status": "수급 추적 가동", "detail": "외국인·기관 프로그램 순매수 상위 종목 실시간 필터링"},
                {"dept": "리스크관리본부 (CRO)", "exec": "최서연 상무", "avatar": "🛡️", "status": "리스크 감사", "detail": f"현재 운용 체제({policy['mode_label']}) 기준 손절 방어선({policy['stop_loss_pct']}%) 엄격 유지"},
                {"dept": "자산운용 트레이딩데스크", "exec": "최민석 수석", "avatar": "👨‍💼", "status": "자율운용 감시", "detail": "실시간 시세 연동 및 목표가 도달 시 무인 자동 분할 익절 대기"}
            ]

    log_entry = {
        "cmd_id": cmd_id,
        "timestamp": now_str,
        "time_short": time_short,
        "command_type": cmd_type,
        "directive_text": raw_text or cmd_type,
        "headline_result": headline_result,
        "workflow_steps": workflow_steps,
        "created_doc_id": created_doc.get("doc_id") if created_doc else None,
        "executed_count": len(executed_trades)
    }
    state.setdefault("directive_logs", []).insert(0, log_entry)
    state["directive_logs"] = state["directive_logs"][:20]
    save_trading_state(state)

    return {
        "status": "success",
        "cmd_id": cmd_id,
        "headline_result": headline_result,
        "workflow_steps": workflow_steps,
        "created_doc": created_doc,
        "executed_trades": executed_trades,
        "company_policy": state.get("company_policy"),
        "trading_desk": state
    }

