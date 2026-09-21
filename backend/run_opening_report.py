# -*- coding: utf-8 -*-
"""
독립 실행형 시장 개장 알림 러너 (run_opening_report.py)
- 한국 시장(KR): 평일 09:05 KST (UTC 00:05)
- 미국 시장(US): 평일 22:35 / 23:35 KST
- 개장 시점 관심종목의 시가 및 환율을 파악하여 FCM 푸시 및 알림센터로 독립 발송합니다.
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
from scheduler_service import send_opening_notification

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def main():
    market = sys.argv[1].upper() if len(sys.argv) > 1 else 'KR'
    print(f"\n=======================================================")
    print(f"🔔 [Opening Report Runner] Starting for market: {market}")
    print(f"=======================================================")

    market_type_str = 'kor' if market == 'KR' else 'us'
    if is_holiday(market_type_str):
        print(f"🏖️ 오늘은 {market} 시장 휴장일입니다. 개장 알림을 건너뜁니다.")
        return

    initialize_firebase()

    try:
        send_opening_notification(market)
        print(f"✅ [Opening Report Runner] Successfully completed {market} opening push.")
    except Exception as e:
        print(f"❌ [Opening Report Runner] Error occurred during opening push: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
