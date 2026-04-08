import time
import threading
from datetime import datetime
import pytz
from db_manager import get_db_connection, get_user_portfolio, get_all_fcm_tokens
from stock_data import get_simple_quote

def is_korean_stock(symbol: str) -> bool:
    """숫자 6자리면 한국 주식으로 판단"""
    return symbol.isdigit() and len(symbol) == 6

def calculate_portfolio_performance(user_id: str):
    """사용자의 시장별 수익률 계산"""
    portfolio = get_user_portfolio(user_id)
    if not portfolio:
        return None
    
    kr_summary = {"total_buy": 0, "total_current": 0, "count": 0}
    us_summary = {"total_buy": 0, "total_current": 0, "count": 0}
    
    for item in portfolio:
        symbol = item['symbol']
        buy_price = float(item['price'])
        quantity = float(item['quantity'])
        
        if buy_price <= 0 or quantity <= 0:
            continue
            
        quote = get_simple_quote(symbol)
        if not quote:
            continue
            
        current_price = float(str(quote.get('price', 0)).replace(',', ''))
        
        buy_total = buy_price * quantity
        curr_total = current_price * quantity
        
        if is_korean_stock(symbol):
            kr_summary["total_buy"] += buy_total
            kr_summary["total_current"] += curr_total
            kr_summary["count"] += 1
        else:
            us_summary["total_buy"] += buy_total
            us_summary["total_current"] += curr_total
            us_summary["count"] += 1
            
    return {"kr": kr_summary, "us": us_summary}

def send_closing_notification(market: str):
    """시장 마감 알림 발송 로직"""
    print(f"[Scheduler] Running {market} market closing notification...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    # 포트폴리오를 가진 유니크한 사용자 목록 추출
    cursor.execute("SELECT DISTINCT user_id FROM user_portfolio")
    user_ids = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    for user_id in user_ids:
        perf = calculate_portfolio_performance(user_id)
        if not perf:
            continue
            
        summary = perf.get(market.lower())
        if summary and summary["count"] > 0:
            total_buy = summary["total_buy"]
            total_curr = summary["total_current"]
            profit = total_curr - total_buy
            yield_pct = (profit / total_buy) * 100
            
            market_name = "국내" if market == "KR" else "미국"
            title = f"[{market_name} 장마감] 오늘의 비서 리포트 📊"
            body = f"오늘 {market_name} 주식 수익률은 {yield_pct:+.2f}%입니다. 총 {profit:+,.0f}원의 자산 변동이 있었습니다."
            
            # 실제 FCM 발송 로직 (추후 연동)
            print(f"[Push Notification to {user_id}]: {title} - {body}")

def run_market_scheduler():
    """시장별 마감 시각을 감시하는 메인 스케줄러 루프"""
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            day_of_week = now.weekday() # 0:월, 4:금, 5:토, 6:일
            
            # 평일만 작동 (0~4)
            if day_of_week <= 4:
                # 1. 한국 시장 마감 알림 (오후 3:40)
                if now.hour == 15 and now.minute == 40:
                    send_closing_notification("KR")
                    time.sleep(60) # 중복 발송 방지
                
                # 2. 미국 시장 마감 알림 (오전 8:00)
                if now.hour == 8 and now.minute == 0:
                    send_closing_notification("US")
                    time.sleep(60)
            
            time.sleep(30) # 30초마다 체크
            
        except Exception as e:
            print(f"[Scheduler] CRITICAL ERROR: {e}")
            time.sleep(60)

def start_scheduler():
    """백그라운드 스레드에서 스케줄러 시작"""
    thread = threading.Thread(target=run_market_scheduler, daemon=True)
    thread.start()
    print("[Scheduler] Smart Market Notification Service Started (KST Based)")
