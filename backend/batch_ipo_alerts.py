import json
import os
from datetime import datetime, timedelta
import pytz
from db_manager import get_db_connection, get_fcm_tokens_for_ipo, get_user_fcm_tokens, get_user_ipo_watchlist
from firebase_config import send_multicast_notification, initialize_firebase
from holiday_checker import exit_if_holiday

def parse_ipo_dates(date_str):
    """
    Parses date string like "260522~0526" into start and end datetime objects.
    Assumes current year is derived from the first two digits if available.
    """
    if not date_str or "~" not in date_str:
        return None, None
        
    parts = date_str.split("~")
    start_str = parts[0].strip()
    end_str = parts[1].strip()
    
    # KST 기준 현재 연도 (default)
    kst = pytz.timezone('Asia/Seoul')
    current_year = str(datetime.now(kst).year)
    
    start_date = None
    end_date = None
    
    try:
        if len(start_str) == 6:  # YYMMDD
            year = "20" + start_str[:2]
            month = start_str[2:4]
            day = start_str[4:]
            start_date = datetime(int(year), int(month), int(day), tzinfo=kst)
        elif len(start_str) == 4: # MMDD
            start_date = datetime(int(current_year), int(start_str[:2]), int(start_str[2:]), tzinfo=kst)
            
        if len(end_str) == 4 and start_date: # MMDD
            end_date = datetime(start_date.year, int(end_str[:2]), int(end_str[2:]), tzinfo=kst)
        elif len(end_str) == 6: # YYMMDD
            year = "20" + end_str[:2]
            end_date = datetime(int(year), int(end_str[2:4]), int(end_str[4:]), tzinfo=kst)
    except Exception as e:
        print(f"[IPO-Alerts] Date parse error for {date_str}: {e}")
        
    return start_date, end_date

def send_ipo_alerts():
    """공모주 일정에 따른 알림 발송"""
    exit_if_holiday("kor", "IPO Alerts")
    initialize_firebase()
    print("[IPO-Alerts] Checking IPO schedules for notifications...")
    
    cache_path = os.path.join(os.path.dirname(__file__), "ipo_cache.json")
    if not os.path.exists(cache_path):
        print("[IPO-Alerts] ipo_cache.json not found.")
        return
        
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            ipo_list = json.load(f)
    except Exception as e:
        print(f"[IPO-Alerts] Error loading ipo_cache: {e}")
        return
        
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    # 1. 대상 공모주 필터링 (내일 시작, 오늘 시작, 오늘 마감)
    alerts = [] # list of (ipo_info, status)
    
    for ipo in ipo_list:
        start_date, end_date = parse_ipo_dates(ipo.get("date", ""))
        if not start_date or not end_date:
            continue
            
        name = ipo.get("name", "알 수 없는 종목")
        
        if start_date == tomorrow:
            alerts.append((ipo, "내일 청약 시작"))
        elif start_date == today:
            alerts.append((ipo, "오늘 청약 시작"))
        elif end_date == today:
            alerts.append((ipo, "오늘 청약 마감"))
            
    if not alerts:
        print("[IPO-Alerts] No IPOs matching alert conditions today.")
        return
        
    # 2. 사용자별 알림 발송 설정
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 모든 사용자의 FCM 토큰 목록을 맵 형태로 정리
        cursor.execute("SELECT user_id, token, pref_ipo FROM fcm_tokens")
        user_tokens = {}
        for row in cursor.fetchall():
            uid = row[0]
            token = row[1]
            pref_ipo = row[2]
            
            if uid not in user_tokens:
                user_tokens[uid] = []
            user_tokens[uid].append({"token": token, "pref_ipo": pref_ipo})
            
        # 모든 사용자의 개별 공모주 관심 종목 맵 (user_id -> set of ipo_names)
        cursor.execute("SELECT user_id, ipo_name FROM ipo_watchlist")
        user_watchlists = {}
        for row in cursor.fetchall():
            uid = row[0]
            ipo_name = row[1]
            if uid not in user_watchlists:
                user_watchlists[uid] = set()
            user_watchlists[uid].add(ipo_name)
    finally:
        conn.close()

    # 발송 큐 (token -> (title, body))
    # 여러 종목이 겹칠 수 있으므로 토큰별로 메시지 조합
    token_messages = {}
    user_messages = {} # uid -> (title, body)

    for uid, tokens in user_tokens.items():
        user_wl = user_watchlists.get(uid, set())
        
        # 유저가 받아야 할 알림들 필터링
        user_alerts = []
        # 디바이스 중 하나라도 전체 알림이 켜져있으면 전체 발송
        has_full_pref = any(t.get("pref_ipo") == 1 for t in tokens)
        
        for ipo, status in alerts:
            name = ipo.get("name")
            if has_full_pref or name in user_wl:
                user_alerts.append(f"[{status}] {name}")
                
        if user_alerts:
            title = "📣 공모주 청약 알림"
            body = user_alerts[0] if len(user_alerts) == 1 else f"{user_alerts[0]} 외 {len(user_alerts)-1}건"
            user_messages[uid] = (title, body)
            
            for t_info in tokens:
                token = t_info["token"]
                if title not in token_messages:
                    token_messages[(token, title, body)] = 1

    # DB 저장 (알림센터 누적) 및 발송
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        for uid, (title, body) in user_messages.items():
            try:
                cursor.execute("""
                    INSERT INTO alert_history (user_id, symbol, type, message, current_price, buy_price, threshold)
                    VALUES (?, 'IPO', 'market', ?, 0, 0, 0)
                """, (uid, f"{title}\n{body}"))
                
                # 해당 유저의 토큰 추출
                u_tokens = [t["token"] for t in user_tokens.get(uid, [])]
                if u_tokens:
                    send_multicast_notification(
                        u_tokens, 
                        title, 
                        body, 
                        {"url": "/signals?tab=ipo", "type": "ipo_alert", "is_global": "false"}, 
                        target_users=[uid]
                    )
            except Exception as item_e:
                print(f"[IPO-Alerts] Error for user {uid}: {item_e}")
                
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[IPO-Alerts] Failed to save to DB or dispatch: {e}")

    print(f"[IPO-Alerts] Notification dispatched to {len(user_messages)} users.")

if __name__ == "__main__":
    send_ipo_alerts()
