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

    # 1. 뉴스 알림 모니터 상태
    try:
        from news_alerts import news_alert_monitor
        result["news_monitor"] = {
            "ok": news_alert_monitor.running,
            "running": news_alert_monitor.running,
            "check_interval_sec": news_alert_monitor.check_interval,
            "tracked_symbols": len(news_alert_monitor.last_seen_articles),
            "sent_titles_count": sum(
                len(v) for v in news_alert_monitor.sent_titles.items()
            ) if news_alert_monitor.sent_titles else 0,
            "message": "✅ 뉴스 모니터 실행 중" if news_alert_monitor.running else "❌ 뉴스 모니터 중지됨!"
        }
    except Exception as e:
        result["news_monitor"] = {"ok": False, "error": str(e)}

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
            "message": f"실제 사용자 토큰 {valid_tokens}개 / 정리 필요한 guest 토큰 {guest_tokens}개"
        }
    except Exception as e:
        result["fcm_db"] = {"error": str(e)}

    return {"status": "success", "data": result}
