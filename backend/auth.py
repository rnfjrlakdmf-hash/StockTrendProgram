from fastapi import APIRouter, Header, Query, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
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

@router.post("/google")
def google_login(req: GoogleLoginRequest, bg_tasks: BackgroundTasks):
    """
    Handle Google Login with Extreme Resilience (Zero-Wait).
    Even if DB fails, we return success to allow the user into the dashboard.
    """
    # [Lazy Imports]
    from db_manager import create_user_if_not_exists, get_user, migrate_watchlist
    from utils.briefing_store import invalidate_today_briefing
    
    user_data = {
        "id": req.id,
        "email": req.email,
        "name": req.name,
        "picture": req.picture
    }

    # 1. Try to save/update user in DB
    db_success = False
    try:
        db_success = create_user_if_not_exists(user_data)
    except Exception as e:
        print(f"[Critical Auth Error] DB Save Failed, Proceeding in Ghost Mode: {e}")

    # 2. Even if DB failed, we will NOT block the user.
    # We will try to fetch the real user data if DB success, otherwise fallback to provided data.
    real_user = None
    if db_success:
        try:
            real_user = get_user(req.id)
        except: pass
    
    if not real_user:
        # Fallback: Just use Google Info if DB is being stubborn
        real_user = {
            "id": req.id,
            "email": req.email,
            "name": req.name,
            "picture": req.picture,
            "is_pro": True, # Give them Pro benefits in Ghost mode as an apology
            "free_trial_count": 2
        }
    
    # 3. Background tasks (Fire-and-forget for speed)
    bg_tasks.add_task(migrate_watchlist, "guest", req.id)
    bg_tasks.add_task(invalidate_today_briefing, req.id)
    
    return {
        "status": "success",
        "user": real_user,
        "token": f"token_{req.id}_{int(time.time())}"
    }

@router.post("/use-trial")
def use_trial(req: UseTrialRequest):
    """1시간 무료 이용권 사용 API"""
    try:
        from db_manager import decrement_free_trial
        new_count = decrement_free_trial(req.user_id)
        if new_count >= 0:
            return {"status": "success", "new_count": new_count}
    except: pass
    return {"status": "error", "message": "Trial update failed"}

@router.post("/settings")
def update_settings(req: UserSettingsRequest):
    """Update User Settings (KIS Keys)"""
    try:
        from db_manager import update_user_keys
        success = update_user_keys(req.user_id, req.kis_app_key, req.kis_secret, req.kis_account)
        if success:
            return {"status": "success", "message": "Settings updated"}
    except: pass
    return {"status": "error", "message": "Settings update failed"}
@router.get("/telegram/recent-users")
def get_recent_telegram_users_api():
    """텔레그램 봇과 최근에 대화한 사용자 목록 조회 (Chat ID 설정용)"""
    try:
        from alerts import get_recent_telegram_users
        users = get_recent_telegram_users()
        return {"status": "success", "data": users}
    except Exception as e:
        return {"status": "error", "message": str(e)}
