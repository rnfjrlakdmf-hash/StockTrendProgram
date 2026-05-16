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

def send_opening_notification(market: str):
    """시장 시작 시가 알림 발송"""
    initialize_firebase()
    print(f"[Scheduler] Sending {market} market opening prices...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT user_id FROM watchlist")
    user_ids = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    for user_id in user_ids:
        watchlist = get_watchlist(user_id)
        if not watchlist: continue
        
        items_info = []
        for row in watchlist:
            symbol = row[0]
            if is_korean_stock(symbol) and market == "US": continue
            if not is_korean_stock(symbol) and market == "KR": continue
            
            quote = get_simple_quote(symbol)
            if quote:
                price = quote.get('price', 0)
                name = get_korean_stock_name(symbol) or symbol
                items_info.append(f"• {name}: {price}")
        
        if not items_info: continue
        
        market_name = "국내" if market == "KR" else "미국"
        title = f"☀️ {market_name} 장시작! 시가 알림"
        body = f"오늘 {market_name} 관심종목 시가입니다.\n\n" + "\n".join(items_info[:10])
        if len(items_info) > 10:
            body += f"\n외 {len(items_info)-10}개 더 있음"
            
        tokens_data = get_user_fcm_tokens(user_id)
        if tokens_data:
            send_multicast_notification([t['token'] for t in tokens_data], title, body, {"url": "/watchlist"})

def send_closing_notification(market: str):
    """시장 마감 리포트 발송 로직 (가격 포함)"""
    initialize_firebase()
    print(f"[Scheduler] Generating {market} market closing report...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT user_id FROM watchlist")
    user_ids = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    for user_id in user_ids:
        perf = calculate_watchlist_performance(user_id, market)
        if not perf: continue
            
        avg_change = perf["avg_daily_change"]
        market_name = "국내" if market == "KR" else "미국"
        emoji = "📈" if avg_change > 0 else "📉" if avg_change < 0 else "➖"
        
        title = f"🌕 {market_name} 장마감 리포트 {emoji}"
        
        # 상세 가격 리스트 생성 (총 수익 정보 포함)
        price_list = []
        for item in perf["items"][:8]: # 가독성을 위해 8개로 조정
            change_emoji = "▲" if item['daily_change'] > 0 else "▼" if item['daily_change'] < 0 else "-"
            line = f"• {item['name']}: {item['current_price']} ({change_emoji}{abs(item['daily_change']):.1f}%)"
            
            # 등록 시점 대비 수익 정보가 있는 경우 추가
            if item.get('price_diff') is not None:
                diff = item['price_diff']
                perf_pct = item['added_perf']
                unit = "원" if market == "KR" else "$"
                sign = "+" if diff > 0 else ""
                line += f" [{sign}{diff:,.0f}{unit}, {perf_pct:+.1f}%]"
            
            price_list.append(line)
            
        body = f"평균 수익률: {avg_change:+.2f}%\n" + "\n".join(price_list)
        if len(perf["items"]) > 8:
            body += f"\n외 {len(perf['items'])-8}개 더 있음"
        
        tokens_data = get_user_fcm_tokens(user_id)
        if tokens_data:
            send_multicast_notification([t['token'] for t in tokens_data], title, body, {"url": "/watchlist"})

def run_market_scheduler():
    """시장별 이벤트 감시 메인 루프"""
    import asyncio
    from morning_briefing import morning_briefing_service
    
    kst = pytz.timezone('Asia/Seoul')
    initialize_firebase()
    
    while True:
        try:
            now = datetime.now(kst)
            day_of_week = now.weekday()
            
            # [매일 발송] AI 모닝 브리핑 (주말/공휴일 포함 뉴스 요약)
            if now.hour == 8 and now.minute == 0:
                asyncio.run(morning_briefing_service.run_daily_briefing("KR"))
                time.sleep(60)
            
            if now.hour == 21 and now.minute == 30:
                asyncio.run(morning_briefing_service.run_daily_briefing("US"))
                time.sleep(60)

            # [평일만 발송] 가격 알림 (월~금)
            if day_of_week <= 4:
                # 오전 09:05 국내 장시작 시가 알림
                if now.hour == 9 and now.minute == 5:
                    send_opening_notification("KR")
                    time.sleep(60)

                # 오후 15:40 국내 장마감 종가 리포트
                if now.hour == 15 and now.minute == 40:
                    send_closing_notification("KR")
                    time.sleep(60)
                
                # 오후 23:35 미국 장시작 시가 알림 (서머타임 미고려)
                if now.hour == 23 and now.minute == 35:
                    send_opening_notification("US")
                    time.sleep(60)

                # 오전 06:10 미국 장마감 종가 리포트
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
    print("[Scheduler] All Intelligence Services Started")
