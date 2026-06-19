from fastapi import APIRouter
from datetime import datetime, timedelta
import pytz
from utils.weekend_report import get_latest_weekend_report

router = APIRouter()

def is_weekend_open(now: datetime) -> bool:
    # 토요일(5) 10:00 ~ 일요일(6) 23:59
    if now.weekday() == 5 and now.hour >= 10:
        return True
    if now.weekday() == 6:
        return True
    return False

def get_next_open_time(now: datetime) -> datetime:
    # 현재 시간 기준 다음 토요일 10:00 계산
    days_ahead = 5 - now.weekday()
    if days_ahead < 0 or (days_ahead == 0 and now.hour >= 10):
        days_ahead += 7
        
    next_saturday = now + timedelta(days=days_ahead)
    return next_saturday.replace(hour=10, minute=0, second=0, microsecond=0)

@router.get("/api/weekend-report")
async def get_weekend_report():
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    # For testing purposes, uncomment the line below to force open
    # return {"is_open": True, "report": get_latest_weekend_report()}
    
    if is_weekend_open(now):
        report = get_latest_weekend_report()
        if not report:
            # 리포트가 아직 생성되지 않은 경우 (예비 조치)
            return {
                "is_open": False, 
                "opens_at": "잠시 후 업데이트 됩니다",
                "countdown_seconds": 0
            }
        return {"is_open": True, "report": report}
    else:
        next_open = get_next_open_time(now)
        diff = (next_open - now).total_seconds()
        return {
            "is_open": False,
            "opens_at": "토요일 오전 10시",
            "countdown_seconds": int(diff)
        }
