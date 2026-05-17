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

class FCMTestRequest(BaseModel):
    token: Optional[str] = None

@router.get("/fcm/simple-test")
def simple_fcm_test():
    return {"status": "success", "message": "Simple FCM Test OK"}

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
        return {"status": "error", "message": "등록된 FCM 토큰이 없습니다."}
        
    watchlist = get_watchlist(user_id)
    if not watchlist:
        return {"status": "error", "message": "관심종목이 없습니다."}
        
    # 첫 번째 종목만 테스트로 발송
    symbol = watchlist[0][0]
    try:
        await morning_briefing_service.analyze_and_send(user_id, tokens, symbol)
        return {"status": "success", "message": f"{symbol} 종목 브리핑 발송 완료", "user_id": user_id}
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
