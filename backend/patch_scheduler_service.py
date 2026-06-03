import codecs

with codecs.open('scheduler_service.py', 'r', 'utf-8') as f:
    text = f.read()

old_func = """def is_market_holiday(market: str) -> bool:
    \"\"\"국가별 주요 시장 휴장일 여부 확인 (2024-2025 주요 공휴일)\"\"\"
    if market == "KR":
        now = datetime.now(pytz.timezone('Asia/Seoul'))
        date_str = now.strftime('%m-%d')
        # 한국 주요 휴장일 (2024-2025 고정/추정)
        kr_holidays = [
            '01-01', '03-01', '04-10', '05-01', '05-05', '05-06', '06-06', 
            '08-15', '10-03', '10-09', '12-25'
        ]
        return date_str in kr_holidays
    else:
        # 미국 동부 시간 기준으로 날짜별 판별 (한국 토요일 새벽=미국 금요일 오후 등)
        now = datetime.now(pytz.timezone('America/New_York'))
        date_str = now.strftime('%m-%d')
        # 미국 주요 휴장일
        us_holidays = [
            '01-01', '01-15', '02-19', '03-29', '05-27', '06-19', 
            '07-04', '09-02', '11-28', '12-25'
        ]
        return date_str in us_holidays"""

new_func = """from holiday_checker import is_holiday
def is_market_holiday(market: str) -> bool:
    \"\"\"공통 모듈을 사용하여 공휴일 확인\"\"\"
    return is_holiday("kor" if market == "KR" else "us")"""

text = text.replace(old_func, new_func)

with codecs.open('scheduler_service.py', 'w', 'utf-8') as f:
    f.write(text)

print("scheduler_service.py patched")
