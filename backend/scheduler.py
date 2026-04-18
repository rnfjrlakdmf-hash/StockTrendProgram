import asyncio
import logging
import json
import os
from datetime import datetime, timedelta
from kind_scraper import KindScraper
from db_manager import get_all_fcm_tokens
from firebase_config import send_multicast_notification

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
    """
    Periodic task to check for new disclosures and send notifications.
    """
    logger.info("Running Disclosure Check...")
    
    scraper = KindScraper(headless=True)
    try:
        # 1. Scrape "Latest" (using "보호예수" as keyword for now, or maybe scrape ALL and filter?)
        # The scraper takes a keyword. 
        # Strategy: 
        #   - Check "보호예수" (Lock-up)
        #   - Check "전환사채" (CB) 
        #   - Check "신주인수권" (BW)
        # For efficiency, maybe just check one by one.
        
        keywords = ["보호예수", "전환사채", "신주인수권"]
        new_findings = []
        
        state = load_state()
        processed_ids = set(state.get("processed_ids", []))
        
        for kw in keywords:
            try:
                logger.info(f"Scraping keyword: {kw}")
                results = scraper.scrape_latest_disclosures(kw)
                
                for item in results:
                    # Item structure: {'no': ..., 'time': ..., 'corp_name': ..., 'title': ...}
                    # Use 'no' as unique ID
                    doc_id = str(item.get('no'))
                    
                    if doc_id and doc_id not in processed_ids:
                        # New Item Found!
                        item['keyword'] = kw
                        new_findings.append(item)
                        processed_ids.add(doc_id)
                        
                # Small delay between keywords
                await asyncio.sleep(5) 
                
            except Exception as e:
                logger.error(f"Error scraping {kw}: {e}")

        # 2. Send Notifications
        if new_findings:
            logger.info(f"Found {len(new_findings)} new disclosures.")
            
            from korea_data import search_korean_stock_symbol
            from db_manager import get_user_tokens_by_watchlist_symbol
            
            for item in new_findings:
                # 1. Identify Symbol from Corp Name
                corp = item.get('corp_name', 'Unknown')
                symbol = search_korean_stock_symbol(corp)
                
                # 2. Find Targeted Users (FCM Tokens)
                if symbol:
                    # Match by Ticker
                    tokens = get_user_tokens_by_watchlist_symbol(symbol)
                else:
                    # Fallback or Skip? 
                    # If we can't map to ticker, we can't match watchlist exactly.
                    # For now, let's skip personal push if ticker unknown to avoid accidental spam.
                    tokens = []
                
                if tokens:
                    category = item.get('keyword', '공시')
                    title_text = item.get('title', '')
                    
                    # [Message] Personalize for Watchlist
                    noti_title = f"🚨 [관심종목 {category}] {corp}"
                    noti_body = f"{title_text}\n\n나의 관심종목에 새로운 공시가 올라왔습니다. 내용을 확인하세요."
                    
                    # Data payload for app navigation
                    data_payload = {
                        "type": "DISCLOSURE_ALERT",
                        "symbol": symbol or corp,
                        "url": f"/discovery?q={symbol or corp}"
                    }
                    
                    logger.info(f"Sending targeted alert for {corp} ({symbol}) to {len(tokens)} tokens")
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)
                    
                    # Small delay between notifications
                    await asyncio.sleep(1)

            # 3. Update State
            # Limit processed_ids size to prevent infinite growth (keep last 1000)
            if len(processed_ids) > 1000:
                # Convert to list, sort reverse (assuming larger ID is newer), keep top 1000
                # But ID is string 'no'. Let's trust they are somewhat sequential or just keep recent.
                # Just keep list slice.
                processed_list = list(processed_ids)[-1000:]
            else:
                processed_list = list(processed_ids)
                
            save_state({"processed_ids": processed_list})
            
        else:
            logger.info("No new disclosures found.")

    except Exception as e:
        logger.error(f"Scheduler Error: {e}")
    finally:
        scraper._close_driver()

async def hourly_briefing_scheduler_loop():
    """
    KST 기준 00:00 ~ 15:00 사이 매시간 정각에 공통 시장 브리징(SYSTEM)을 생성합니다.
    """
    logger.info("Hourly Briefing Scheduler Started.")
    import pytz
    from utils.global_briefing import generate_market_wide_briefing
    
    last_run_hour = -1
    last_cleanup_date = ""
    
    while True:
        try:
            kst = pytz.timezone('Asia/Seoul')
            now = datetime.now(kst)
            current_hour = now.hour
            current_date = now.strftime("%Y-%m-%d")
            
            # [24/7 Ultra-Persistent Check] 최근 24시간 동안 누락된 브리핑이 있는지 전후 조사하여 병렬 보충
            from utils.briefing_store import has_system_briefing_for_hour
            
            check_tasks = []
            # 최근 24시간의 빈틈을 모두 채움
            for h_offset in range(24):
                target_time = now - timedelta(hours=h_offset)
                t_date = target_time.strftime("%Y-%m-%d")
                t_hour = target_time.hour
                
                # DB는 UTC 기준이므로 저장용 타임스탬프는 UTC로 변환 (KST-9h)
                target_time_utc = (target_time - timedelta(hours=9)).strftime("%Y-%m-%d %H:00:00")
                
                if not has_system_briefing_for_hour(t_date, t_hour):
                    # 누락 발견 시 해당 과거 시점의 타임스탬프를 포함하여 생성 지시
                    logger.info(f"[HourlyBrief] Found GAP at {t_date} {t_hour}:00 KST. Queueing backfill for {target_time_utc} UTC.")
                    check_tasks.append(generate_market_wide_briefing(target_time=target_time_utc))
                else:
                    if h_offset == 0 and t_hour != last_run_hour:
                        logger.info(f"[HourlyBrief] Current hour check ok: {t_hour}:00 KST.")
                        last_run_hour = t_hour
            
            if check_tasks:
                logger.info(f"[HourlyBrief] Backfilling {len(check_tasks)} missing historical slots in parallel...")
                # 병렬로 실행하여 빠르게 24시간 타임라인을 완성함
                await asyncio.gather(*check_tasks)
                last_run_hour = current_hour # 성공적으로 가동 후 현재 시각 업데이트

            # [ADD] User-Specific Briefing Warmer (Para-engine)
            # 매 시 정각에 활성 유저들의 개인 맞춤형 대시보드 데이터를 미리 생성해둠
            if current_hour != last_run_hour:
                try:
                    from morning_briefing import generate_user_morning_briefing
                    from db_manager import get_all_users
                    all_users = get_all_users()
                    logger.info(f"[HourlyBrief] Warming up {len(all_users)} potential active users...")
                    for u in all_users:
                        uid = u.get("id")
                        if uid and uid != "SYSTEM":
                            # 개인 브리핑은 리소스 소모가 크므로 비동기로 살짝 띄우거나 차례대로 처리
                            generate_user_morning_briefing(uid)
                            await asyncio.sleep(1) # 부하 방지를 위한 간격
                    last_run_hour = current_hour
                except Exception as user_e:
                    logger.error(f"[HourlyBrief] User Warmer error: {user_e}")

            # [Daily Cleanup] 매일 새벽 4시경 8일 이상 된 데이터 정리
            if current_hour == 4 and current_date != last_cleanup_date:
                try:
                    from utils.briefing_store import cleanup_old_briefings
                    deleted_count = cleanup_old_briefings()
                    logger.info(f"[Cleanup] Daily DB maintenance complete. Deleted {deleted_count} old records.")
                except Exception as eval_e:
                    logger.error(f"[Cleanup] Failed: {eval_e}")
                last_cleanup_date = current_date
            
            # 1분마다 체크
            await asyncio.sleep(60)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Hourly Briefing Scheduler Crash: {e}")
            await asyncio.sleep(60)

async def disclosure_scheduler_loop():
    """
    Background loop to run the check every X minutes.
    """
    logger.info("Disclosure Scheduler Started.")
    
    # Run once on startup (optional, maybe skip to avoid restart-spam)
    # await check_and_notify_disclosures()
    
    while True:
        try:
            # Interval: 30 minutes (1800 seconds)
            # For testing: 5 minutes? Let's go with 30m for production safety.
            await asyncio.sleep(1800) 
            await check_and_notify_disclosures()
        except asyncio.CancelledError:
            logger.info("Scheduler Cancelled.")
            break
        except Exception as e:
            logger.error(f"Scheduler Loop Crash: {e}")
            await asyncio.sleep(60) # Retry after 1 min
