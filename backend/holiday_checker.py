import sys
from datetime import datetime, timezone, timedelta
import holidays

def is_holiday(market_type: str) -> bool:
    """
    지정된 시장의 오늘(현지 마감일 기준)이 공휴일이거나 주말인지 True/False 반환.
    주말(토, 일)도 휴장일로 취급합니다.
    """
    kst = timezone(timedelta(hours=9))
    if market_type == "kor":
        today_date = datetime.now(kst).date()
        # 주말 체크 (5: 토요일, 6: 일요일)
        if today_date.weekday() >= 5:
            return True
        kr_holidays = holidays.KR()
        return today_date in kr_holidays
        
    elif market_type == "us":
        # 미국 시장은 현지 시간(뉴욕) 기준으로 판별 (간단히 KST - 13시간 적용)
        ny_time = datetime.now(kst) - timedelta(hours=13)
        us_today = ny_time.date()
        if us_today.weekday() >= 5:
            return True
        us_holidays = holidays.US()
        return us_today in us_holidays
        
    return False

def exit_if_holiday(market_type: str, script_name: str = "Script"):
    """휴장일이면 프로세스를 종료합니다 (단독 스크립트용)"""
    if is_holiday(market_type):
        print(f"✅ [{market_type.upper()}] 오늘은 휴장일(주말 또는 공휴일)이므로 {script_name} 실행을 생략합니다.")
        sys.exit(0)
