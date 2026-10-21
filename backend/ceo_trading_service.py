import json
import os
import time
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

KST = timezone(timedelta(hours=9))
STATE_FILE = os.path.join(os.path.dirname(__file__), "ceo_trading_state.json")

DEFAULT_STATE = {
    "total_capital": 100000000, # 1억원 초기 운용 자산
    "available_cash": 45000000,
    "realized_pnl": 2840000,
    "win_count": 8,
    "loss_count": 1,
    "desk_lead": {
        "name": "최민석",
        "title": "수석 운용역 (자산운용 프랍트레이딩 1팀장)",
        "badge": "경력 14년 · 대형 증권사 프랍트레이더 출신",
        "avatar": "👨‍💼",
        "status": "정규장 실시간 호가 감시 및 적정 분할 매매 실행 중"
    },
    "positions": [
        {
            "id": "POS-034020",
            "stock_name": "두산에너빌리티",
            "stock_code": "034020",
            "category": "kr_stock",
            "status": "HOLDING",
            "trader_name": "최민석 수석 운용역 (프랍 1팀)",
            "buy_date": "2026-10-21 09:12:34",
            "buy_price": 61200,
            "qty": 200,
            "invested_krw": 12240000,
            "current_price": 64100,
            "unrealized_pnl": 580000,
            "pnl_pct": 4.74,
            "target_price_1": 70400,
            "target_price_final": 120000,
            "stop_loss_price": 59000,
            "strategy_note": "SMR 수주 모멘텀 유효. 적정 매수가 61,200원에 분할 매수 완료. 1차 목표가 70,400원(+15%) 도달 시 50% 분할 익절 주문 예약 중.",
            "trade_logs": [
                {"timestamp": "09:12:34", "type": "BUY", "message": "대표이사 재가 승인 → 1차 적정 매수가 분할 매수 100주 @ 61,000원 체결"},
                {"timestamp": "09:45:10", "type": "BUY", "message": "50일선 지지 확인 → 2차 추가 매수 100주 @ 61,400원 체결 (평균단가 61,200원 확정)"},
                {"timestamp": "12:30:00", "type": "STATUS", "message": "현재 수익률 +4.74% 순항 중. 1차 목표가(70,400원) 호가 감시 지속"}
            ]
        },
        {
            "id": "POS-000660",
            "stock_name": "SK하이닉스",
            "stock_code": "000660",
            "category": "kr_stock",
            "status": "HOLDING",
            "trader_name": "이소연 책임 운용역 (반도체/IT 전담)",
            "buy_date": "2026-10-21 09:20:15",
            "buy_price": 1220000,
            "qty": 10,
            "invested_krw": 12200000,
            "current_price": 1274500,
            "unrealized_pnl": 545000,
            "pnl_pct": 4.47,
            "target_price_1": 1380000,
            "target_price_final": 1700000,
            "stop_loss_price": 1180000,
            "strategy_note": "HBM3E 독점 공급망 모멘텀. 기관 프로그램 순매수 유입 확인 후 진입. +12% 구간에서 1차 차익 실현 예정.",
            "trade_logs": [
                {"timestamp": "09:20:15", "type": "BUY", "message": "대표이사 재가 승인 → 최적 호가 분할 매수 10주 @ 1,220,000원 체결 완료"},
                {"timestamp": "11:15:00", "type": "STATUS", "message": "외국인·기관 대량 매집 확인, +4.47% 평가익 유지 중"}
            ]
        },
        {
            "id": "POS-NVDA",
            "stock_name": "NVDA",
            "stock_code": "NVDA",
            "category": "us_stock",
            "status": "HOLDING",
            "trader_name": "David Kim 운용역 (글로벌 테크)",
            "buy_date": "2026-10-20 22:35:10",
            "buy_price": 132.50,
            "qty": 70,
            "invested_krw": 12800000,
            "current_price": 138.00,
            "unrealized_pnl": 530000,
            "pnl_pct": 4.15,
            "target_price_1": 150.00,
            "target_price_final": 180.00,
            "stop_loss_price": 127.00,
            "strategy_note": "블랙웰 아키텍처 서버 수요 폭증. $132.50에 분할 매수 완료. 월가 목표가 $180까지 단계적 분할 매도 전략.",
            "trade_logs": [
                {"timestamp": "22:35:10", "type": "BUY", "message": "대표이사 재가 승인 → 나스닥 정규장 분할 매수 70주 @ $132.50 체결 완료"},
                {"timestamp": "04:00:00", "type": "STATUS", "message": "뉴욕 증시 마감: +4.15% 평가익 확정, 목표가 $150 감시 중"}
            ]
        }
    ],
    "blotter": [
        {
            "order_id": "ORD-20261021-01",
            "timestamp": "2026-10-21 09:12:34",
            "stock_name": "두산에너빌리티",
            "side": "매수",
            "qty": 200,
            "price_str": "61,200원",
            "amount_str": "12,240,000원",
            "status": "체결완료",
            "trader": "최민석 수석"
        },
        {
            "order_id": "ORD-20261021-02",
            "timestamp": "2026-10-21 09:20:15",
            "stock_name": "SK하이닉스",
            "side": "매수",
            "qty": 10,
            "price_str": "1,220,000원",
            "amount_str": "12,200,000원",
            "status": "체결완료",
            "trader": "이소연 책임"
        },
        {
            "order_id": "ORD-20261020-03",
            "timestamp": "2026-10-20 22:35:10",
            "stock_name": "NVDA",
            "side": "매수",
            "qty": 70,
            "price_str": "$132.50",
            "amount_str": "12,800,000원",
            "status": "체결완료",
            "trader": "David Kim"
        }
    ]
}

def load_trading_state() -> Dict[str, Any]:
    if not os.path.exists(STATE_FILE):
        save_trading_state(DEFAULT_STATE)
        return DEFAULT_STATE
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[TradingService] load_state error: {e}")
        return DEFAULT_STATE

def save_trading_state(state: Dict[str, Any]) -> None:
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[TradingService] save_state error: {e}")

def update_realtime_quotes_for_positions(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    보유 중인 포지션의 실시간 현재가를 네이버 폴링 API 및 야후 파이낸스에서 일괄 조회하여 평가손익을 재계산합니다.
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
            
    # 포지션별 평가손익 및 수익률 갱신
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
                
            pos["unrealized_pnl"] = unrealized
            pos["pnl_pct"] = pnl_pct
            total_unrealized_pnl += unrealized
            total_invested += invested
            
    state["summary"] = {
        "total_capital": state.get("total_capital", 100000000),
        "total_invested": total_invested,
        "available_cash": state.get("available_cash", 45000000),
        "total_unrealized_pnl": total_unrealized_pnl,
        "total_realized_pnl": state.get("realized_pnl", 2840000),
        "combined_profit": total_unrealized_pnl + state.get("realized_pnl", 2840000),
        "combined_return_pct": round(((total_unrealized_pnl + state.get("realized_pnl", 2840000)) / state.get("total_capital", 100000000)) * 100, 2),
        "active_position_count": len([p for p in state.get("positions", []) if p.get("status") in ["HOLDING", "PARTIAL_EXIT"]]),
        "win_rate": round((state.get("win_count", 8) / max(1, (state.get("win_count", 8) + state.get("loss_count", 1)))) * 100, 1)
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
    
    # 실시간 현재가 파싱
    curr_raw = doc_data.get("current_price") or ""
    curr_str = str(curr_raw)
    digits = re.sub(r'[^\d.]', '', curr_str.split(' ')[0] if curr_str else '')
    curr_num = float(digits) if digits else (100000.0 if cat_type == "kr_stock" else 150.0)
    
    # 증권사 트레이딩 팀의 최적 분할 매수가 계산 (호가 매수 최적화: 현재가 대비 약 -0.3%~0% 유리한 가격에 체결)
    buy_price = curr_num if cat_type != "kr_stock" else float(int(curr_num * 0.997))
    
    # 1회 배정 운용 자금: 기본 1,000만원
    alloc_krw = 10000000
    if cat_type == "kr_stock":
        qty = max(1, int(alloc_krw / buy_price))
        actual_invested = int(buy_price * qty)
    else:
        qty = max(1, int((alloc_krw / 1380.0) / buy_price))
        actual_invested = alloc_krw
        
    # 목표가 및 손절선 계산
    tg_str = doc_data.get("target_price") or ""
    tg_digits = re.sub(r'[^\d.]', '', str(tg_str))
    tg_num = float(tg_digits) if tg_digits else (buy_price * 1.3)
    
    target_1 = buy_price * 1.15 # 1차 익절가 (+15%)
    target_final = tg_num if tg_num > buy_price else (buy_price * 1.4)
    stop_loss = buy_price * 0.965 # -3.5% 손절선
    
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
    state["available_cash"] = max(0, state.get("available_cash", 45000000) - actual_invested)
    
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
