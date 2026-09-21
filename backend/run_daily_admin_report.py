# -*- coding: utf-8 -*-
"""
독립 실행형 관리자 일일 운영 보고서 러너 (run_daily_admin_report.py)
- 매일 밤 23:55 정각에 Crontab을 통해 OS 레벨에서 독립 실행됩니다.
- 당일 순 방문자수, 총 페이지뷰, 30일 누적 통계, 실시간 접속자, 가입 회원수, 피크타임을 정밀 집계하여
  관리자(rnfjrlakdmf@gmail.com, rnfjr@gmail.com) 전용 디바이스로 FCM 푸시 및 알림센터에 안전 발송합니다.
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

# 모듈 경로 추가
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from firebase_config import initialize_firebase
from scheduler_service import send_daily_analytics_report

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def main():
    print(f"\n=======================================================")
    print(f"📊 [Daily Admin Report Runner] Starting Daily Analytics Push...")
    print(f"=======================================================")

    initialize_firebase()

    try:
        sent_count = send_daily_analytics_report()
        print(f"✅ [Daily Admin Report Runner] Successfully sent report to {sent_count} admin device(s).")
    except Exception as e:
        print(f"❌ [Daily Admin Report Runner] Error occurred during report generation/sending: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
