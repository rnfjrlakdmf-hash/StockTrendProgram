# -*- coding: utf-8 -*-
"""
독립 실행형 주말 한정 리포트 러너 (run_weekend_reports.py)
- 토요일 18:00 KST: 주말 크립토/비트코인 동향 리포트
- 일요일 18:00 KST: 주말 핵심 테마주 리포트
- 일요일 20:00 KST: 월요일 장 대비 세력/외인 매집 TOP 3 오픈 알림
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

from firebase_config import initialize_firebase
from db_manager import get_db_connection
from firebase_config import send_multicast_notification

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def run_whale_push():
    """일요일 저녁 8시 세력/외인 매집 리포트 오픈 푸시 알림"""
    print("[WeekendReports] Sending Whale/Institution Top 3 push...")
    try:
        title = "🐳 월요일 장 준비 끝!"
        body = "주말 한정판 세력/외인 매집 TOP 3 리포트가 도착했습니다. 지금 확인하세요!"
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT token FROM fcm_tokens WHERE token IS NOT NULL")
        tokens = [row[0] for row in cursor.fetchall() if row[0]]
        conn.close()
        if tokens:
            send_multicast_notification(tokens, title, body, {"url": "/"})
            print(f"✅ [WeekendReports] Whale push sent to {len(tokens)} devices.")
        else:
            print("[WeekendReports] No FCM tokens found for Whale push.")
    except Exception as e:
        print(f"❌ [WeekendReports] Error in Whale push: {e}")


def main():
    report_type = sys.argv[1].lower() if len(sys.argv) > 1 else 'theme'
    print(f"\n=======================================================")
    print(f"🏖️ [Weekend Reports Runner] Starting for type: {report_type}")
    print(f"=======================================================")

    initialize_firebase()

    try:
        if report_type == 'crypto':
            from scheduler_service import send_weekend_crypto_report
            send_weekend_crypto_report()
            print("✅ [Weekend Reports Runner] Successfully sent weekend crypto report.")
        elif report_type == 'theme':
            from scheduler_service import send_weekend_theme_report
            send_weekend_theme_report()
            print("✅ [Weekend Reports Runner] Successfully sent weekend theme report.")
        elif report_type == 'whale_push':
            run_whale_push()
            print("✅ [Weekend Reports Runner] Successfully executed whale push.")
        else:
            print(f"⚠️ [Weekend Reports Runner] Unknown report type: {report_type}")
    except Exception as e:
        print(f"❌ [Weekend Reports Runner] Error during {report_type} execution: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
