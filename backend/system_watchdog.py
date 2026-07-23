import time
import requests
import yfinance as yf
from firebase_admin import firestore, messaging
from firebase_config import initialize_firebase

ADMIN_EMAILS = {'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'}

# 상태 트래킹용 딕셔너리 (연속 에러 감지)
error_counters = {
    "yahoo_finance": 0,
    "fx_api": 0,
    "firebase_db": 0
}

# 오토 힐링 기능 활성화 플래그
AUTO_HEAL_ENABLED = False

def toggle_auto_heal():
    global AUTO_HEAL_ENABLED
    AUTO_HEAL_ENABLED = not AUTO_HEAL_ENABLED
    return AUTO_HEAL_ENABLED

# 스케줄러 하트비트 보관용 딕셔너리 (초 단위 타임스탬프)
scheduler_heartbeats = {}

def update_heartbeat(module_name: str):
    """각 스케줄러 봇이 자신이 살아있음을 신고 (1분마다 호출)"""
    scheduler_heartbeats[module_name] = time.time()

def get_admin_fcm_tokens():
    """Firestore에서 관리자 이메일 계정의 FCM 토큰 수집"""
    initialize_firebase()
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
        initialize_firebase()
        db = firestore.client()
        # 간단히 서버 시간 가져오는 컬렉션 하나 찌르기
        list(db.collection("users").limit(1).stream())
        error_counters["firebase_db"] = 0
    except Exception as e:
        error_counters["firebase_db"] += 1
        print(f"[Watchdog] Firebase DB Error: {e}")
        if error_counters["firebase_db"] == 2:
            send_admin_alert("Firebase Database", str(e))

def check_scheduler_heartbeats():
    """스케줄러 봇들의 생존 신고를 15분 타임아웃 기준으로 검사"""
    now = time.time()
    for module_name, last_beat in list(scheduler_heartbeats.items()):
        # 15분(900초) 이상 하트비트가 없으면 다운된 것으로 간주
        if now - last_beat > 900:
            print(f"[Watchdog] {module_name} 봇의 하트비트가 끊어졌습니다! (15분 초과)")
            
            if AUTO_HEAL_ENABLED:
                print(f"[Watchdog] 오토힐링 발동! {module_name} 봇 강제 부활 시도...")
                send_admin_alert(f"🤖 {module_name} 봇", f"15분 이상 응답이 없어 오토 힐링(자가치유)을 발동하여 봇을 강제 재가동 시킵니다!")
                
                # 순환 참조 방지를 위해 지연 임포트
                import scheduler
                import scheduler_service
                import asyncio
                import threading
                
                if module_name == "Auto_Blog_Bot":
                    asyncio.create_task(scheduler.auto_blog_scheduler_loop())
                elif module_name == "Hourly_Briefing":
                    asyncio.create_task(scheduler.hourly_briefing_scheduler_loop())
                elif module_name == "Disclosure_Monitor":
                    asyncio.create_task(scheduler.disclosure_scheduler_loop())
                elif module_name == "Main_Alert_Scheduler":
                    # 메인 알림 스케줄러는 일반 Thread 방식임
                    threading.Thread(target=scheduler_service.start_scheduler, daemon=True).start()
            else:
                send_admin_alert(f"🤖 {module_name} 스케줄러", "15분 이상 생존 신고(Heartbeat)가 없습니다. 루프가 다운(Crash)되었거나 멈췄습니다.")
            
            # 푸시 알림 폭탄을 막기 위해 하트비트 타임을 현재로 리셋 (15분 뒤 다시 검사)
            scheduler_heartbeats[module_name] = now

def run_health_checks():
    """모든 시스템 상태 검사 실행"""
    print("[Watchdog] Running system health checks...")
    check_firebase_db()
    check_yahoo_finance()
    check_fx_api()
    check_scheduler_heartbeats()
    print(f"[Watchdog] Check complete. Errors: {error_counters}, Heartbeats: {scheduler_heartbeats}")
