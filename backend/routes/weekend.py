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
        "opens_at": next_open.strftime('%Y-%m-%d %H:%M KST'),
        "countdown_seconds": int((next_open - now).total_seconds())
    }

@router.get("/api/weekend-whale-report")
async def get_weekend_whale_report():
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    # 임시 개방 (테스트용) 주석 처리
    # return {"is_open": True, "report": get_latest_whale_report()}
    
    # 주말(금 18:00 ~ 월 08:00) 동안 활성화. 기존 is_weekend_open 보다 조금 더 길게 엽니다.
    day = now.weekday()
    hour = now.hour
    is_weekend = (day == 4 and hour >= 18) or day == 5 or day == 6 or (day == 0 and hour < 8)
    
    if is_weekend:
        report = get_latest_whale_report()
        if not report:
            return {
                "is_open": False,
                "opens_at": "리포트 생성 중입니다...",
                "countdown_seconds": 0
            }
        return {"is_open": True, "report": report}
        
    next_friday = now + timedelta(days=(4 - day) if day < 4 else (11 - day))
    next_open = next_friday.replace(hour=18, minute=0, second=0, microsecond=0)
    
    return {
        "is_open": False,
        "opens_at": next_open.strftime('%Y-%m-%d %H:%M KST'),
        "countdown_seconds": int((next_open - now).total_seconds())
    }
