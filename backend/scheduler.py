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


async def hourly_briefing_scheduler_loop():
    """
    매 정각마다 SYSTEM 브리핑을 생성합니다. (네이버 AI 브리핑 스타일 히스토리 축적)
    - 서버 시작 시: 누락된 슬롯 최대 3개 보충
    - 매 정각: 새 브리핑 자동 생성
    - 매일 새벽 4시: 오래된 데이터 정리
    """
    logger.info("📅 Hourly Briefing Scheduler Started.")
    import pytz

    last_run_hour = -1
    last_cleanup_date = ""
    startup = True

    while True:
        try:
            # [Lazy Import] 루프마다 임포트하지 않고 최초 1회만 필요
            from utils.global_briefing import generate_market_wide_briefing
            from utils.briefing_store import has_system_briefing_for_hour, cleanup_old_briefings

            kst = pytz.timezone('Asia/Seoul')
            now = datetime.now(kst)
            current_hour = now.hour
            current_date = now.strftime("%Y-%m-%d")

                # ── 서버 시작 시: 최근 7일 누락 슬롯 대량 보충 (최대 20개) ──
                if startup:
                    startup = False
                    logger.info(f"[Startup] Server started at {now.strftime('%Y-%m-%d %H:%M')} KST. Scanning past 7 days for missing slots...")
                    gaps_filled = 0

                    # 최근 168시간(7일)을 역순으로 탐색
                    for h_offset in range(168):
                        target_kst = now - timedelta(hours=h_offset)
                        t_date = target_kst.strftime("%Y-%m-%d")
                        t_hour = target_kst.hour
                        # UTC 시간으로 변환하여 AI 분석 요청
                        target_utc = (target_kst - timedelta(hours=9)).strftime("%Y-%m-%d %H:00:00")

                        if not has_system_briefing_for_hour(t_date, t_hour):
                            logger.info(f"[Startup] 🔍 Missing slot found: {t_date} {t_hour:02d}:00 KST → Auto-healing...")
                            try:
                                await generate_market_wide_briefing(target_time=target_utc)
                                gaps_filled += 1
                                await asyncio.sleep(5)  # API 할당량 보호를 위한 지연
                            except Exception as e:
                                logger.error(f"[Startup] Healing failed for {t_date} {t_hour}:00 - {e}")

                        # 한 번에 너무 많은 분석이 몰리지 않도록 7일 중 주요 20개 슬롯만 우선 복구
                        if gaps_filled >= 20:
                            logger.info("[Startup] 🛑 Recovery limit (20 slots) reached. Standing by for next hourly sync.")
                            break

                    last_run_hour = current_hour
                    logger.info(f"[Startup] ✨ Recovery complete. {gaps_filled} slot(s) restored to history.")

            # ── 매 정각: 새 시간 감지 → 브리핑 생성 ──
            elif current_hour != last_run_hour:
                logger.info(f"[HourlyBrief] 🕐 {current_hour:02d}:00 KST — Generating SYSTEM briefing...")
                try:
                    await generate_market_wide_briefing()
                    last_run_hour = current_hour
                    logger.info(f"[HourlyBrief] ✅ {current_hour:02d}:00 saved successfully.")
                except Exception as e:
                    logger.error(f"[HourlyBrief] Failed: {e}")

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
