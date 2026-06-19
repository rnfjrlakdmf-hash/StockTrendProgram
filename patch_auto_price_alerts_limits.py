import os

file_path = "backend/auto_price_alerts.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """            all_tokens = []
            for user_id in users:
                tokens_data = get_user_fcm_tokens(user_id)
                for t in tokens_data:
                    all_tokens.append(t['token'])
                    
            if not all_tokens:
                return"""

replacement = """            from db_manager import check_and_consume_alert_quota
            
            all_tokens = []
            limit_reached_tokens = []
            
            for user_id in users:
                status = check_and_consume_alert_quota(user_id)
                
                tokens_data = get_user_fcm_tokens(user_id)
                for t in tokens_data:
                    if status == "OK":
                        all_tokens.append(t['token'])
                    elif status == "LIMIT_REACHED":
                        limit_reached_tokens.append(t['token'])
                        
            # 정상 발송
            if all_tokens:
                send_multicast_notification(
                    tokens=all_tokens,
                    title=push_title,
                    body=body,
                    data={
                        "type": "auto_price_alert",
                        "symbol": symbol,
                        "url": f"/discovery?q={symbol}"
                    }
                )
                print(f"[AutoPriceAlert] Sent '{title_prefix}' for {stock_name} to {len(all_tokens)} devices")
                
            # 한도 도달 안내 발송
            if limit_reached_tokens:
                send_multicast_notification(
                    tokens=limit_reached_tokens,
                    title="⚠️ 오늘 무료 프리미엄 알림(3회) 소진",
                    body="친구 1명만 초대하고 평생 무제한으로 1급 정보를 받아보세요!",
                    data={
                        "type": "referral_invite",
                        "url": "/referral"
                    }
                )
                print(f"[AutoPriceAlert] Sent limit reached notification to {len(limit_reached_tokens)} devices")
                
            return"""

if "limit_reached_tokens" not in content:
    content = content.replace(target, replacement)
    # Remove the existing send_multicast_notification logic since we included it above
    content = content.replace("""            send_multicast_notification(
                tokens=all_tokens,
                title=push_title,
                body=body,
                data={
                    "type": "auto_price_alert",
                    "symbol": symbol,
                    "url": f"/discovery?q={symbol}"
                }
            )
            print(f"[AutoPriceAlert] Sent '{title_prefix}' for {stock_name} to {len(all_tokens)} devices")""", "")
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched auto_price_alerts.py")
