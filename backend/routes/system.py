from fastapi import APIRouter, Header, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import json
import time
from turbo_engine import turbo_engine

router = APIRouter()

# Health Check Endpoint - ULTRA Fast
@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": "v3.6.17-ULTRA-STABLE",
        "service": "AI Stock Analyst Backend - Zero-Wait Architecture"
    }

@router.get("/admin/nuke-placeholders")
def nuke_placeholders(view: bool = False):
    """[Admin] Force clear all stuck placeholders from SQLite or view them"""
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
def get_db_status():
    """[Admin] Check DB row count and path"""
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
def raw_db_check():
    """[Diagnostic] DB 내부의 실제 브리핑 데이터 상위 5개를 가공 없이 반환합니다."""
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
def clear_cache():
    """[Admin] Force clear all server-side cache"""
    turbo_engine.clear_cache()
    return {"status": "ok", "message": "Cache cleared successfully"}

@router.get("/admin/users")
def read_all_users():
    """[Admin] 모든 회원 목록 조회"""
    from db_manager import get_all_users
    users = get_all_users()
    return {"status": "success", "data": users}

class ProToggleRequest(BaseModel):
    user_id: str
    is_pro: bool

@router.post("/admin/users/pro")
def update_user_pro(req: ProToggleRequest):
    """[Admin] 회원 PRO 상태 변경"""
    from db_manager import toggle_user_pro_status
    success = toggle_user_pro_status(req.user_id, req.is_pro)
    if success:
        return {"status": "success", "message": f"User {req.user_id} PRO status updated."}
    else:
        return {"status": "error", "message": "Failed to update status."}

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
            return {"status": "success", "message": "푸시 알림이 활성화되었습니다."}
        else:
            return {"status": "error", "message": "토큰 등록 실패"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class FCMTestRequest(BaseModel):
    token: Optional[str] = None

@router.post("/fcm/test")
def test_fcm_notification(req: FCMTestRequest, x_user_id: str = Header(None)):
    """FCM 테스트 알림 발송"""
    # Lazy Imports
    from firebase_config import send_push_notification, send_multicast_notification
    from db_manager import get_user_fcm_tokens
    
    user_id = x_user_id if x_user_id else "guest"
    tokens = []
    if req.token:
        tokens = [req.token]
    else:
        user_tokens = get_user_fcm_tokens(user_id)
        tokens = [t['token'] for t in user_tokens]
    
    if not tokens:
        return {"status": "error", "message": "등록된 기기가 없습니다."}
        
    title = "[Test] Connection Verified"
    body = "System is working perfectly with Zero-Wait Architecture!"
    try:
        if len(tokens) == 1:
            result = send_push_notification(tokens[0], title, body)
        else:
            result = send_multicast_notification(tokens, title, body)
        return {"status": "success", "count": len(tokens), "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}
