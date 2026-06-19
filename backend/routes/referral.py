from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from db_manager import get_db_connection
import uuid
import datetime

router = APIRouter()

class ReferralSubmitRequest(BaseModel):
    referral_code: str

@router.get("/me")
def get_referral_info(x_user_id: str = Header(None)):
    if not x_user_id or x_user_id == 'guest':
        return {"error": "Authentication required"}
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Ensure user exists in users table and get/create referral_code
    cursor.execute("SELECT referral_code, is_unlimited_alerts, daily_alert_count, last_alert_date FROM users WHERE id = ?", (x_user_id,))
    row = cursor.fetchone()
    
    if not row:
        # Create user record if not exists
        my_code = str(uuid.uuid4())[:8].upper()
        cursor.execute("INSERT INTO users (id, referral_code) VALUES (?, ?)", (x_user_id, my_code))
        conn.commit()
        row = (my_code, 0, 0, None)
    elif not row[0]:
        # User exists but no code
        my_code = str(uuid.uuid4())[:8].upper()
        cursor.execute("UPDATE users SET referral_code = ? WHERE id = ?", (my_code, x_user_id))
        conn.commit()
        row = (my_code, row[1], row[2], row[3])
        
    conn.close()
    
    return {
        "referral_code": row[0],
        "is_unlimited_alerts": bool(row[1]),
        "daily_alert_count": row[2] or 0,
        "last_alert_date": row[3]
    }

@router.post("/submit")
def submit_referral(req: ReferralSubmitRequest, x_user_id: str = Header(None)):
    if not x_user_id or x_user_id == 'guest':
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
        
    code = req.referral_code.strip().upper()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if code is valid and belongs to someone else
    cursor.execute("SELECT id FROM users WHERE referral_code = ?", (code,))
    referrer = cursor.fetchone()
    
    if not referrer:
        conn.close()
        raise HTTPException(status_code=400, detail="유효하지 않은 추천인 코드입니다.")
        
    referrer_id = referrer[0]
    if referrer_id == x_user_id:
        conn.close()
        raise HTTPException(status_code=400, detail="본인의 코드는 등록할 수 없습니다.")
        
    # Check if user already submitted a code
    cursor.execute("SELECT referred_by FROM users WHERE id = ?", (x_user_id,))
    me = cursor.fetchone()
    if me and me[0]:
        conn.close()
        raise HTTPException(status_code=400, detail="이미 추천인 코드를 등록하셨습니다.")
        
    # Unlock for both
    cursor.execute("UPDATE users SET referred_by = ?, is_unlimited_alerts = 1 WHERE id = ?", (code, x_user_id))
    cursor.execute("UPDATE users SET is_unlimited_alerts = 1 WHERE id = ?", (referrer_id,))
    
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": "무제한 알림이 해제되었습니다!"}
