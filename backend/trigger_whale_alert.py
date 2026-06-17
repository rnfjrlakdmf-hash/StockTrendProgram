import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

# Firebase 초기화
if not firebase_admin._apps:
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "firebase-adminsdk.json")
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
    "timestamp": firestore.SERVER_TIMESTAMP
}

doc_ref = db.collection("live_events").add(event_data)
print(f"테스트 세력 포착 알림 전송 완료! ID: {doc_ref[1].id}")
