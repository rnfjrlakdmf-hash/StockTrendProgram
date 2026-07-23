import time
import hashlib
from db_manager import get_unique_watched_symbols, get_watchers_by_symbol, check_and_record_alert
from stock_data import fetch_global_breaking_news, fetch_batch_realtime_prices
from firebase_config import send_multicast_notification
from ai_analysis import generate_realtime_summary

def run_watchlist_news_monitor():
    """
    1. 전체 관심종목 목록 조회
    2. 네이버 속보 피드 1회 조회 (역방향 스캔)
    3. 뉴스 제목에 관심종목 이름이 포함되어 있으면 매칭
    4. 중복 알림 방지 체크 후 푸시 발송
    """
    try:
        symbols = get_unique_watched_symbols()
        if not symbols:
            return
            
        # 속보 가져오기 (1 API Call)
        news_list = fetch_global_breaking_news()
        
        # 종목명 찾기를 위해 현재가 배치를 한 번 호출하여 코드를 이름으로 매핑
        prices = fetch_batch_realtime_prices(symbols)
        name_to_code = {data['name']: code for code, data in prices.items()}
        
        for news in news_list:
            title = news['title']
            url = news['link']
            
            # 뉴스 제목에 찜한 종목의 이름이 있는지 확인
            for name, code in name_to_code.items():
                if name in title:
                    # 매칭됨! 중복 알림인지 확인
                    content_hash = hashlib.md5(url.encode('utf-8')).hexdigest()
                    if check_and_record_alert(code, "BREAKING_NEWS", content_hash):
                        # 푸시 발송 로직
                        tokens = get_watchers_by_symbol(code)
                        if tokens:
                            push_title = f"📰 [실시간 뉴스] {name}"
                            body = f"내 관심종목 '{name}' 관련 새로운 속보가 떴습니다.\n\n- {title}"
                            
                            push_data = {
                                "type": "disclosure_alert", # click_url 처리를 위해 disclosure_alert 사용
                                "url": url,
                                "dart_url": url,
                                "symbol": code
                            }
                            
                            send_multicast_notification(tokens, push_title, body, data=push_data)
                            print(f"[WatchlistMonitor] News alert sent for {name} to {len(tokens)} users.")
                            
    except Exception as e:
        print(f"[WatchlistMonitor] News error: {e}")


def run_watchlist_price_monitor():
    """
    1. 전체 관심종목 목록 조회
    2. 네이버 Batch API로 한 번에 현재가 조회 (100개씩)
    3. 전일 대비 5% 이상 상승 혹은 -5% 하락 시 알림
    """
    try:
        symbols = get_unique_watched_symbols()
        if not symbols:
            return
            
        prices = fetch_batch_realtime_prices(symbols)
        
        for code, data in prices.items():
            name = data['name']
            change_pct = data['change_percent']
            
            # 5% 급등락 체크
            if change_pct >= 5.0 or change_pct <= -5.0:
                direction = "급등" if change_pct > 0 else "급락"
                
                # 오늘 이 종목이 +5% 알림이 한 번 나갔으면 두 번 울리지 않도록 해시 조합
                content_hash = f"price_{direction}" 
                
                if check_and_record_alert(code, "PRICE_SPIKE", content_hash):
                    tokens = get_watchers_by_symbol(code)
                    if tokens:
                        push_title = f"🚨 [주가 {direction}] {name}"
                        body = f"내 관심종목 '{name}' 주가가 전일 대비 {change_pct}% {direction} 중입니다!"
                        
                        push_data = {
                            "type": "stock_price_alert",
                            "symbol": code,
                            "url": f"/discovery?q={code}",
                            "dart_url": f"/discovery?q={code}" 
                        }
                        
                        send_multicast_notification(tokens, push_title, body, data=push_data)
                        print(f"[WatchlistMonitor] Price alert sent for {name} ({change_pct}%) to {len(tokens)} users.")
                        
    except Exception as e:
        print(f"[WatchlistMonitor] Price error: {e}")
