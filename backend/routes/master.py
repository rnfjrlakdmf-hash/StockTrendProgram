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
        import subprocess
        subprocess.Popen(["sudo", "systemctl", "restart", "stocktrend-backend.service"], start_new_session=True)
        
    asyncio.create_task(_do_restart())
    return {"status": "success", "message": "Server reboot command issued. The backend will restart in 2 seconds."}

@router.post("/toggle-auto-heal")
def toggle_auto_heal(req: MasterKeyRequest):
    """오토 힐링(자가치유) 기능 켜고 끄기"""
    verify_admin(req.user_id, req.email)
    
    import system_watchdog
    new_state = system_watchdog.toggle_auto_heal()
    
    return {"status": "success", "auto_heal_enabled": new_state, "message": f"Auto Healing is now {'ON' if new_state else 'OFF'}"}

@router.post("/ping-push")
def ping_push(req: MasterKeyRequest):
    """관리자 본인 기기로 푸시 알림 핑 테스트"""
    verify_admin(req.user_id, req.email)
    
    from db_manager import get_user_fcm_tokens
    from firebase_config import send_multicast_notification
    
    tokens_data = get_user_fcm_tokens(req.user_id)
    if not tokens_data:
        return {"status": "error", "message": "등록된 푸시 토큰이 없습니다. 앱 접속이나 알림 권한을 다시 설정해주세요."}
    
    tokens = [t["token"] for t in tokens_data if t.get("token")]
    if not tokens:
        return {"status": "error", "message": "유효한 푸시 토큰이 없습니다."}
        
    title = "🔔 푸시 알림 테스트 성공!"
    body = "마스터 컨트롤 룸에서 보낸 테스트 알림이 정상적으로 수신되었습니다. (수신증 토큰 정상 동작 중)"
    
    try:
        send_multicast_notification(tokens, title, body, {"type": "ping_test"})
        return {"status": "success", "message": f"{len(tokens)}개의 기기로 테스트 알림을 발송했습니다!"}
    except Exception as e:
        return {"status": "error", "message": f"푸시 발송 중 오류: {str(e)}"}
    
@router.get("/status")
def get_master_status(user_id: str, email: str):
    """마스터 컨트롤 패널 상태 조회"""
    verify_admin(user_id, email)
    import system_watchdog
    return {"status": "success", "auto_heal_enabled": system_watchdog.AUTO_HEAL_ENABLED}
