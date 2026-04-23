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

    # [Ultra-Light Diet-V6] 오직 오늘과 어제(최근 24시간)만 관리합니다. (사용자 요청 반영)
    # 72시간 치를 포기함으로써 서버 자원 소모를 1/3로 줄이고 안정성을 확보합니다.
    for h_offset in range(24):
        current_now = datetime.now(kst_timezone)
        target_kst = current_now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=h_offset)
        
        # 1. 주말 제외
        if target_kst.weekday() >= 5: continue
        
        t_date, t_hour = target_kst.strftime("%Y-%m-%d"), target_kst.hour
        
        if not has_system_briefing_for_hour(t_date, t_hour):
            try:
                target_utc = (target_kst - timedelta(hours=9)).strftime("%Y-%m-%d %H:%M:%S")
                # 최신 1시간 데이터는 긴급(Urgent)하게 처리
                is_urgent = (h_offset == 0)
                
                logger.info(f"[Ultra-Light] {'URGENT' if is_urgent else 'Sync'} Filling: {t_date} {t_hour:02d}:00")
                
                async with ANALYSIS_LOCK:
                    await asyncio.wait_for(
                        generate_market_wide_briefing(target_time=target_utc),
                        timeout=180.0
                    )
                # 너무 몰아치지 않게 60초 정도 휴식
                await asyncio.sleep(10 if is_urgent else 60)
            except Exception as e: 
                logger.error(f"[Ultra-Light] Error for {t_date} {t_hour}: {e}")

    logger.info("[Ultra-Light] Today/Yesterday sync completed.")


async def historical_slow_trickle_loop():
    """
    [Burden-Optimized] 과거 데이터를 15분마다 1개씩 아주 천천히 채웁니다.
    서버 자원을 거의 차지하지 않으면서 3일치 히스토리를 완성합니다.
    """
    import pytz
    kst_timezone = pytz.timezone('Asia/Seoul')
    logger.info("🐢 [Slow-Trickle] Historical recovery loop started.")
    
    while True:
        try:
            # 15분마다 하나씩만 시도
            await asyncio.sleep(15 * 60)
            
            # 최근 72시간 중 비어있는 시간 하나 찾기 (과거부터 채움)
            from utils.briefing_store import has_system_briefing_for_hour
            from utils.global_briefing import generate_market_wide_briefing
            
            # 과거(72h) -> 최신(12h) 순으로 빈 틈 찾기
            found_gap = False
            for h_offset in range(71, 2, -1):
                current_now = datetime.now(kst_timezone)
                target_kst = current_now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=h_offset)
                
                # 주말 제외
                if target_kst.weekday() >= 5: continue
                
                t_date, t_hour = target_kst.strftime("%Y-%m-%d"), target_kst.hour
                if not has_system_briefing_for_hour(t_date, t_hour):
                    target_utc = (target_kst - timedelta(hours=9)).strftime("%Y-%m-%d %H:%M:%S")
                    logger.info(f"🐢 [Slow-Trickle] Filling historical gap: {t_date} {t_hour:02d}:00")
                    
                    async with ANALYSIS_LOCK:
                        await asyncio.wait_for(
                            generate_market_wide_briefing(target_time=target_utc),
                            timeout=180.0
                        )
                    found_gap = True
                    break
            
            if not found_gap:
                # 모든 빈틈이 채워졌으면 1시간 동안 휴식
                await asyncio.sleep(3600)
                
        except Exception as e:
            logger.error(f"🐢 [Slow-Trickle] Error: {e}")
            await asyncio.sleep(300)


async def hourly_briefing_scheduler_loop():
    """매 정각 정기 브리핑 생성 (실시간 우선 모드)"""
    logger.info("📅 Real-time Hourly Scheduler Started.")
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    last_run_hour = -1
    last_cleanup_date = ""

    # 1. [Startup] 오늘과 어제 데이터 즉시 복구 (최우선)
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

            # ── 매 정각: 새 시간 감지 → 실시간 브리핑 생성 (주말 제외) ──
            if current_hour != last_run_hour:
                # [Burden-Diet] 주말(토/일)은 운영 부담을 위해 분석 스킵
                if now.weekday() >= 5:
                    logger.info(f"[Hourly-Briefing] Weekend mode ({now.strftime('%A')}). Skipping analysis.")
                    last_run_hour = current_hour
                    continue

                logger.info(f"[Hourly-Briefing] Starting analysis for {current_date} {current_hour:02d}:00")
                target_utc = (now - timedelta(hours=9)).strftime("%Y-%m-%d %H:00:00")
                
                try:
                    async with ANALYSIS_LOCK:
                        await generate_market_wide_briefing(target_time=target_utc)
                        cleanup_old_briefings()
                    
                    last_run_hour = current_hour
                    logger.info(f"[Hourly-Briefing] Completed for {current_hour:02d}:00")
                except Exception as e:
                    logger.error(f"[Hourly-Briefing] Failed: {e}")

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
