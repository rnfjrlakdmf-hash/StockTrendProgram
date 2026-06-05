import time
import requests
import yfinance as yf
from firebase_admin import firestore, messaging
from firebase_config import init_firebase_admin

ADMIN_EMAILS = {'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'}

# 상태 트래킹용 딕셔너리 (연속 에러 감지)
error_counters = {
    "yahoo_finance": 0,
    "fx_api": 0,
    "firebase_db": 0
}

def get_admin_fcm_tokens():
    """Firestore에서 관리자 이메일 계정의 FCM 토큰 수집"""
    init_firebase_admin()
    db = firestore.client()
    tokens = []
    
    try:
        users_ref = db.collection("users").stream()
        for doc in users_ref:
            data = doc.to_dict()
            if data.get("email", "").lower() in ADMIN_EMAILS:
                fcm_tokens = data.get("fcm_tokens", [])
                for t in fcm_tokens:
                    if isinstance(t, dict) and t.get("token"):
                        tokens.append(t["token"])
                    elif isinstance(t, str):
                        tokens.append(t)
    except Exception as e:
        print(f"[Watchdog-Error] Failed to fetch admin tokens: {e}")
        
    return list(set(tokens))

def send_admin_alert(module_name: str, error_msg: str):
    """관리자에게 긴급 푸시 알림 발송"""
    tokens = get_admin_fcm_tokens()
    if not tokens:
        print("[Watchdog-Warning] No admin tokens found to send alert.")
        return

    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title="🚨 [시스템 긴급 알림]",
            body=f"{module_name} 모듈에서 장애가 감지되었습니다.\n내용: {error_msg}"
        ),
        tokens=tokens
    )
    
    try:
        response = messaging.send_each_for_multicast(message)
        print(f"[Watchdog-Alert] Sent {response.success_count} alerts to admins for {module_name} error.")
    except Exception as e:
        print(f"[Watchdog-Error] Failed to send FCM alert: {e}")

def check_yahoo_finance():
    """Yahoo Finance API 헬스 체크"""
    try:
        data = yf.Ticker("AAPL").history(period="1d")
        if data.empty:
            raise ValueError("Empty data returned")
        error_counters["yahoo_finance"] = 0
    except Exception as e:
        error_counters["yahoo_finance"] += 1
        print(f"[Watchdog] Yahoo Finance Error: {e}")
        if error_counters["yahoo_finance"] == 2:
            send_admin_alert("Yahoo Finance API", str(e))

def check_fx_api():
    """Frankfurter 환율 API 헬스 체크"""
    try:
        res = requests.get("https://api.frankfurter.app/latest?from=USD&to=KRW", timeout=5)
        res.raise_for_status()
        error_counters["fx_api"] = 0
    except Exception as e:
        error_counters["fx_api"] += 1
        print(f"[Watchdog] FX API Error: {e}")
        if error_counters["fx_api"] == 2:
            send_admin_alert("환율(Frankfurter) API", str(e))

def check_firebase_db():
    """Firebase Firestore 연결 체크"""
    try:
        init_firebase_admin()
        db = firestore.client()
        # 간단히 서버 시간 가져오는 컬렉션 하나 찌르기
        list(db.collection("users").limit(1).stream())
        error_counters["firebase_db"] = 0
    except Exception as e:
        error_counters["firebase_db"] += 1
        print(f"[Watchdog] Firebase DB Error: {e}")
        if error_counters["firebase_db"] == 2:
            send_admin_alert("Firebase Database", str(e))

def run_health_checks():
    """모든 시스템 상태 검사 실행"""
    print("[Watchdog] Running system health checks...")
    check_firebase_db()
    check_yahoo_finance()
    check_fx_api()
    print(f"[Watchdog] Check complete. Current Error Counters: {error_counters}")
