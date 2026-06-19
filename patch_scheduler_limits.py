import os

file_path = "backend/scheduler.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """                    # [추가] FCM 웹 푸시 알림 발송 (전체 사용자 대상)
                    from db_manager import get_all_fcm_tokens
                    from firebase_config import send_multicast_notification
                    
                    all_tokens = get_all_fcm_tokens(require_whale_alert=True)
                    if all_tokens:
                        push_title = f"{prefix_title} {corp}"
                        
                        # [비용 0원 시스템] AI 호출 없이 즉시 발송
                        summary_body = f"[{corp}] {report_title} 공시가 방금 올라왔습니다. 지금 바로 원문을 확인하고 대응하세요!"
                        
                        push_data = {
                            "type": "disclosure_alert",
                            "url": f"/stock/{raw_code}",
                            "dart_url": dart_link,
                            "symbol": raw_code
                        }
                        send_multicast_notification(all_tokens, push_title, summary_body, data=push_data)
                        logger.info(f"[WhaleSiren] FCM Zero-Cost Push sent to {len(all_tokens)} users for {corp}")"""

replacement = """                    # [추가] FCM 웹 푸시 알림 발송 (전체 사용자 대상)
                    from db_manager import get_all_fcm_tokens_with_user, check_and_consume_alert_quota
                    from firebase_config import send_multicast_notification
                    
                    user_tokens_map = {}
                    for uid, tok in get_all_fcm_tokens_with_user(require_whale_alert=True):
                        if uid not in user_tokens_map:
                            user_tokens_map[uid] = []
                        user_tokens_map[uid].append(tok)
                        
                    all_tokens = []
                    limit_reached_tokens = []
                    
                    for uid, toks in user_tokens_map.items():
                        status = check_and_consume_alert_quota(uid)
                        if status == "OK":
                            all_tokens.extend(toks)
                        elif status == "LIMIT_REACHED":
                            limit_reached_tokens.extend(toks)
                            
                    push_title = f"{prefix_title} {corp}"
                    summary_body = f"[{corp}] {report_title} 공시가 방금 올라왔습니다. 지금 바로 원문을 확인하고 대응하세요!"
                    
                    push_data = {
                        "type": "disclosure_alert",
                        "url": f"/stock/{raw_code}",
                        "dart_url": dart_link,
                        "symbol": raw_code
                    }
                    
                    if all_tokens:
                        send_multicast_notification(all_tokens, push_title, summary_body, data=push_data)
                        logger.info(f"[WhaleSiren] FCM Zero-Cost Push sent to {len(all_tokens)} devices for {corp}")
                        
                    if limit_reached_tokens:
                        send_multicast_notification(
                            limit_reached_tokens,
                            title="⚠️ 오늘 무료 프리미엄 알림(3회) 소진",
                            body="친구 1명만 초대하고 평생 무제한으로 1급 정보를 받아보세요!",
                            data={"type": "referral_invite", "url": "/referral"}
                        )
                        logger.info(f"[WhaleSiren] FCM Limit-Reached Push sent to {len(limit_reached_tokens)} devices")"""

if "limit_reached_tokens" not in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched scheduler.py")
