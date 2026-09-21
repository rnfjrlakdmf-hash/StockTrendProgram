# -*- coding: utf-8 -*-
"""
독립 실행형 공모주 청약 알림 러너 (run_ipo_alerts.py)
- 매일 평일 아침 08:15 KST (UTC 23:15 일~목)에 독립 실행됩니다.
- 당일 청약 시작/마감 및 상장 예정인 공모주 일정을 분석하여 유저들에게 FCM 푸시를 발송합니다.
"""

import os
import sys
import logging

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
from batch_ipo_alerts import send_ipo_alerts

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def main():
    print(f"\n=======================================================")
    print(f"🎯 [IPO Alerts Runner] Starting IPO Schedule Check...")
    print(f"=======================================================")

    if is_holiday("kor"):
        print("🏖️ 오늘은 한국 시장 휴장일(주말/공휴일)입니다. 공모주 알림을 건너뜁니다.")
        return

    initialize_firebase()

    try:
        send_ipo_alerts()
        print("✅ [IPO Alerts Runner] Completed IPO alerts check successfully.")
    except Exception as e:
        print(f"❌ [IPO Alerts Runner] Error during IPO alerts: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
