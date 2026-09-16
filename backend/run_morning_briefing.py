# -*- coding: utf-8 -*-
"""
독립 실행형 모닝 브리핑 러너 (run_morning_briefing.py)
- 매일 아침 08:00 정각에 Crontab 또는 스케줄러를 통해 독립 실행됩니다.
- 한국/미국 시장의 휴장일 여부를 자동 검사하고, 유저별 관심종목의 최신 뉴스 팩트와 수급을 분석하여 FCM 푸시 및 알림센터로 발송합니다.
"""

import os
import sys
import asyncio
import logging

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

# 모듈 경로 추가
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from holiday_checker import is_holiday
from morning_briefing import morning_briefing_service
from firebase_config import initialize_firebase

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


async def main():
    market = sys.argv[1].upper() if len(sys.argv) > 1 else 'KR'
    print(f"\n=======================================================")
    print(f"☀️ [Morning Briefing Runner] Starting for market: {market}")
    print(f"=======================================================")

    market_type_str = 'kor' if market == 'KR' else 'us'
    if is_holiday(market_type_str):
        print(f"🏖️ 오늘은 {market} 시장 휴장일(주말 또는 공휴일)입니다. 브리핑 발송을 건너뜁니다.")
        return

    initialize_firebase()

    try:
        await morning_briefing_service.run_daily_briefing(market)
        print(f"✅ [Morning Briefing Runner] Successfully completed {market} morning briefing.")
    except Exception as e:
        print(f"❌ [Morning Briefing Runner] Error occurred during execution: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    asyncio.run(main())
