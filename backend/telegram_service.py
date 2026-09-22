import os
import requests
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_telegram_teaser(teaser_text: str, alert_type="system_alert", skip_db_save=False):
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
            
            # 중요 공지 및 스터디 알림일 경우 FCM 푸시 발송 연동 (푸시와 함께 1회만 저장)
            is_important_notice = (
                "스터디" in clean_text or 
                alert_type in ["theory_alert", "system_alert", "notice", "announcement"] or
                any(kw in title for kw in ["[공지]", "[안내]", "[업데이트]", "[점검]"])
            )
            
            if is_important_notice and not skip_db_save:
                try:
                    from firebase_config import send_multicast_notification
                    from db_manager import get_all_fcm_tokens
                    all_tokens = get_all_fcm_tokens()
                    target_alert_type = "theory_alert" if "스터디" in clean_text else alert_type
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
                # 일반 텔레그램 메시지이거나 이미 별도 푸시가 발송된 경우 알림센터 1회 저장
                if not skip_db_save:
                    save_alert_to_firestore(title=title, body=body, alert_type=alert_type, url=url_target)

        except Exception as fe:
            print(f"[Telegram-Firestore Sync Error] {fe}")

        return True
    except requests.exceptions.RequestException as e:
        print(f"[Telegram] Failed to send message: {e}")
        if e.response is not None:
            print(f"[Telegram] Error response: {e.response.text}")
        return False
