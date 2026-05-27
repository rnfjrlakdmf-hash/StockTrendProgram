import asyncio
import logging
import json
import os
from datetime import datetime, timedelta

# Configure logging
logger = logging.getLogger(__name__)

# State File to track processed disclosures
# [Vercel-Fix] State file must be in /tmp
if os.environ.get("VERCEL"):
    STATE_FILE = "/tmp/disclosure_state.json"
else:
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
    """Periodic task to check for new disclosures and send notifications using Open DART API."""
    logger.info("Running Disclosure Check via Open DART API...")
    
    from dart_api_client import dart_api_client
    if not dart_api_client.is_available():
        logger.warning("[Scheduler] DART_API_KEY가 존재하지 않아 공시 체크를 건너뜁니다.")
        return

    from db_manager import get_all_fcm_tokens
    from firebase_config import send_multicast_notification

    try:
        keywords = ["보호예수", "전환사채", "신주인수권", "무상증자", "유상증자"]
        new_findings = []
        state = load_state()
        processed_ids = set(state.get("processed_ids", []))

        # 오늘 올라온 공시 목록 조회 (0 = 오늘)
        results = dart_api_client.get_realtime_disclosures(days_ago=0)
        
        for item in results:
            doc_id = str(item.get('rcept_no'))  # 접수번호를 고유 ID로 사용
            if doc_id and doc_id not in processed_ids:
                title = item.get('report_nm', '')
                
                # 관심 키워드가 공시 제목에 포함되어 있는지 확인
                matched_kw = None
                for kw in keywords:
                    if kw in title:
                        matched_kw = kw
                        break
                
                if matched_kw:
                    item['keyword'] = matched_kw
                    item['title'] = title
                    new_findings.append(item)
                    processed_ids.add(doc_id)

        if new_findings:
            logger.info(f"Found {len(new_findings)} new disclosures.")
            from db_manager import get_user_tokens_by_watchlist_symbol

            for item in new_findings:
                corp = item.get('corp_name', 'Unknown')
                # DART API가 제공하는 stock_code (6자리) 사용
                raw_code = item.get('stock_code')
                if not raw_code:
                    continue
                
                # 종목코드 포맷 맞춤 (국내 주식은 6자리 코드)
                # korea_data의 watchlist 연동을 위해 .KS 또는 .KQ 추가 판단
                # 여기서는 단순히 raw_code를 기반으로 watchlist 조회
                # raw_code가 DB에 들어있는 방식과 매칭해야 함 (대개 005930.KS 또는 005930 형식)
                # watchlist 테이블에는 보통 symbol이 005930.KS 와 같은 형태로 저장되므로,
                # 이를 매칭하기 위해 유추 로직을 적용합니다.
                symbol_candidates = [f"{raw_code}.KS", f"{raw_code}.KQ", raw_code]
                tokens = []
                matched_symbol = None
                
                for sym in symbol_candidates:
                    t_list = get_user_tokens_by_watchlist_symbol(sym)
                    if t_list:
                        tokens = t_list
                        matched_symbol = sym
                        break

                if tokens:
                    category = item.get('keyword', '공시')
                    title_text = item.get('title', '')
                    noti_title = f"🚨 [관심종목 {category}] {corp}"
                    noti_body = f"{title_text}\n\n나의 관심종목에 새로운 공시가 올라왔습니다."
                    data_payload = {
                        "type": "DISCLOSURE_ALERT",
                        "symbol": matched_symbol or raw_code,
                        "url": f"/discovery?q={raw_code}"
                    }
                    logger.info(f"Sending targeted alert for {corp} ({matched_symbol}) to {len(tokens)} tokens")
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)
                    await asyncio.sleep(1)

            processed_list = list(processed_ids)[-1000:]
            save_state({"processed_ids": processed_list})
        else:
            logger.info("No new disclosures found.")

    except Exception as e:
        logger.error(f"Scheduler Error in DART Check: {e}")

async def hourly_briefing_scheduler_loop():
    """
    매 정각 정기 브리핑 생성 (초경량 실시간 전용 모드)
    """
    # [Safe-Initialization] 루프가 시작된 후 락을 생성하여 이벤트 루프 충돌 방지
    global ANALYSIS_LOCK
    ANALYSIS_LOCK = asyncio.Lock()
    
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

async def check_and_notify_ipos():
    """Periodic task to check for new IPOs and notify ALL users."""
    logger.info("Running IPO Check...")
    
    # Import inside function to avoid circular deps
    from dart_ipo import fetch_dart_ipo_schedule
    from db_manager import get_fcm_tokens_for_ipo
    from firebase_config import send_multicast_notification
    
    IPO_STATE_FILE = "/tmp/ipo_state.json" if os.environ.get("VERCEL") else os.path.join(os.path.dirname(os.path.abspath(__file__)), "ipo_state.json")
    
    processed_ipos = []
    if os.path.exists(IPO_STATE_FILE):
        try:
            with open(IPO_STATE_FILE, 'r', encoding='utf-8') as f:
                processed_ipos = json.load(f).get("processed_ipos", [])
        except Exception:
            pass
            
    try:
        # Fetch IPOs (will use cache if recently fetched, which is fine)
        ipos = await asyncio.to_thread(fetch_dart_ipo_schedule)
        
        new_ipos = []
        for ipo in ipos:
            ipo_name = ipo.get('name')
            if ipo_name and ipo_name not in processed_ipos:
                new_ipos.append(ipo)
                processed_ipos.append(ipo_name)
                
        if new_ipos:
            logger.info(f"Found {len(new_ipos)} new IPO(s). Sending notifications.")
            tokens = get_fcm_tokens_for_ipo()
            if tokens:
                for ipo in new_ipos:
                    name = ipo.get('name')
                    band = ipo.get('band', '')
                    schedule = ipo.get('date', '')
                    underwriter = ipo.get('detail', '')
                    
                    noti_title = f"🚀 [신규 공모주] {name}"
                    noti_body = f"희망공모가: {band}원\n청약일: {schedule}\n주관사: {underwriter}"
                    data_payload = {
                        "type": "IPO_ALERT",
                        "url": "/market"
                    }
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)
                    await asyncio.sleep(1)
            
            # Save state
            with open(IPO_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump({"processed_ipos": processed_ipos[-1000:]}, f, ensure_ascii=False)
        else:
            logger.info("No new IPOs found.")
            
    except Exception as e:
        logger.error(f"Scheduler Error in IPO Check: {e}")

async def disclosure_scheduler_loop():
    """Background loop to run the disclosure check every 30 minutes."""
    logger.info("Disclosure Scheduler Started.")

    while True:
        try:
            await asyncio.sleep(1800)  # 30분 간격
            await check_and_notify_disclosures()
            await check_and_notify_ipos()
        except asyncio.CancelledError:
            logger.info("Disclosure Scheduler stopped.")
            break
        except Exception as e:
            logger.error(f"Disclosure Scheduler crash: {e}")
            await asyncio.sleep(60)
