"""
뉴스/공시 백그라운드 모니터 상태 진단 API
GET /api/system/notify-status
"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/system/notify-status")
def get_notify_status():
    """백그라운드 알림 서비스가 실제로 살아있는지 확인"""
    result = {}

    # 1. 뉴스 알림 모니터 상태 (구버전 + 신규 v7.0 배치 뉴스 시스템)
    try:
        from batch_news_system import batch_news_system
        is_batch_running = getattr(batch_news_system, "is_running", True)
        result["batch_news_system"] = {
            "ok": is_batch_running,
            "running": is_batch_running,
            "message": "✅ v7.0 배치 뉴스 시스템 정상 가동 중 (5분 주기)" if is_batch_running else "❌ 배치 뉴스 시스템 중지됨"
        }
    except Exception as e:
        result["batch_news_system"] = {"ok": False, "error": str(e)}

    # 2. 가격 알림 모니터 상태
    try:
        from price_alerts import price_alert_monitor
        result["price_monitor"] = {
            "ok": price_alert_monitor.running,
            "running": price_alert_monitor.running,
            "message": "✅ 가격 모니터 실행 중" if price_alert_monitor.running else "❌ 가격 모니터 중지됨!"
        }
    except Exception as e:
        result["price_monitor"] = {"ok": False, "error": str(e)}

    # 3. FCM 전체 발송 가능 토큰 수
    try:
        from db_manager import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM fcm_tokens WHERE user_id != 'guest'")
        valid_tokens = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM fcm_tokens WHERE user_id = 'guest'")
        guest_tokens = c.fetchone()[0]
        conn.close()
        result["fcm_db"] = {
            "valid_user_tokens": valid_tokens,
            "stale_guest_tokens": guest_tokens,
            "message": f"실제 사용자 토큰 {valid_tokens}개 / 게스트 토큰 {guest_tokens}개"
        }
    except Exception as e:
        result["fcm_db"] = {"error": str(e)}

    return {"status": "success", "data": result}

@router.post("/system/test-fcm")
def send_test_fcm():
    """모든 등록된 기기로 즉시 테스트 FCM 푸시 알림 발송"""
    try:
        from db_manager import get_db_connection
        from firebase_config import send_multicast_notification, initialize_firebase
        initialize_firebase()
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT token, user_id FROM fcm_tokens WHERE user_id != 'guest'")
        rows = c.fetchall()
        conn.close()

        tokens = [r[0] for r in rows]
        user_ids = list(set(r[1] for r in rows))

        if not tokens:
            return {"status": "error", "message": "등록된 FCM 토큰이 없습니다."}

        res = send_multicast_notification(
            tokens=tokens,
            title="🔔 [테스트] 스마트 투자 비서 알림 정상 수신",
            body="FCM 푸시 알림 엔진이 완벽하게 연결되었습니다! 앞으로 실시간 시그널과 브리핑이 정상 도착합니다.",
            data={"type": "test_alert", "url": "/alerts"},
            target_users=user_ids
        )

        return {
            "status": "success",
            "sent_to_tokens": len(tokens),
            "result": res
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
