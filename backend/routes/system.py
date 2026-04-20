from fastapi import APIRouter, Header, Query
from pydantic import BaseModel
from typing import Optional
from turbo_engine import turbo_engine

router = APIRouter()

# Health Check Endpoint
@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": "v3.6.17-ULTRA",
        "service": "AI Stock Analyst Backend - Modular Optimized"
    }

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
    title = "🔔 [Test] Connection Verified"
    body = "System is working perfectly!"
    try:
        if len(tokens) == 1:
            result = send_push_notification(tokens[0], title, body)
        else:
            result = send_multicast_notification(tokens, title, body)
        return {"status": "success", "count": len(tokens), "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}
