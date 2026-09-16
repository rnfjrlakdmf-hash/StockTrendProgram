# -*- coding: utf-8 -*-
"""
독립 실행형 장마감 결산 러너 (run_closing_report.py)
- 매일 정규장 마감 후(KST 15:40) Crontab 또는 스케줄러를 통해 독립 실행됩니다.
- 한국/미국 시장의 휴장일 여부를 자동 검사하고, 유저별 관심종목의 당일 최종 수익률 및 시장 시황을 FCM 푸시와 알림센터로 100% 정시 발송합니다.
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
from scheduler_service import send_closing_notification

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def main():
    market = sys.argv[1].upper() if len(sys.argv) > 1 else 'KR'
    target_user_id = sys.argv[2] if len(sys.argv) > 2 else None
    print(f"\n=======================================================")
    print(f"🌕 [Closing Report Runner] Starting for market: {market} (target_user_id={target_user_id})")
    print(f"=======================================================")

    market_type_str = 'kor' if market == 'KR' else 'us'
    if is_holiday(market_type_str):
        print(f"🏖️ 오늘은 {market} 시장 휴장일(주말 또는 공휴일)입니다. 장마감 결산 발송을 건너뜁니다.")
        return

    initialize_firebase()

    try:
        send_closing_notification(market, target_user_id=target_user_id)
        print(f"✅ [Closing Report Runner] Successfully completed {market} market closing notification.")
    except Exception as e:
        print(f"❌ [Closing Report Runner] Error occurred during execution: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
