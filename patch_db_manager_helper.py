import os

file_path = "backend/db_manager.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

helper_code = """
def check_and_consume_alert_quota(user_id: str) -> str:
    \"\"\"
    프리미엄 알림 발송 전 한도를 체크하고 차감합니다.
    Returns:
        'OK': 발송 가능
        'LIMIT_REACHED': 방금 한도 도달함 (초대 유도 알림 발송 필요)
        'EXHAUSTED': 이미 한도 초과됨 (알림 발송 안 함)
    \"\"\"
    if user_id == "guest":
        return "OK"  # 게스트는 일단 패스 (또는 제한 가능)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    from datetime import datetime
    today = datetime.now().strftime('%Y-%m-%d')
    
    cursor.execute("SELECT is_unlimited_alerts, daily_alert_count, last_alert_date FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return "OK"
        
    is_unlimited, count, last_date = row
    if is_unlimited:
        conn.close()
        return "OK"
        
    if last_date != today:
        count = 0
        
    MAX_ALERTS = 3
    
    if count >= MAX_ALERTS:
        # If it was exactly MAX_ALERTS yesterday, it would be reset. So this means they hit it today.
        # Wait, if they already hit it, we just return EXHAUSTED so we don't spam them with 'limit reached' every time.
        # But how do we know if we already sent the 'limit reached' message?
        # Let's say count == MAX_ALERTS means we send the "LIMIT_REACHED" message, then increment to MAX_ALERTS + 1
        if count == MAX_ALERTS:
            cursor.execute("UPDATE users SET daily_alert_count = ?, last_alert_date = ? WHERE id = ?", (count + 1, today, user_id))
            conn.commit()
            conn.close()
            return "LIMIT_REACHED"
        else:
            conn.close()
            return "EXHAUSTED"
            
    cursor.execute("UPDATE users SET daily_alert_count = ?, last_alert_date = ? WHERE id = ?", (count + 1, today, user_id))
    conn.commit()
    conn.close()
    return "OK"
"""

if "check_and_consume_alert_quota" not in content:
    content = content + "\n" + helper_code
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Added check_and_consume_alert_quota to db_manager.py")
