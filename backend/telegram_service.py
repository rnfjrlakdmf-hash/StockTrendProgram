import os
import requests
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram_teaser(teaser_text: str, alert_type="system_alert"):
    """
    텔레그램 채널로 메시지(티저)를 발송합니다.
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Telegram] Token or Chat ID is missing. Skipping telegram alert.")
        return False

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

        try:
            # 웹앱 알림 센터 연동 (시스템 알림으로 글로벌 발송)
            from firebase_config import save_alert_to_firestore, initialize_firebase
            initialize_firebase()
            
            # HTML 태그 제거 (간단하게 <br> -> \n 변환 후 텍스트만)
            import re
            
            # URL 추출 (있다면)
            url_target = "/"
            link_match = re.search(r"href=['\"](.*?)['\"]", teaser_text)
            if link_match:
                url_target = link_match.group(1)
                
            clean_text = re.sub(r'<br\s*/?>', '\n', teaser_text)
            clean_text = re.sub(r'<[^>]+>', '', clean_text)
            
            # 텔레그램 공지 제목 추출 (첫 번째 줄)
            lines = clean_text.strip().split('\n')
            title = lines[0] if lines else "📢 텔레그램 알림"
            body = "\n".join(lines[1:]).strip() if len(lines) > 1 else clean_text
            
            save_alert_to_firestore(title=title, body=body, alert_type=alert_type, url=url_target)

            # 스터디 관련 공지일 경우 FCM 푸시 발송 연동
            if "스터디" in clean_text:
                try:
                    from firebase_config import send_multicast_notification
                    from db_manager import get_all_fcm_tokens
                    all_tokens = get_all_fcm_tokens()
                    if all_tokens:
                        push_data = {
                            "type": "system_alert",
                            "url": url_target,
                            "skip_db_save": True
                        }
                        send_multicast_notification(all_tokens, title, body, push_data)
                        print(f"[Telegram-FCM Sync] 스터디 공지 푸시 {len(all_tokens)}명 발송 성공")
                except Exception as push_e:
                    print(f"[Telegram-FCM Sync] 스터디 공지 푸시 에러: {push_e}")

        except Exception as fe:
            print(f"[Telegram-Firestore Sync Error] {fe}")

        return True
    except requests.exceptions.RequestException as e:
        print(f"[Telegram] Failed to send message: {e}")
        if e.response is not None:
            print(f"[Telegram] Error response: {e.response.text}")
        return False
