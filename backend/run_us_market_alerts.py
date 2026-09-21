# -*- coding: utf-8 -*-
"""
독립 실행형 미국 시장 개장/마감 알림 스마트 러너 (run_us_market_alerts.py)
- 서머타임(DST) 자동 인식:
  * 서머타임 적용 시 (3월~11월):
    - 미국 개장: 한국 시간 22:35 (현지 09:35 ET) / UTC 13:35
    - 미국 마감: 한국 시간 05:10 (현지 16:10 ET) / UTC 20:10
  * 표준시 적용 시 (11월~3월):
    - 미국 개장: 한국 시간 23:35 (현지 09:35 ET) / UTC 14:35
    - 미국 마감: 한국 시간 06:10 (현지 16:10 ET) / UTC 21:10
- Crontab에서 13:35/14:35 UTC 및 20:10/21:10 UTC에 호출되더라도,
  미국 현지 시각(ET)이 개장(09:35) 또는 마감(16:10) 시각일 때만 정확히 1회 실행됩니다.
"""

import os
import sys
import logging
from datetime import datetime
import pytz

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from holiday_checker import is_holiday
from firebase_config import initialize_firebase
from scheduler_service import send_opening_notification, send_closing_notification

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def main():
    mode = sys.argv[1].lower() if len(sys.argv) > 1 else 'open'
    force = '--force' in sys.argv

    print(f"\n=======================================================")
    print(f"🇺🇸 [US Market Runner] Starting US Alert Runner (Mode: {mode.upper()}, Force: {force})")
    print(f"=======================================================")

    # 1. 미국 시장 휴장일 여부 검사
    if is_holiday('us') and not force:
        print("🏖️ 오늘은 미국 주식 시장 휴장일(주말 또는 미국 공휴일)입니다. 알림 발송을 건너뜁니다.")
        return

    # 2. 미국 현지 시간(ET) 확인
    ny_tz = pytz.timezone('America/New_York')
    ny_now = datetime.now(ny_tz)
    ny_hour = ny_now.hour
    ny_minute = ny_now.minute
    ny_date = ny_now.strftime('%Y-%m-%d')

    print(f"🕒 미국 현지 시각 (ET): {ny_now.strftime('%Y-%m-%d %H:%M:%S %Z')}")

    initialize_firebase()

    if mode == 'open':
        # 미국 정규장 개장은 09:30 AM ET (알림 타겟 09:35 ET)
        # 09시 시간대이거나 force인 경우 실행
        if force or (ny_hour == 9 and 30 <= ny_minute <= 45):
            try:
                print(f"🔔 [US Market Open] Sending US opening price notifications...")
                send_opening_notification("US")
                print("✅ [US Market Open] Successfully completed US opening push.")
            except Exception as e:
                print(f"❌ [US Market Open] Error: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"⏳ 현재 시각({ny_hour}:{ny_minute:02d} ET)은 미국 정규장 개장(09:35 ET) 시간대가 아닙니다. 건너뜁니다.")

    elif mode == 'close':
        # 미국 정규장 마감은 16:00 PM ET (알림 타겟 16:10 ET)
        # 16시 시간대이거나 force인 경우 실행
        if force or (ny_hour == 16 and 5 <= ny_minute <= 25):
            try:
                print(f"🌕 [US Market Close] Sending US closing report notifications...")
                send_closing_notification("US")
                print("✅ [US Market Close] Successfully completed US closing report push.")
            except Exception as e:
                print(f"❌ [US Market Close] Error: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"⏳ 현재 시각({ny_hour}:{ny_minute:02d} ET)은 미국 정규장 마감(16:10 ET) 시간대가 아닙니다. 건너뜁니다.")

    else:
        print(f"⚠️ 알 수 없는 모드: {mode} (open 또는 close 지정 필요)")


if __name__ == '__main__':
    main()
