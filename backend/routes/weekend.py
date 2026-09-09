from fastapi import APIRouter
from datetime import datetime, timedelta
import asyncio
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

import re

# 동시 생성 방지 락
_report_gen_lock = asyncio.Lock()

@router.get("/api/weekend-report")
async def get_weekend_report():
    kst = pytz.timezone('Asia/Seoul')
    now = datetime.now(kst)
    
    report = get_latest_weekend_report()
    
    # 리포트 유효성 및 최신성 정밀 검사 (Stale Check)
    is_stale = False
    if not report:
        is_stale = True
    elif "generated_at" in report:
        try:
            gen_dt = datetime.fromisoformat(report["generated_at"])
            # 1. 생성된 지 6일 이상 경과한 경우
            if (now - gen_dt).total_seconds() > 6 * 86400:
                is_stale = True
            
            # 2. 리포트 내의 경제 일정이 이미 모두 지난 과거 날짜인 경우
            # (예: 오늘이 9월 7일 또는 9월 9일인데 9월 1일~4일 일정이 적혀있는 경우)
            calendar_section = next((s for s in report.get("sections", []) if any(k in s.get("title", "") for k in ["경제 일정", "캘린더", "일정"])), None)
            if calendar_section:
                content = calendar_section.get("content", "")
                date_matches = re.findall(r'(\d{1,2})월\s*(\d{1,2})일', content)
                if date_matches:
                    has_future_event = False
                    for m_str, d_str in date_matches:
                        try:
                            m_val, d_val = int(m_str), int(d_str)
                            event_date = datetime(now.year, m_val, d_val, 23, 59, 59, tzinfo=kst)
                            if event_date >= now:
                                has_future_event = True
                                break
                        except Exception:
                            pass
                    if not has_future_event:
                        is_stale = True
                        print(f"[WeekendRoute] Stale detected: All calendar dates in report are in the past!")
        except Exception as e:
            print(f"[WeekendRoute] Stale check error: {e}")
            is_stale = True
            
    # 리포트가 없거나 이전 주 과거 데이터(stale)인 경우 요일과 무관하게 최신 주차 데이터로 즉시 자동 재생성
    if is_stale:
        async with _report_gen_lock:
            # 락 획득 후 다시 최신 파일 확인 (다른 요청에 의해 이미 생성되었을 수 있음)
            report = get_latest_weekend_report()
            if not report or is_stale:
                try:
                    from utils.weekend_report import generate_weekend_report
                    print(f"[WeekendRoute] Triggering automatic on-demand report generation at {now}...")
                    new_rep = await generate_weekend_report()
                    if new_rep:
                        report = new_rep
                except Exception as e:
                    print(f"[WeekendRoute] On-demand generation error: {e}")
                
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
