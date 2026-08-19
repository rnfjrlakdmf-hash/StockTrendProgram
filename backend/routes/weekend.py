from fastapi import APIRouter
from datetime import datetime, timedelta
import pytz
from utils.weekend_report import get_latest_weekend_report
from utils.whale_weekend_report import get_latest_whale_report

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
    
    report = get_latest_weekend_report()
    next_open = get_next_open_time(now)
    
    if report:
        return {
            "is_open": True,
            "report": report,
            "is_current_weekend": is_weekend_open(now),
            "opens_at": next_open.strftime('%Y-%m-%d %H:%M KST'),
            "countdown_seconds": int((next_open - now).total_seconds())
        }
    else:
        return {
            "is_open": False,
            "opens_at": next_open.strftime('%Y-%m-%d %H:%M KST'),
            "countdown_seconds": int((next_open - now).total_seconds())
        }

@router.get("/api/weekend-whale-report")
async def get_weekend_whale_report():
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    day = now.weekday()
    hour = now.hour
    is_weekend = (day == 4 and hour >= 18) or day == 5 or day == 6 or (day == 0 and hour < 8)
    
    next_friday = now + timedelta(days=(4 - day) if day < 4 else (11 - day))
    next_open = next_friday.replace(hour=18, minute=0, second=0, microsecond=0)
    
    report = get_latest_whale_report()
    if report:
        return {
            "is_open": True,
            "report": report,
            "is_current_weekend": is_weekend,
            "opens_at": next_open.strftime('%Y-%m-%d %H:%M KST'),
            "countdown_seconds": int((next_open - now).total_seconds())
        }
    else:
        return {
            "is_open": False,
            "opens_at": next_open.strftime('%Y-%m-%d %H:%M KST'),
            "countdown_seconds": int((next_open - now).total_seconds())
        }
