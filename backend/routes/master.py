from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import asyncio
from db_manager import get_user

router = APIRouter()

ADMIN_EMAILS = {'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'}

class MasterKeyRequest(BaseModel):
    user_id: str
    email: str

def verify_admin(user_id: str, email: str):
    if email.lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Master Key Access Denied: Not an Admin")
    user = get_user(user_id)
    if not user or user.get("email", "").lower() != email.lower():
        raise HTTPException(status_code=403, detail="Master Key Access Denied: Verification Failed")
    return True

@router.post("/restart")
def restart_server(req: MasterKeyRequest):
    """서버 OS 레벨 강제 재부팅"""
    verify_admin(req.user_id, req.email)
    
    # 파이썬 내부에서 백그라운드 태스크로 재부팅 스크립트 실행 (응답 전송 후 실행을 위해)
    async def _do_restart():
        await asyncio.sleep(2)
        os.system("sudo systemctl restart stocktrend-backend.service")
        
    asyncio.create_task(_do_restart())
    return {"status": "success", "message": "Server reboot command issued. The backend will restart in 2 seconds."}

@router.post("/toggle-auto-heal")
def toggle_auto_heal(req: MasterKeyRequest):
    """오토 힐링(자가치유) 기능 켜고 끄기"""
    verify_admin(req.user_id, req.email)
    
    import system_watchdog
    new_state = system_watchdog.toggle_auto_heal()
    
    return {"status": "success", "auto_heal_enabled": new_state, "message": f"Auto Healing is now {'ON' if new_state else 'OFF'}"}
    
@router.get("/status")
def get_master_status(user_id: str, email: str):
    """마스터 컨트롤 패널 상태 조회"""
    verify_admin(user_id, email)
    import system_watchdog
    return {"status": "success", "auto_heal_enabled": system_watchdog.AUTO_HEAL_ENABLED}
