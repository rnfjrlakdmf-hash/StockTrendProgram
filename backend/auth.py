from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
import time

router = APIRouter()

# Schema
class GoogleLoginRequest(BaseModel):
    id: str
    email: str
    name: str = "User"
    picture: str = ""

class UseTrialRequest(BaseModel):
    user_id: str

class UserSettingsRequest(BaseModel):
    user_id: str
    kis_app_key: str
    kis_secret: str
    kis_account: str

@router.post("/auth/google")
def google_login(req: GoogleLoginRequest, bg_tasks: BackgroundTasks):
    """
    Handle Google Login (or Simulation).
    In a real app, we would verify the ID Token here using google-auth library.
    Since we don't have keys, we trust the client (for this demo/personal use).
    """
    from db_manager import create_user_if_not_exists
    
    # 1. Create or Update User in DB (이 작업은 빠르므로 동기 처리)
    user_data = {
        "id": req.id,
        "email": req.email,
        "name": req.name,
        "picture": req.picture
    }
    
    success = create_user_if_not_exists(user_data)
    
    if not success:
        return {"status": "error", "message": "DB Error"}
    
    # [Optimize] 무거운 작업은 백그라운드(BackgroundTasks)로 돌려 즉시 응답 반환
    from db_manager import migrate_watchlist
    from utils.briefing_store import invalidate_today_briefing
    
    # 짐 싸기는 사용자 진입 후에 천천히 해도 됩니다!
    bg_tasks.add_task(migrate_watchlist, "guest", req.id)
    bg_tasks.add_task(invalidate_today_briefing, req.id)
    
    from db_manager import get_user
    real_user = get_user(req.id)
    
    if not real_user:
        # Fallback if fetch failed but create succeeded (unlikely)
        real_user = user_data

    return {
        "status": "success",
        "user": real_user,
        "token": f"mock_token_{req.id}_{int(time.time())}" # Simulation
    }

@router.post("/auth/use-trial")
def use_trial(req: UseTrialRequest):
    """
    1시간 무료 이용권 사용 API
    """
    new_count = decrement_free_trial(req.user_id)
    
    if new_count >= 0:
        return {"status": "success", "new_count": new_count}
    else:
        return {"status": "error", "message": "No trials left or user not found"}
@router.post("/auth/settings")
def update_settings(req: UserSettingsRequest):
    """
    Update User Settings (KIS Keys)
    """
    success = update_user_keys(req.user_id, req.kis_app_key, req.kis_secret, req.kis_account)
    if success:
        return {"status": "success", "message": "Settings updated"}
    else:
        return {"status": "error", "message": "Failed to update settings"}
