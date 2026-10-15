import os
import requests
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram_teaser(teaser_text: str, alert_type="system_alert", skip_db_save=False):
    """
    텔레그램 채널로 메시지(티저)를 발송하고, 설정에 따라 FCM 푸시 및 알림센터를 안전하게 동기화합니다.
    텔레그램 전송 실패나 토큰 만료가 발생하더라도 웹앱 알림 및 FCM 푸시는 100% 독립 실행을 보장합니다.
    """
    tg_sent = False
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": teaser_text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            print("[Telegram] Successfully sent teaser message.")
            tg_sent = True
        except requests.exceptions.RequestException as e:
            print(f"[Telegram] Failed to send message (토큰/네트워크 오류, 계속 진행): {e}")
            if getattr(e, 'response', None) is not None:
                print(f"[Telegram] Error response: {e.response.text}")
    else:
        print("[Telegram] Token or Chat ID is missing. Skipping telegram alert.")

    # [핵심] 텔레그램 성공/실패와 100% 무관하게 웹앱 알림 센터 및 FCM 푸시를 독립 실행!
    if not skip_db_save:
        try:
            from firebase_config import save_alert_to_firestore, initialize_firebase
            initialize_firebase()
            
            import re
            url_target = "/"
            link_match = re.search(r"href=['\"](.*?)['\"]", teaser_text)
            if link_match:
                url_target = link_match.group(1)
                
            clean_text = re.sub(r'<br\s*/?>', '\n', teaser_text)
            clean_text = re.sub(r'<[^>]+>', '', clean_text)
            
            lines = clean_text.strip().split('\n')
            title = lines[0] if lines else "📢 시스템 알림"
            body = "\n".join([l.strip() for l in lines[1:] if l.strip() and not l.strip().startswith("👉")]).strip() if len(lines) > 1 else clean_text
            
            is_important_notice = (
                "스터디" in clean_text or 
                "1타 강사" in clean_text or
                "차트" in clean_text or
                alert_type in ["theory_alert", "system_alert", "notice", "announcement"] or
                any(kw in title for kw in ["[공지]", "[안내]", "[업데이트]", "[점검]"])
            )
            
            if is_important_notice:
                try:
                    from firebase_config import send_multicast_notification
                    from db_manager import get_all_fcm_tokens
                    all_tokens = get_all_fcm_tokens()
                    target_alert_type = "theory_alert" if ("스터디" in clean_text or "1타 강사" in clean_text or alert_type == "theory_alert") else alert_type
                    if all_tokens:
                        push_data = {
                            "type": target_alert_type,
                            "url": url_target
                        }
                        send_multicast_notification(all_tokens, title, body, push_data, skip_db_save=False)
                        print(f"[Telegram-FCM Sync] 중요 공지/스터디 푸시 {len(all_tokens)}명 발송 성공 (DB 1회 저장 완료)")
                    else:
                        save_alert_to_firestore(title=title, body=body, alert_type=target_alert_type, url=url_target)
                except Exception as push_e:
                    print(f"[Telegram-FCM Sync] 공지 푸시 에러: {push_e}")
                    save_alert_to_firestore(title=title, body=body, alert_type=alert_type, url=url_target)
            else:
                save_alert_to_firestore(title=title, body=body, alert_type=alert_type, url=url_target)
        except Exception as fe:
            print(f"[Telegram-Firestore Sync Error] {fe}")

    return tg_sent

