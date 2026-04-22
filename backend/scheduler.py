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


async def backfill_system_briefings(kst_timezone):
    """과거 누락된 브리핑을 백그라운드에서 병렬로 복구합니다."""
    from utils.global_briefing import generate_market_wide_briefing
    from utils.briefing_store import has_system_briefing_for_hour, get_db
    
    now = datetime.now(kst_timezone)
    logger.info(f"[Backfill-Engine] Background recovery started at {now.strftime('%H:%M')} KST.")
    
    # [Self-Healing] 과거 수집 실패로 인해 저장된 '수집 중' 임시 데이터를 삭제하여 재시도 유도
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM morning_briefings WHERE user_id = 'SYSTEM' AND briefing_json LIKE '%시장 데이터 수집 중%'")
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close() # Explicitly close
        if deleted_count > 0:
            logger.info(f"[Backfill-SelfHeal] Cleared {deleted_count} failed placeholders for regeneration.")
    except Exception as e:
        logger.error(f"[Backfill-SelfHeal] Error clearing placeholders: {e}")

    # [Phase 1] 최근 48시간 우선 복구
    for h_offset in range(48):
        current_now = datetime.now(kst_timezone)
        target_kst = current_now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=h_offset)
        t_date, t_hour = target_kst.strftime("%Y-%m-%d"), target_kst.hour
        
        # Check exists with its own connection block (has_system_briefing_for_hour closes it)
        if not has_system_briefing_for_hour(t_date, t_hour):
            try:
                target_utc = (target_kst - timedelta(hours=9)).strftime("%Y-%m-%d %H:%M:%S")
                logger.info(f"[Backfill-P1] Filling gap: {t_date} {t_hour:02d}:00")
                await generate_market_wide_briefing(target_time=target_utc)
                await asyncio.sleep(30) # Rate limit safety
            except Exception as e: logger.error(f"[Backfill-P1] Error: {e}")

    # [Phase 2] 나머지 일주일치 복구 (더 천천히)
    for h_offset in range(48, 168):
        current_now = datetime.now(kst_timezone)
        target_kst = current_now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=h_offset)
        if target_kst.weekday() >= 5: continue
        t_date, t_hour = target_kst.strftime("%Y-%m-%d"), target_kst.hour

        if not has_system_briefing_for_hour(t_date, t_hour):
            try:
                target_utc = (target_kst - timedelta(hours=9)).strftime("%Y-%m-%d %H:%M:%S")
                logger.info(f"[Backfill-P2] Trickling gap: {t_date} {t_hour:02d}:00")
                await generate_market_wide_briefing(target_time=target_utc)
                await asyncio.sleep(45) 
            except Exception as e: logger.error(f"[Backfill-P2] Error: {e}")

    logger.info("[Backfill-Engine] All history recovered or checked.")


async def hourly_briefing_scheduler_loop():
    """매 정각 정기 브리핑 생성 (실시간 우선 모드)"""
    logger.info("📅 Real-time Hourly Scheduler Started.")
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    last_run_hour = -1
    last_cleanup_date = ""

    # [Startup] 과거 데이터 복구를 백그라운드 태스크로 즉시 실행 (메인 루프 차단 없음)
    asyncio.create_task(backfill_system_briefings(kst))

    while True:
        try:
            from utils.global_briefing import generate_market_wide_briefing
            from utils.briefing_store import cleanup_old_briefings
            
            # Initial run delay to let other parts of system catch up
            await asyncio.sleep(5) 
            
            now = datetime.now(kst)
            current_hour = now.hour
            current_date = now.strftime("%Y-%m-%d")

            # ── 매 정각: 새 시간 감지 → 실시간 브리핑 생성 (0순위 최우선 태스크) ──
            if current_hour != last_run_hour:
                logger.info(f"[RealTime-Brief] {current_hour:02d}:00 KST 감지 - 실시간 리포트 최우선 생성을 시작합니다.")
                try:
                    # [Precision] 실시간 생성 시에도 분/초를 절삭한 정시 타임스탬프를 강제 지정
                    target_kst = now.replace(minute=0, second=0, microsecond=0)
                    target_utc = (target_kst - timedelta(hours=9)).strftime("%Y-%m-%d %H:00:00")
                    
                    await generate_market_wide_briefing(target_time=target_utc)
                    last_run_hour = current_hour
                    logger.info(f"[RealTime-Brief] {current_hour:02d}:00 리포트 생성 및 저장 완료.")
                except Exception as e:
                    logger.error(f"[RealTime-Brief] 생성 실패: {e}")

            # ── 매일 새벽 4시: DB 정리 ──
            if current_hour == 4 and current_date != last_cleanup_date:
                try:
                    deleted = cleanup_old_briefings()
                    logger.info(f"[Cleanup] ✅ Deleted {deleted} old records.")
                except Exception as e:
                    logger.error(f"[Cleanup] Failed: {e}")
                last_cleanup_date = current_date

            # 30초마다 체크 (정각 감지를 위해)
            await asyncio.sleep(30)

        except asyncio.CancelledError:
            logger.info("Hourly Briefing Scheduler stopped.")
            break
        except Exception as e:
            logger.error(f"[HourlyBrief] Scheduler crash: {e}")
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
