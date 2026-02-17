from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db_manager import create_user_if_not_exists, decrement_free_trial, update_user_keys
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
def google_login(req: GoogleLoginRequest):
    """
    Handle Google Login (or Simulation).
    In a real app, we would verify the ID Token here using google-auth library.
    Since we don't have keys, we trust the client (for this demo/personal use).
    """
    
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
