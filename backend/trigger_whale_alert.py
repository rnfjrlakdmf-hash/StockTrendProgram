import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

# Firebase 초기화
if not firebase_admin._apps:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", os.path.join(script_dir, "firebase-adminsdk.json"))
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

db = firestore.client()

event_data = {
    "type": "WHALE_ALERT",
    "corp": "삼성전자",
    "title": "주식등의대량보유상황보고서 (약 2,000억원 규모 매수 포착)",
    "code": "005930",
    "url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240315000543",
    "timestamp": firestore.SERVER_TIMESTAMP
}

doc_ref = db.collection("live_events").add(event_data)
print(f"테스트 세력 포착 알림 전송 완료! ID: {doc_ref[1].id}")

# FCM 웹 푸시 알림 발송 (전체 사용자 대상)
try:
    from db_manager import get_all_fcm_tokens
    from firebase_config import send_multicast_notification
    
    tokens = get_all_fcm_tokens()
    if tokens:
        title = "🚨 [세력 포착 라이브] " + event_data["corp"]
        body = event_data["title"]
        data = {
            "type": "disclosure_alert", # click_url 처리를 위해 disclosure_alert 사용
            "url": event_data["url"],
            "dart_url": event_data["url"],
            "symbol": event_data["code"]
        }
        res = send_multicast_notification(tokens, title, body, data=data)
        print(f"FCM 푸시 전송 완료: {len(tokens)}명에게 발송 시도")
    else:
        print("FCM 토큰이 DB에 존재하지 않습니다.")
except Exception as e:
    print(f"FCM 푸시 전송 중 오류 발생: {e}")
