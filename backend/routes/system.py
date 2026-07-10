from fastapi import APIRouter, Header, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import time
from turbo_engine import turbo_engine

router = APIRouter()

def check_admin_auth(x_admin_key: Optional[str] = None, secret: Optional[str] = None):
    admin_key = os.environ.get("ADMIN_SECRET_KEY", "StockTrendSecretAdmin2026!")
    if (x_admin_key or secret) != admin_key:
        raise HTTPException(status_code=403, detail="Unauthorized admin access.")

# Health Check Endpoint - ULTRA Fast
@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": "v3.6.17-ULTRA-STABLE",
        "service": "AI Stock Analyst Backend - Zero-Wait Architecture"
    }

class FCMTokenPayload(BaseModel):
    token: str
    user_id: str
    source: Optional[str] = None

@router.post("/fcm-token")
def register_fcm_token(payload: FCMTokenPayload):
    try:
        from firebase_admin import firestore
        db = firestore.client()
        db.collection("users").document(payload.user_id).set({
            "fcmToken": payload.token,
            "lastTokenUpdate": firestore.SERVER_TIMESTAMP,
            "push_enabled": True
        }, merge=True)
        return {"status": "ok", "message": "Token registered"}
    except Exception as e:
        print(f"Error saving FCM token: {e}")
        return {"status": "error", "message": str(e)}
@router.get("/logs")
def get_logs(limit: int = 100):
    try:
        from db_manager import get_system_logs
        logs = get_system_logs(limit)
        return {"status": "success", "data": logs}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/status")
def get_system_status():
    """컴포넌트 호환성을 위한 시스템 및 인덱싱 상태 반환"""
    try:
        from background_indexer import background_indexer
        status = background_indexer.get_status()
        return {
            "status": "success",
            "data": {
                "indexing": status,
                "uptime": time.time()
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/admin/nuke-placeholders")
def nuke_placeholders(view: bool = False, x_admin_key: Optional[str] = Header(None), secret: Optional[str] = Query(None)):
    """[Admin] Force clear all stuck placeholders from SQLite or view them"""
    check_admin_auth(x_admin_key, secret)
    from utils.briefing_store import get_db
    import json
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        if view:
            cursor.execute("SELECT briefing_json, created_at FROM morning_briefings WHERE user_id = 'SYSTEM' AND briefing_json LIKE '%시장 데이터 수집 중%'")
            rows = cursor.fetchall()
            conn.close()
            placeholders = []
            for r in rows:
                try:
                    placeholders.append({"created_at": r[1], "json": json.loads(r[0])})
                except:
                    placeholders.append({"created_at": r[1], "json": r[0]})
            return {"status": "ok", "count": len(placeholders), "data": placeholders}
            
        cursor.execute("DELETE FROM morning_briefings WHERE user_id = 'SYSTEM' AND briefing_json LIKE '%시장 데이터 수집 중%'")
        count = cursor.rowcount
        conn.commit()
        return {"status": "ok", "message": f"Nuked {count} placeholders!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/admin/db-status")
def get_db_status(x_admin_key: Optional[str] = Header(None), secret: Optional[str] = Query(None)):
    """[Admin] Check DB row count and path"""
    check_admin_auth(x_admin_key, secret)
    from db_manager import DB_FILE, get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM morning_briefings")
        count = cursor.fetchone()[0]
        
        cursor.execute("SELECT user_id, COUNT(*) FROM morning_briefings GROUP BY user_id")
        group_stats = {row[0]: row[1] for row in cursor.fetchall()}
        
        cursor.execute("SELECT MAX(created_at) FROM morning_briefings")
        last_date = cursor.fetchone()[0]
        
        cursor.execute("SELECT journal_mode FROM pragma_journal_mode")
        mode = cursor.fetchone()[0]
        
        conn.close()
        return {
            "status": "ok",
            "db_path": DB_FILE,
            "journal_mode": mode,
            "total_rows": count,
            "group_stats": group_stats,
            "last_entry_at": last_date,
            "file_exists": os.path.exists(DB_FILE)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/admin/raw-check")
def raw_db_check(x_admin_key: Optional[str] = Header(None), secret: Optional[str] = Query(None)):
    """[Diagnostic] DB 내부의 실제 브리핑 데이터 상위 5개를 가공 없이 반환합니다."""
    check_admin_auth(x_admin_key, secret)
    from db_manager import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, user_id, 
                   strftime('%Y-%m-%d %H:%M:%S', datetime(created_at, '+9 hours')) as kst_time,
                   substr(briefing_json, 1, 100) as snippet 
            FROM morning_briefings 
            ORDER BY created_at DESC LIMIT 5
        """)
        rows = cursor.fetchall()
        conn.close()
        return {
            "status": "success",
            "data": [{"id": r[0], "user_id": r[1], "kst_time": r[2], "snippet": r[3]} for r in rows]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/admin/clear-cache")
def clear_cache(x_admin_key: Optional[str] = Header(None), secret: Optional[str] = Query(None)):
    """[Admin] Force clear all server-side cache"""
    check_admin_auth(x_admin_key, secret)
    turbo_engine.clear_cache()
    return {"status": "ok", "message": "Cache cleared successfully"}

@router.get("/admin/users")
def read_all_users(x_admin_key: Optional[str] = Header(None), secret: Optional[str] = Query(None)):
    """[Admin] 모든 회원 목록 조회"""
    check_admin_auth(x_admin_key, secret)
    from db_manager import get_all_users
    users = get_all_users()
    return {"status": "success", "data": users}

class ProToggleRequest(BaseModel):
    user_id: str
    is_pro: bool

@router.post("/admin/users/pro")
def update_user_pro(req: ProToggleRequest, x_admin_key: Optional[str] = Header(None), secret: Optional[str] = Query(None)):
    """[Admin] 회원 PRO 상태 변경"""
    check_admin_auth(x_admin_key, secret)
    from db_manager import toggle_user_pro_status
    success = toggle_user_pro_status(req.user_id, req.is_pro)
    if success:
        return {"status": "success", "message": f"User {req.user_id} PRO status updated."}
    else:
        return {"status": "error", "message": "Failed to update status."}

@router.post("/auth/use-ticket")
def use_free_ticket_route(x_user_id: str = Header(None)):
    """[User] 1시간 무료 이용권 사용"""
    if not x_user_id:
        return {"status": "error", "message": "로그인이 필요합니다."}
        
    from db_manager import get_user, decrement_free_trial
    
    # 1. Check if user exists
    user = get_user(x_user_id)
    if not user:
        return {"status": "error", "message": "존재하지 않는 회원입니다."}
        
    # 2. Check if already PRO
    if user.get("is_pro") and user.get("pro_expires_at") is None:
        return {"status": "error", "message": "이미 무제한 PRO 계정입니다!"}
        
    # 3. Decrement ticket
    new_count = decrement_free_trial(x_user_id)
    if new_count >= 0:
        return {"status": "success", "message": "1시간 이용권이 적용되었습니다!", "remaining": new_count}
    else:
        return {"status": "error", "message": "무료 이용권이 부족합니다."}

class FCMTokenRequest(BaseModel):
    token: str
    device_type: str = 'web'
    device_name: str = None

@router.post("/fcm/register")
def register_fcm_token(req: FCMTokenRequest, x_user_id: str = Header(None)):
    """FCM 토큰 등록"""
    from db_manager import save_fcm_token
    user_id = x_user_id if x_user_id else "guest"
    try:
        success = save_fcm_token(user_id, req.token, req.device_type, req.device_name)
        if success:
            return {"status": "success", "message": "푸시 알림이 활성화되었습니다.", "user_id": user_id}
        else:
            return {"status": "error", "message": "토큰 등록 실패", "user_id": user_id}
    except Exception as e:
        return {"status": "error", "message": str(e), "user_id": user_id}

@router.get("/fcm/preferences")
def get_preferences(token: str = None, user_id: str = None, x_user_id: str = Header(None)):
    from db_manager import get_fcm_preferences, get_user_fcm_preferences_by_user_id
    
    # user_id 기반으로 우선 조회 (기기 간 통합 설정)
    resolved_user_id = user_id or x_user_id
    if resolved_user_id and resolved_user_id != "guest":
        prefs = get_user_fcm_preferences_by_user_id(resolved_user_id)
        if prefs:
            return {"status": "success", "data": prefs}
    
    # 토큰 기반 조회 (fallback)
    if token:
        prefs = get_fcm_preferences(token)
        if prefs:
            return {"status": "success", "data": prefs}
    
    # 기본값 반환
    return {"status": "success", "data": {
        "pref_morning": True,
        "pref_closing": True,
        "pref_price": True,
        "pref_news": True,
        "pref_watch_compact": False,
        "pref_ipo": True,
        "pref_dividend": True,
        "pref_whale_alert": True,
        "pref_insider_alert": True,
        "pref_watchlist_live": True,
        "user_id": resolved_user_id or "guest"
    }}

class FCMPreferencesRequest(BaseModel):
    token: str
    pref_morning: bool = True
    pref_closing: bool = True
    pref_price: bool = True
    pref_news: bool = True
    pref_watch_compact: bool = False  
    pref_ipo: bool = True
    pref_dividend: bool = True
    pref_whale_alert: bool = True
    pref_insider_alert: bool = True
    pref_watchlist_live: bool = True

@router.post("/fcm/preferences")
def update_preferences(req: FCMPreferencesRequest, x_user_id: str = Header(None)):
    from db_manager import update_fcm_preferences, get_fcm_preferences, save_fcm_token, update_all_user_fcm_preferences
    
    user_id = x_user_id if x_user_id else "guest"
    prefs_dict = {
        "pref_morning": req.pref_morning,
        "pref_closing": req.pref_closing,
        "pref_price": req.pref_price,
        "pref_news": req.pref_news,
        "pref_watch_compact": req.pref_watch_compact,
        "pref_ipo": req.pref_ipo,
        "pref_dividend": req.pref_dividend,
        "pref_whale_alert": req.pref_whale_alert,
        "pref_insider_alert": req.pref_insider_alert,
        "pref_watchlist_live": req.pref_watchlist_live
    }
    
    # user_id가 있으면 해당 유저의 모든 토큰에 동시 저장 (기기 간 동기화)
    if user_id and user_id != "guest":
        update_all_user_fcm_preferences(user_id, prefs_dict)
    
    # 현재 토큰에도 저장 (Auto-recover 포함)
    existing = get_fcm_preferences(req.token)
    if not existing:
        save_fcm_token(user_id, req.token, "web", "auto-recovered")
        
    success = update_fcm_preferences(req.token, prefs_dict)
    if success:
        return {"status": "success", "message": "Preferences updated"}
    return {"status": "error", "message": "Update failed"}

class FCMTestRequest(BaseModel):
    token: Optional[str] = None

@router.get("/fcm/simple-test")
def simple_fcm_test():
    return {"status": "success", "message": "Simple FCM Test OK"}

@router.get("/fcm/news-test")
def trigger_news_test(x_user_id: str = Header(None), user_id_param: str = Query(None, alias="user_id")):
    """라이브 서버에서 뉴스 속보 테스트를 강제로 발송하는 엔드포인트"""
    if user_id_param:
        x_user_id = user_id_param
    user_id = x_user_id or "guest"
    
    from firebase_config import send_multicast_notification
    from db_manager import get_user_fcm_tokens, get_db_connection
    
    tokens = []
    if user_id == "all":
        # 모든 유저에게 발송 (테스트용)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT token FROM fcm_tokens WHERE token IS NOT NULL")
        rows = cursor.fetchall()
        conn.close()
        tokens = [r[0] for r in rows]
    else:
        tokens_data = get_user_fcm_tokens(user_id)
        tokens = [t['token'] for t in tokens_data if t.get('token')]
    
    if not tokens:
        return {"status": "error", "message": f"토큰이 없습니다. 앱/웹에서 푸시 권한을 허용해주세요. (user_id: {user_id})"}
        
    res = send_multicast_notification(
        tokens=tokens,
        title='📰 삼성전자 뉴스 속보',
        body='단독 어닝 서프라이즈 발표 🏢 한국경제',
        data={
            'type': 'news_alert',
            'symbol': '005930',
            'url': '/discovery?q=005930',
            'news_url': 'https://finance.naver.com',
            'is_global': 'false'
        }
    )
    return {"status": "success", "message": "테스트 뉴스 속보 발송 완료!", "result": res}

@router.get("/fcm/diagnose")
def diagnose_fcm(x_user_id: str = Header(None), user_id_param: str = Query(None, alias="user_id")):
    # URL ?user_id=xxx 로도 접근 가능하게
    if user_id_param:
        x_user_id = user_id_param
    """
    [진단] FCM 알림 파이프라인 전체를 한 번에 점검합니다.
    - DB에 FCM 토큰이 있는지
    - 관심종목이 있는지
    - watchlist <-> fcm_tokens 조인이 성공하는지
    - Firebase Admin SDK가 초기화됐는지
    """
    import firebase_admin
    from db_manager import get_db_connection

    user_id = x_user_id if x_user_id else "guest"
    result = {
        "user_id": user_id,
        "steps": {}
    }

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Step 1: FCM 토큰 확인
        c.execute("SELECT user_id, token, device_type, last_used FROM fcm_tokens WHERE user_id = ? ORDER BY last_used DESC LIMIT 5", (user_id,))
        token_rows = c.fetchall()
        result["steps"]["1_fcm_tokens"] = {
            "ok": len(token_rows) > 0,
            "count": len(token_rows),
            "tokens": [{"user_id": r[0], "token": r[1][:20] + "...", "device": r[2], "last_used": r[3]} for r in token_rows]
        }

        # Step 2: 관심종목 확인
        c.execute("SELECT symbol FROM watchlist WHERE user_id = ?", (user_id,))
        watchlist_rows = c.fetchall()
        result["steps"]["2_watchlist"] = {
            "ok": len(watchlist_rows) > 0,
            "count": len(watchlist_rows),
            "symbols": [r[0] for r in watchlist_rows]
        }

        # Step 3: 관심종목 + FCM 토큰 조인 확인 (news_alerts.py가 실제로 하는 쿼리)
        c.execute("""
            SELECT DISTINCT w.user_id, w.symbol 
            FROM watchlist w
            JOIN fcm_tokens f ON w.user_id = f.user_id
            WHERE w.user_id = ?
        """, (user_id,))
        join_rows = c.fetchall()
        result["steps"]["3_join_watchlist_fcm"] = {
            "ok": len(join_rows) > 0,
            "count": len(join_rows),
            "message": "OK - 알림 대상 종목이 확인됨" if join_rows else "FAIL - watchlist와 fcm_tokens의 user_id가 연결되지 않음!",
            "rows": [{"user_id": r[0], "symbol": r[1]} for r in join_rows]
        }

        # Step 4: 전체 FCM 토큰 수 (다른 user_id로 저장됐는지 확인)
        c.execute("SELECT user_id, COUNT(*) as cnt FROM fcm_tokens GROUP BY user_id")
        all_token_users = c.fetchall()
        result["steps"]["4_all_token_users"] = {
            "users": [{"user_id": r[0], "token_count": r[1]} for r in all_token_users]
        }

        conn.close()
    except Exception as e:
        result["steps"]["db_error"] = str(e)

    # Step 5: Firebase Admin SDK 초기화 상태
    try:
        fb_initialized = bool(firebase_admin._apps)
        result["steps"]["5_firebase_sdk"] = {
            "ok": fb_initialized,
            "message": "Firebase Admin SDK 초기화 완료" if fb_initialized else "FAIL - Firebase 미초기화! FIREBASE_CREDENTIALS 환경변수 또는 firebase-adminsdk.json 파일 확인 필요"
        }
    except Exception as e:
        result["steps"]["5_firebase_sdk"] = {"ok": False, "error": str(e)}

    # Step 6: pref_news 설정 확인
    try:
        from db_manager import get_user_fcm_tokens
        tokens_data = get_user_fcm_tokens(user_id)
        news_disabled = [t for t in tokens_data if not t.get("pref_news", True)]
        result["steps"]["6_pref_news"] = {
            "ok": len(news_disabled) == 0,
            "total_tokens": len(tokens_data),
            "news_disabled_count": len(news_disabled),
            "message": "뉴스 알림 허용됨" if len(news_disabled) == 0 else f"WARN - {len(news_disabled)}개 기기에서 뉴스 알림이 꺼져 있음!"
        }
    except Exception as e:
        result["steps"]["6_pref_news"] = {"ok": False, "error": str(e)}

    # 최종 판정
    all_ok = all(
        result["steps"].get(k, {}).get("ok", True)
        for k in ["1_fcm_tokens", "2_watchlist", "3_join_watchlist_fcm", "5_firebase_sdk"]
    )
    result["overall"] = "✅ 모든 항목 정상" if all_ok else "❌ 문제 발견 - steps 항목 확인 필요"

    return {"status": "success", "data": result}

@router.get("/fcm/test")
@router.post("/fcm/test")
def test_fcm_notification(x_user_id: str = Header(None)):
    """FCM 테스트 알림 발송 (GET/POST 모두 허용하여 405 에러 방지)"""
    # Lazy Imports
    from firebase_config import send_push_notification, send_multicast_notification
    from db_manager import get_user_fcm_tokens
    
    user_id = x_user_id if x_user_id else "guest"
    user_tokens = get_user_fcm_tokens(user_id)
    tokens = [t['token'] for t in user_tokens]
    
    if not tokens:
        return {"status": "error", "message": f"등록된 기기가 없습니다. (ID: {user_id})"}
        
    title = "[Test] Connection Verified"
    body = f"System is working perfectly for user {user_id}!"
    try:
        if len(tokens) == 1:
            result = send_push_notification(tokens[0], title, body)
        else:
            result = send_multicast_notification(tokens, title, body)
        return {"status": "success", "count": len(tokens), "user_id": user_id, "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e), "user_id": user_id}

@router.get("/fcm/morning-test")
async def manual_morning_briefing_test(x_user_id: str = Header(None)):
    """[Test] 현재 유저의 관심종목에 대해 호재/악재 브리핑을 강제로 발송합니다."""
    from morning_briefing import morning_briefing_service
    from db_manager import get_user_fcm_tokens, get_watchlist
    
    user_id = x_user_id if x_user_id else "guest"
    tokens_data = get_user_fcm_tokens(user_id)
    tokens = [t['token'] for t in tokens_data]
    
    if not tokens:
        return {"status": "error", "message": f"등록된 기기가 없습니다. (ID: {user_id})"}
        
    try:
        from morning_briefing import format_morning_briefing_message
        from firebase_config import send_multicast_notification
        
        # Test sending directly from the app environment
        result = send_multicast_notification(
            tokens=tokens,
            title=f"🐳 [강제 테스트] 내부 API에서 발송!",
            body="이 알림이 뜬다면 서버 스크립트 실행 환경의 문제입니다.",
            data={
                "type": "disclosure_alert",
                "url": "/stock/AAPL",
                "symbol": "AAPL"
            }
        )
        return {"status": "success", "count": len(tokens), "user_id": user_id, "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}
@router.get("/fcm/delayed-test")
async def delayed_fcm_test(x_user_id: str = Header(None)):
    """[Test] 10초 뒤에 테스트 알림을 발송하여 앱 종료 후 수신 여부를 확인합니다."""
    import asyncio
    from firebase_config import send_multicast_notification
    from db_manager import get_user_fcm_tokens
    
    user_id = x_user_id if x_user_id else "guest"
    tokens_data = get_user_fcm_tokens(user_id)
    tokens = [t['token'] for t in tokens_data]
    
    if not tokens:
        return {"status": "error", "message": "등록된 기기가 없습니다."}
        
    # 10초 대기 (유저가 앱을 끌 시간을 줌)
    async def _send_later():
        await asyncio.sleep(10)
        send_multicast_notification(
            tokens=tokens,
            title="⏰ 10초 지연 알림 성공!",
            body="웹을 끈 상태에서도 알림이 정상적으로 도착했습니다.",
            data={"type": "test_delayed"}
        )
        print(f"[Test] Delayed push sent to {user_id}")

    # 백그라운드 태스크로 실행하고 응답은 즉시 반환
    asyncio.create_task(_send_later())
    
    return {"status": "success", "message": "10초 뒤에 알림이 발송됩니다. 지금 바로 웹을 종료해 보세요!"}

class AnalyticsPingRequest(BaseModel):
    visitor_id: str
    is_pageview: bool = True

@router.post("/analytics/ping")
def ping_analytics(req: AnalyticsPingRequest):
    """실시간 접속 핑 및 페이지뷰 기록"""
    from db_manager import record_pageview, ping_active_user
    
    visitor_id = req.visitor_id.strip() if req.visitor_id else "unknown_visitor"
    
    # 1. 실시간 동시 접속 활성화 갱신
    ping_active_user(visitor_id)
    
    # 2. 페이지뷰 기록 (최초 진입 시 True)
    if req.is_pageview:
        record_pageview(visitor_id)
        
    return {"status": "success"}

@router.get("/analytics/stats")
def get_analytics_stats(limit: int = 30, x_admin_key: Optional[str] = Header(None), secret: Optional[str] = Query(None)):
    """[Admin] 일일 방문자수 및 실시간 동시 접속자 통계"""
    check_admin_auth(x_admin_key, secret)
    from db_manager import get_site_analytics, get_realtime_active_count
    
    stats = get_site_analytics(limit)
    active_count = get_realtime_active_count(minutes=5)
    
    return {
        "status": "success",
        "data": {
            "active_users_5m": active_count,
            "daily_stats": stats
        }
    }

@router.get("/admin/hourly-analytics")
def get_admin_hourly_analytics(limit: int = 48, x_admin_key: Optional[str] = Header(None), secret: Optional[str] = Query(None)):
    """[Admin] 시간대별 트래픽 통계"""
    check_admin_auth(x_admin_key, secret)
    from db_manager import get_hourly_analytics
    
    stats = get_hourly_analytics(limit)
    return {
        "status": "success",
        "data": stats
    }

@router.post("/admin/send-daily-report")
@router.get("/admin/send-daily-report")
def trigger_daily_report(x_admin_key: Optional[str] = Header(None), secret: Optional[str] = Query(None)):
    """[Admin] 즉시 일일 보고서 푸시 알림 발송 테스트"""
    check_admin_auth(x_admin_key, secret)
    from scheduler_service import send_daily_analytics_report
    try:
        sent_count = send_daily_analytics_report()
        return {
            "status": "success", 
            "message": f"일일 보고서가 수신인 기기 {sent_count}개로 성공적으로 발송되었습니다!"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/fcm/cleanup-tokens")
@router.get("/fcm/cleanup-tokens")
def cleanup_stale_tokens():
    """
    [자동 정리] 불필요한 FCM 토큰 정리
    - guest 토큰 전체 삭제
    - 30일 이상 미사용 토큰 삭제
    """
    from db_manager import get_db_connection
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # 1. guest 토큰 삭제
        c.execute("DELETE FROM fcm_tokens WHERE user_id = 'guest'")
        guest_deleted = c.rowcount

        # 2. 30일 이상 미사용 토큰 삭제
        c.execute("""
            DELETE FROM fcm_tokens 
            WHERE last_used < datetime('now', '-30 days')
            AND user_id != 'guest'
        """)
        stale_deleted = c.rowcount

        conn.commit()
        conn.close()

        return {
            "status": "success",
            "message": f"정리 완료: guest 토큰 {guest_deleted}개 삭제, 30일 미사용 토큰 {stale_deleted}개 삭제"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

