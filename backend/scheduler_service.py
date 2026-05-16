import time
import threading
from datetime import datetime
import pytz
from db_manager import get_db_connection, get_watchlist, get_user_fcm_tokens
from stock_data import get_simple_quote, get_korean_stock_name
from firebase_config import send_multicast_notification, initialize_firebase

def is_korean_stock(symbol: str) -> bool:
    """숫자 6자리면 한국 주식으로 판단"""
    return symbol.isdigit() and len(symbol) == 6

def calculate_watchlist_performance(user_id: str, market: str):
    """사용자의 관심종목 시장별 오늘의 수익 현황 계산"""
    watchlist = get_watchlist(user_id)
    if not watchlist:
        return None
    
    items_perf = []
    total_daily_change_pct = 0
    count = 0
    
    for row in watchlist:
        symbol = row[0]
        added_price = float(row[1] or 0)
        
        # 시장 필터링
        is_kr = is_korean_stock(symbol)
        if market == "KR" and not is_kr: continue
        if market == "US" and is_kr: continue
            
        quote = get_simple_quote(symbol)
        if not quote:
            continue
            
        current_price = float(str(quote.get('price', 0)).replace(',', ''))
        daily_change_pct = float(str(quote.get('change', '0')).replace('%', '').replace('+', ''))
        
        # 추가 시점 대비 수익률 (있는 경우만)
        added_perf = None
        price_diff = None
        if added_price > 0:
            added_perf = ((current_price - added_price) / added_price) * 100
            price_diff = current_price - added_price
            
        items_perf.append({
            "symbol": symbol,
            "name": get_korean_stock_name(symbol) or symbol,
            "current_price": current_price,
            "daily_change": daily_change_pct,
            "added_perf": added_perf,
            "price_diff": price_diff
        })
        
        total_daily_change_pct += daily_change_pct
        count += 1
            
    if count == 0:
        return None
        
    return {
        "avg_daily_change": total_daily_change_pct / count,
        "items": items_perf,
        "count": count
    }

def send_closing_notification(market: str):
    """시장 마감 리포트 발송 로직"""
    initialize_firebase()
    print(f"[Scheduler] Generating {market} market closing report...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    # 관심종목을 가진 사용자 목록 추출
    cursor.execute("SELECT DISTINCT user_id FROM watchlist")
    user_ids = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    for user_id in user_ids:
        perf = calculate_watchlist_performance(user_id, market)
        if not perf:
            continue
            
        avg_change = perf["avg_daily_change"]
        count = perf["count"]
        
        market_name = "국내" if market == "KR" else "미국"
        title = f"[{market_name} 장마감] 관심종목 결산 리포트 📊"
        
        # 상위 종목 하나 추출 (오늘 기준)
        best_item = max(perf["items"], key=lambda x: x["daily_change"])
        
        # 총 수익(등록 시점 대비) 기준 상위 종목
        items_with_perf = [item for item in perf["items"] if item.get("added_perf") is not None]
        
        emoji = "📈" if avg_change > 0 else "📉" if avg_change < 0 else "➖"
        body = f"오늘 {market_name} 관심종목({count}개)은 평균 {avg_change:+.2f}% {emoji} 변동했습니다.\n"
        
        if items_with_perf:
            best_all_time = max(items_with_perf, key=lambda x: x["added_perf"])
            diff_amount = best_all_time["price_diff"]
            
            # 화폐 단위 처리 (미국 주식 소수점 처리)
            if market == "KR":
                diff_str = f"{diff_amount:+,.0f}원"
            else:
                diff_str = f"{diff_amount:+.2f}달러"
                
            body += f"\n🏆 나의 최고 효자종목: {best_all_time['name']}\n"
            body += f"등록 당시 평단가 대비 {diff_str} ({best_all_time['added_perf']:+.2f}%) 올랐습니다! 💰"
        else:
            body += f"오늘 가장 많이 오른 종목은 {best_item['name']}({best_item['daily_change']:+.2f}%)입니다. 수고하셨습니다! 💰"
        
        # FCM 토큰 가져오기
        tokens_data = get_user_fcm_tokens(user_id)
        if tokens_data:
            tokens = [t['token'] for t in tokens_data]
            send_multicast_notification(
                tokens=tokens,
                title=title,
                body=body,
                data={"url": "/watchlist", "type": "closing_report"}
            )
            print(f"[Scheduler] Report sent to {user_id} ({len(tokens)} devices)")

def run_market_scheduler():
    """시장별 마감 시각 및 장전 브리핑 시각을 감시하는 메인 스케줄러 루프"""
    import asyncio
    from morning_briefing import morning_briefing_service
    
    kst = pytz.timezone('Asia/Seoul')
    initialize_firebase()
    
    while True:
        try:
            now = datetime.now(kst)
            day_of_week = now.weekday() # 0:월, 4:금
            
            # 평일만 작동
            if day_of_week <= 4:
                # [NEW] 1. 한국 시장 장전 브리핑 (오전 08:30)
                if now.hour == 8 and now.minute == 30:
                    print("[Scheduler] Triggering KR Morning Briefing...")
                    asyncio.run(morning_briefing_service.run_daily_briefing("KR"))
                    time.sleep(60)

                # 2. 한국 시장 마감 리포트 (오후 3:40)
                if now.hour == 15 and now.minute == 40:
                    send_closing_notification("KR")
                    time.sleep(60)
                
                # [NEW] 3. 미국 시장 장전 브리핑 (오후 22:30 - 서머타임 미고려 기준)
                if now.hour == 22 and now.minute == 30:
                    print("[Scheduler] Triggering US Morning Briefing...")
                    asyncio.run(morning_briefing_service.run_daily_briefing("US"))
                    time.sleep(60)

                # 4. 미국 시장 마감 리포트 (오전 6:10)
                if now.hour == 6 and now.minute == 10:
                    send_closing_notification("US")
                    time.sleep(60)
            
            time.sleep(30)
            
        except Exception as e:
            print(f"[Scheduler] Error: {e}")
            time.sleep(60)

def start_scheduler():
    """백그라운드 스레드에서 스케줄러 시작"""
    thread = threading.Thread(target=run_market_scheduler, daemon=True)
    thread.start()
    print("[Scheduler] All Services Started (Closing Report + Morning Briefing)")
