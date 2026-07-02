from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from datetime import datetime
import pytz
import random
import sqlite3
import os

router = APIRouter()

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "stock_trend.db")

@router.post("/roulette/spin")
def spin_roulette(x_user_id: str = Header(None)):
    if not x_user_id or x_user_id == "guest" or x_user_id.startswith("dev_"):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    today_str = now.strftime('%Y-%m-%d')
    hour = now.hour
    
    # 00:00 ~ 15:30 -> KR Market Roulette
    # 15:30 ~ 23:59 -> US Market Roulette
    market_session = "KR" if hour < 16 else "US"
    
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT points, free_trial_count, last_roulette_kr_date, last_roulette_us_date FROM users WHERE id = ?", (x_user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
            
        points, trial_count, last_kr, last_us = row
        points = points if points is not None else 0
        trial_count = trial_count if trial_count is not None else 0
        
        if market_session == "KR" and last_kr == today_str:
            return {"status": "error", "message": "오늘은 이미 국내장 룰렛을 돌렸습니다."}
        if market_session == "US" and last_us == today_str:
            return {"status": "error", "message": "오늘은 이미 미국장 룰렛을 돌렸습니다."}
            
        # 1. 1시간 PRO (free_trial_count +1) - 10%
        # 2. 50 포인트 - 20%
        # 3. 10 포인트 - 40%
        # 4. 꽝 - 30%
        rand = random.randint(1, 100)
        reward_type = "none"
        if rand <= 10:
            reward_type = "pro_1h"
            trial_count += 1
        elif rand <= 30:
            reward_type = "point_50"
            points += 50
        elif rand <= 70:
            reward_type = "point_10"
            points += 10
        else:
            reward_type = "none"
            
        if market_session == "KR":
            cursor.execute("UPDATE users SET points = ?, free_trial_count = ?, last_roulette_kr_date = ? WHERE id = ?", (points, trial_count, today_str, x_user_id))
        else:
            cursor.execute("UPDATE users SET points = ?, free_trial_count = ?, last_roulette_us_date = ? WHERE id = ?", (points, trial_count, today_str, x_user_id))
            
        conn.commit()
        
        return {
            "status": "success",
            "reward": reward_type,
            "session": market_session,
            "new_points": points,
            "new_trial_count": trial_count
        }
        
    except Exception as e:
        print(f"Roulette Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
