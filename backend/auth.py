from fastapi import APIRouter, Header, Query, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import time

router = APIRouter()

# Schema
class GoogleLoginRequest(BaseModel):
    id: str
    email: Optional[str] = None
    name: str = "User"
    picture: str = ""
    guest_id: Optional[str] = None

class UseTrialRequest(BaseModel):
    user_id: str

class UserSettingsRequest(BaseModel):
    user_id: str
    kis_app_key: str
    kis_secret: str
    kis_account: str

class DeleteAccountRequest(BaseModel):
    user_id: str

class KakaoLoginRequest(BaseModel):
    code: str
    redirect_uri: str

class AttendanceRequest(BaseModel):
    user_id: str

class ReportUnlockRequest(BaseModel):
    user_id: str
    report_date: str

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
        if req.guest_id:
            from db_manager import merge_guest_to_user
            merge_guest_to_user(req.guest_id, req.id)
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

@router.post("/kakao")
def kakao_login(req: KakaoLoginRequest, bg_tasks: BackgroundTasks):
    """
    Handle Kakao OAuth Login callback.
    Exchange code for access_token, fetch user profile, and save/login user.
    """
    import requests
    from db_manager import create_user_if_not_exists, get_user, migrate_watchlist
    from utils.briefing_store import invalidate_today_briefing

    client_id = "d8796066436c590e1c9aded21b13c929" # User REST API Key

    # 1. Get Access Token
    token_resp = requests.post(
        "https://kauth.kakao.com/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "redirect_uri": req.redirect_uri,
            "code": req.code
        },
        headers={"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"}
    )
    if not token_resp.ok:
        return {"status": "error", "message": f"Kakao token error: {token_resp.text}"}

    access_token = token_resp.json().get("access_token")

    # 2. Get User Profile
    profile_resp = requests.get(
        "https://kapi.kakao.com/v2/user/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    if not profile_resp.ok:
        return {"status": "error", "message": f"Kakao profile error: {profile_resp.text}"}

    k_user = profile_resp.json()
    kakao_id = f"kakao_{k_user.get('id')}"
    kakao_account = k_user.get("kakao_account", {})
    properties = k_user.get("properties", {})
    
    email = kakao_account.get("email", f"{kakao_id}@kakao.com")
    name = properties.get("nickname", "카카오 유저")
    picture = properties.get("profile_image", "")

    user_data = {
        "id": kakao_id,
        "email": email,
        "name": name,
        "picture": picture
    }

    # 3. Save/Update DB
    db_success = False
    try:
        db_success = create_user_if_not_exists(user_data)
    except Exception as e:
        print(f"[Critical Auth Error] DB Save Failed for Kakao: {e}")

    real_user = None
    if db_success:
        try:
            real_user = get_user(kakao_id)
        except: pass

    if not real_user:
        real_user = {
            "id": kakao_id,
            "email": email,
            "name": name,
            "picture": picture,
            "is_pro": False,
            "free_trial_count": 2
        }

    # 4. Background tasks
    bg_tasks.add_task(migrate_watchlist, "guest", kakao_id)
    bg_tasks.add_task(invalidate_today_briefing, kakao_id)

    return {
        "status": "success",
        "user": real_user,
        "token": f"token_{kakao_id}_{int(time.time())}"
    }

@router.post("/use-trial")
def use_trial(req: UseTrialRequest):
    """1시간 무료 이용권 사용 API (기존 방식)"""
    try:
        from db_manager import decrement_free_trial
        new_count = decrement_free_trial(req.user_id)
        if new_count >= 0:
            return {"status": "success", "new_count": new_count}
    except: pass
    return {"status": "error", "message": "Trial update failed"}

@router.post("/activate-trial")
def activate_trial(req: UseTrialRequest):
    """광고 시청 후 1시간 Pro 활성화 API (신규 방식)"""
    try:
        from db_manager import activate_pro_trial
        expires_at = activate_pro_trial(req.user_id, hours=1)
        if expires_at:
            return {"status": "success", "expires_at": expires_at}
    except: pass
    return {"status": "error", "message": "Pro activation failed"}

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

@router.post("/delete-account")
def delete_account(req: DeleteAccountRequest):
    """
    개인정보 보호법 준수를 위한 회원 탈퇴 API.
    탈퇴 시 DB에서 해당 유저의 모든 개인정보를 영구 파기합니다.
    """
    if not req.user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
        
    try:
        from db_manager import delete_user_data
        success = delete_user_data(req.user_id)
        if success:
            return {"status": "success", "message": "Account and all associated personal data have been permanently deleted"}
        else:
            return {"status": "error", "message": "Failed to delete account data from DB"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database deletion error: {str(e)}")

@router.get("/user/{user_id}/profile")
def get_user_profile(user_id: str):
    """유저의 최신 코인, 출석, 프로 정보를 반환합니다."""
    try:
        from db_manager import get_user
        user = get_user(user_id)
        if user:
            return {"status": "success", "user": user}
        return {"status": "error", "message": "User not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/guest")
def guest_login(req: AttendanceRequest):
    """게스트 계정 초기화 API"""
    from db_manager import create_user_if_not_exists
    try:
        create_user_if_not_exists({
            "id": req.user_id,
            "email": None,
            "name": "게스트",
            "picture": ""
        })
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/user/attendance")
def attendance_check(req: AttendanceRequest):
    """오늘 날짜 기준 출석체크 및 코인 지급 API"""
    try:
        from db_manager import do_attendance
        result = do_attendance(req.user_id)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/user/attendance/logs")
def get_attendance_logs_endpoint(user_id: str, year: int, month: int):
    """월별 출석 기록 반환"""
    try:
        from db_manager import get_attendance_logs
        logs = get_attendance_logs(user_id, year, month)
        return {"status": "success", "logs": logs}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/reports/premium")
def get_premium_report(user_id: str):
    """
    프리미엄 리포트 데이터를 반환. 
    잠금 해제 여부에 따라 본문 전체 혹은 블러용 일부만 반환.
    """
    from datetime import datetime
    import pytz
    
    kst = pytz.timezone('Asia/Seoul')
    today_str = datetime.now(kst).strftime('%Y-%m-%d')
    
    import os
    import json
    
    # 생성된 프리미엄 리포트 파일 읽기
    report_path = os.path.join(os.path.dirname(__file__), "premium_report_today.json")
    
    # 기본 폴백 데이터 (아직 리포트가 생성되지 않았을 때)
    premium_data = {
        "report_date": today_str,
        "title": f"[{today_str}] 기관/외인 순매수 상위 종목 통계",
        "preview": "현재 데이터 수집 및 분석 중입니다. 장 마감 후 업데이트됩니다.",
        "content": "아직 오늘의 리포트가 생성되지 않았습니다.\n(보통 오후 3시 45분 이후 업데이트됩니다.)"
    }

    if os.path.exists(report_path):
        try:
            with open(report_path, "r", encoding="utf-8") as f:
                saved_data = json.load(f)
                # 날짜가 다르면 아직 오늘 껀 업데이트 안된거임
                if saved_data.get("report_date") == today_str:
                    premium_data = saved_data
        except Exception as e:
            print(f"Failed to read premium report: {e}")
    
    try:
        from db_manager import check_report_unlocked, get_user
        
        is_unlocked = check_report_unlocked(user_id, today_str)
        
        # 관리자 계정은 무조건 열람 가능
        admin_emails = {'rnfjr@gmail.com', 'rnfjrlakdmf@gmail.com'}
        user_info = get_user(user_id)
        is_admin = False
        if user_info and user_info.get("email") and user_info.get("email").lower() in admin_emails:
            is_admin = True
            
        if is_unlocked or is_admin:
            return {
                "status": "success",
                "locked": False,
                "data": premium_data
            }
        else:
            # 잠금 상태이면 preview만 보냄
            locked_data = premium_data.copy()
            # 블러를 위한 긴 빈 줄 및 안내 문구 추가
            locked_data["content"] = premium_data["content"][:100] + "\n\n... (50 코인으로 잠금 해제하여 전체 본문을 확인하세요) ..." + "\n" * 15
            return {
                "status": "success",
                "locked": True,
                "data": locked_data
            }
            
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/reports/unlock")
def unlock_premium_report_api(req: ReportUnlockRequest):
    """50 코인을 차감하고 특정 날짜의 프리미엄 리포트 잠금 해제"""
    try:
        from db_manager import unlock_premium_report
        result = unlock_premium_report(req.user_id, req.report_date, cost=50)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}
