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
    Handle Google Login (or Simulation).
    In a real app, we would verify the ID Token here using google-auth library.
    """
    # [Lazy Imports]
    from db_manager import create_user_if_not_exists, get_user, migrate_watchlist
    from utils.briefing_store import invalidate_today_briefing
    
    # 1. Create or Update User in DB
    user_data = {
        "id": req.id,
        "email": req.email,
        "name": req.name,
        "picture": req.picture
    }
    
    success = create_user_if_not_exists(user_data)
    if not success:
        return {"status": "error", "message": "DB Error"}
    
    # [Optimize] Background tasks for cleanup/migration
    bg_tasks.add_task(migrate_watchlist, "guest", req.id)
    bg_tasks.add_task(invalidate_today_briefing, req.id)
    
    real_user = get_user(req.id)
    if not real_user:
        real_user = user_data

    return {
        "status": "success",
        "user": real_user,
        "token": f"mock_token_{req.id}_{int(time.time())}" # Simulation
    }

@router.post("/use-trial")
def use_trial(req: UseTrialRequest):
    """1시간 무료 이용권 사용 API"""
    # Lazy Import
    from db_manager import decrement_free_trial
    new_count = decrement_free_trial(req.user_id)
    if new_count >= 0:
        return {"status": "success", "new_count": new_count}
    else:
        return {"status": "error", "message": "No trials left or user not found"}

@router.post("/settings")
def update_settings(req: UserSettingsRequest):
    """Update User Settings (KIS Keys)"""
    # Lazy Import
    from db_manager import update_user_keys
    success = update_user_keys(req.user_id, req.kis_app_key, req.kis_secret, req.kis_account)
    if success:
        return {"status": "success", "message": "Settings updated"}
    else:
        return {"status": "error", "message": "Failed to update settings"}
