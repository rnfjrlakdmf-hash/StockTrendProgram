import asyncio
import logging
import json
import os
from datetime import datetime, timedelta

# Configure logging
logger = logging.getLogger(__name__)

# State File to track processed disclosures
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "disclosure_state.json")

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load state: {e}")
    return {"processed_ids": []}

def save_state(state):
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        logger.error(f"Failed to save state: {e}")

async def check_and_notify_disclosures():
    """Periodic task to check for new disclosures and send notifications."""
    logger.info("Running Disclosure Check...")
    
    # [Lazy Import] 무거운 모듈은 필요 시에만 로드
    from kind_scraper import KindScraper
    from db_manager import get_all_fcm_tokens
    from firebase_config import send_multicast_notification

    scraper = KindScraper(headless=True)
    try:
        keywords = ["보호예수", "전환사채", "신주인수권"]
        new_findings = []
        state = load_state()
        processed_ids = set(state.get("processed_ids", []))

        for kw in keywords:
            try:
                logger.info(f"Scraping keyword: {kw}")
                results = scraper.scrape_latest_disclosures(kw)
                for item in results:
                    doc_id = str(item.get('no'))
                    if doc_id and doc_id not in processed_ids:
                        item['keyword'] = kw
                        new_findings.append(item)
                        processed_ids.add(doc_id)
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Error scraping {kw}: {e}")

        if new_findings:
            logger.info(f"Found {len(new_findings)} new disclosures.")
            from korea_data import search_korean_stock_symbol
            from db_manager import get_user_tokens_by_watchlist_symbol

            for item in new_findings:
                corp = item.get('corp_name', 'Unknown')
                symbol = search_korean_stock_symbol(corp)
                tokens = get_user_tokens_by_watchlist_symbol(symbol) if symbol else []

                if tokens:
                    category = item.get('keyword', '공시')
                    title_text = item.get('title', '')
                    noti_title = f"🚨 [관심종목 {category}] {corp}"
                    noti_body = f"{title_text}\n\n나의 관심종목에 새로운 공시가 올라왔습니다."
                    data_payload = {
                        "type": "DISCLOSURE_ALERT",
                        "symbol": symbol or corp,
                        "url": f"/discovery?q={symbol or corp}"
                    }
                    logger.info(f"Sending targeted alert for {corp} ({symbol}) to {len(tokens)} tokens")
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)
                    await asyncio.sleep(1)

            processed_list = list(processed_ids)[-1000:]
            save_state({"processed_ids": processed_list})
        else:
            logger.info("No new disclosures found.")

    except Exception as e:
        logger.error(f"Scheduler Error: {e}")
    finally:
        scraper._close_driver()


# Global analysis lock to prevent concurrent DB writes from multiple background tasks
ANALYSIS_LOCK = asyncio.Lock()

async def backfill_system_briefings(kst_timezone):
    """
    서버 시작 시 누락된 시스템 브리핑 데이터를 소급하여 생성합니다.
    (Diet-V3: 최근 3일간의 데이터를 최신순으로 복구)
    """
    from utils.global_briefing import generate_market_wide_briefing
    from utils.briefing_store import has_system_briefing_for_hour, get_db

    # [Self-Healing] 과거 수집 실패로 인해 저장된 '수집 중' 임시 데이터를 삭제하여 재시도 유도
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM morning_briefings WHERE user_id = 'SYSTEM' AND briefing_json LIKE '%시장 데이터 수집 중%'")
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close() 
        if deleted_count > 0:
            logger.info(f"[Backfill-SelfHeal] Cleared {deleted_count} failed placeholders.")
    except Exception as e:
        logger.error(f"[Backfill-SelfHeal] Error: {e}")

# Global analysis lock to prevent concurrent DB writes from multiple background tasks
ANALYSIS_LOCK = asyncio.Lock()

async def hourly_briefing_scheduler_loop():
    """
    매 정각 정기 브리핑 생성 (초경량 실시간 전용 모드)
    - 자원 독점을 막기 위해 과거 소급 작업을 완전히 제거했습니다.
    - 오직 1시간마다 한 번만 동작하여 다른 기능에 전혀 영향을 주지 않습니다.
    """
    logger.info("📅 [Resource-Clean] Hourly Scheduler Active.")
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    last_run_hour = -1
    last_cleanup_date = ""

    while True:
        try:
            now = datetime.now(kst)
            current_hour = now.hour
            current_date = now.strftime("%Y-%m-%d")

            # 평일(월~금) 장중/마감 시간에만 동작하여 서버 자원 극도 절약
            is_weekend = (now.weekday() >= 5)
            
            if not is_weekend and current_hour != last_run_hour:
                logger.info(f"📅 [Scheduler] Starting hourly briefing for: {current_hour}:00")
                from utils.global_briefing import generate_market_wide_briefing
                
                async with ANALYSIS_LOCK:
                    await asyncio.wait_for(
                        generate_market_wide_briefing(),
                        timeout=180.0
                    )
                last_run_hour = current_hour
                logger.info(f"📅 [Scheduler] Task completed for {current_hour}:00")

            # 새벽 시간에 한 번 DB 정리 (선택사항)
            if current_hour == 2 and current_date != last_cleanup_date:
                from utils.briefing_store import cleanup_old_briefings
                cleanup_old_briefings()
                last_cleanup_date = current_date
            
            await asyncio.sleep(60) # 1분마다 체크
        except Exception as e:
            logger.error(f"📅 [Scheduler] Loop error: {e}")
            await asyncio.sleep(60)




async def disclosure_scheduler_loop():
    """Background loop to run the disclosure check every 30 minutes."""
    logger.info("Disclosure Scheduler Started.")

    while True:
        try:
            await asyncio.sleep(1800)  # 30분 간격
            await check_and_notify_disclosures()
        except asyncio.CancelledError:
            logger.info("Disclosure Scheduler stopped.")
            break
        except Exception as e:
            logger.error(f"Disclosure Scheduler crash: {e}")
            await asyncio.sleep(60)
