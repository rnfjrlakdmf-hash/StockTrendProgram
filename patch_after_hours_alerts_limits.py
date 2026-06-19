import os

file_path = "backend/after_hours_alerts.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """                from firebase_config import send_multicast_notification
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
                    send_multicast_notification(tokens, title, body, data=push_data)"""

replacement = """                from firebase_config import send_multicast_notification
                from db_manager import get_user_fcm_tokens, check_and_consume_alert_quota
                
                all_tokens = []
                limit_reached_tokens = []
                
                for user_id in users:
                    status = check_and_consume_alert_quota(user_id)
                    user_tokens = get_user_fcm_tokens(user_id)
                    
                    if status == "OK":
                        for t in user_tokens:
                            all_tokens.append(t['token'])
                    elif status == "LIMIT_REACHED":
                        for t in user_tokens:
                            limit_reached_tokens.append(t['token'])
                            
                push_data = {
                    "type": "stock_alert",
                    "url": f"/stock/{clean_sym}",
                    "symbol": clean_sym
                }
                
                if all_tokens:
                    send_multicast_notification(all_tokens, title, body, data=push_data)
                    
                if limit_reached_tokens:
                    send_multicast_notification(
                        limit_reached_tokens,
                        title="⚠️ 오늘 무료 프리미엄 알림(3회) 소진",
                        body="친구 1명만 초대하고 평생 무제한으로 1급 정보를 받아보세요!",
                        data={"type": "referral_invite", "url": "/referral"}
                    )"""

if "check_and_consume_alert_quota" not in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched after_hours_alerts.py")
