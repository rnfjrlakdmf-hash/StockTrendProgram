import asyncio
from datetime import datetime
import pytz
from db_manager import get_db_connection
from korea_data import get_naver_stock_info
from holiday_checker import is_holiday
import traceback

async def after_hours_alert_loop():
    print("[AfterHours] Monitor started")
    while True:
        try:
            kst = pytz.timezone('Asia/Seoul')
            now = datetime.now(kst)
            
            # 18:05 부터 18:10 사이에 1회 실행 (시간외 단일가 마감은 18:00)
            if now.hour == 18 and 5 <= now.minute <= 10:
                if is_holiday("kor") or now.weekday() >= 5:
                    await asyncio.sleep(60)
                    continue
                
                print(f"[AfterHours] Running after-hours check at {now}")
                await check_after_hours_limit()
                
                # 중복 실행 방지를 위해 한 시간 대기
                await asyncio.sleep(3600)
                continue
                
        except Exception as e:
            print(f"[AfterHours] Error: {e}")
            
        await asyncio.sleep(60)

async def check_after_hours_limit():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT w.user_id, w.symbol 
            FROM watchlist w
            JOIN fcm_tokens f ON w.user_id = f.user_id
        """)
        rows = cursor.fetchall()
        conn.close()
        
        symbol_users = {}
        for user_id, symbol in rows:
            if symbol not in symbol_users:
                symbol_users[symbol] = []
            symbol_users[symbol].append(user_id)
            
        for symbol, users in symbol_users.items():
            # 한국 주식만 처리
            clean_sym = symbol.split('.')[0]
            if len(clean_sym) != 6 or not clean_sym[0].isdigit():
                continue
                
            info = await asyncio.to_thread(get_naver_stock_info, symbol)
            if not info or not info.get("nxt_data"):
                continue
                
            nxt = info["nxt_data"]
            change_pct = nxt.get("change_pct", 0.0)
            
            if change_pct >= 9.0:
                stock_name = info.get("name", symbol)
                title = f"🌙 [시간외 상한가] {stock_name}"
                body = f"시간외 단일가 거래에서 {change_pct}% 상승하며 상한가에 근접했습니다! 내일 시초가 폭등을 준비하세요."
                print(f"[AfterHours] Triggered for {symbol}: {change_pct}%")
                
                from firebase_config import send_multicast_notification
                from db_manager import get_user_fcm_tokens
                tokens = []
                for user_id in users:
                    tokens.extend(get_user_fcm_tokens(user_id))
                
                if tokens:
                    push_data = {
                        "type": "stock_alert",
                        "url": f"/stock/{clean_sym}",
                        "symbol": clean_sym
                    }
                    send_multicast_notification(tokens, title, body, data=push_data)
                    
            await asyncio.sleep(0.5) # API rate limit
            
    except Exception as e:
        print(f"[AfterHours] Check failed: {e}")
        traceback.print_exc()
