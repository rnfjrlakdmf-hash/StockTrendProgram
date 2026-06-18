import asyncio
import logging
import json
import os
import urllib.parse
from datetime import datetime, timedelta
from holiday_checker import is_holiday
from system_watchdog import update_heartbeat

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
    return {"processed_ids": [], "sec_processed_ids": []}

def save_state(state):
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=4)
    except Exception as e:
        logger.error(f"Failed to save state: {e}")


async def check_and_notify_disclosures():
    """
    DART OpenAPI 기반 국내 공시 실시간 체크 (5분마다)
    - 키워드 필터 없음: 관심종목이면 모든 신규 공시 즉시 알림
    - 알림 제목: [공시 속보] 형식으로 통일
    """
    logger.info("[공시Monitor] DART 공시 체크 시작...")

    from dart_api_client import dart_api_client
    if not dart_api_client.is_available():
        logger.warning("[공시Monitor] DART_API_KEY 없음 -> 공시 체크 생략")
        return

    from db_manager import get_user_tokens_by_watchlist_symbol
    from firebase_config import send_multicast_notification

    try:
        state = load_state()
        processed_ids = set(state.get("processed_ids", []))

        # 오늘 올라온 공시 목록 조회 (최대 100건)
        results = dart_api_client.get_realtime_disclosures(days_ago=0)
        if not results:
            logger.info("[공시Monitor] 조회된 공시 없음")
            return

        new_count = 0
        sent_count = 0

        for item in results:
            doc_id = str(item.get('rcept_no', ''))
            if not doc_id or doc_id in processed_ids:
                continue

            new_count += 1
            processed_ids.add(doc_id)

            raw_code = item.get('stock_code')
            corp = item.get('corp_name', '알 수 없음')
            report_title = item.get('report_nm', '공시')
            dart_link = item.get('link', '')
            rcept_dt = item.get('rcept_dt', '')

            # 비상장 법인(stock_code 없음)은 스킵
            if not raw_code:
                continue

            # [세력 포착 라이브 사이렌 브로드캐스트]
            whale_keywords = ["주요주주", "대량보유", "단일판매", "무상증자", "유상증자", "자기주식"]
            is_whale = any(kw in report_title for kw in whale_keywords)
            if is_whale:
                try:
                    from firebase_admin import firestore
                    db = firestore.client()
                    event_data = {
                        "type": "WHALE_ALERT",
                        "corp": corp,
                        "title": report_title,
                        "code": raw_code,
                        "url": dart_link,
                        "timestamp": firestore.SERVER_TIMESTAMP
                    }
                    db.collection("live_events").add(event_data)
                    logger.info(f"[WhaleSiren] Broadcasted event for {corp}")
                    
                    # [추가] FCM 웹 푸시 알림 발송 (전체 사용자 대상)
                    from db_manager import get_all_fcm_tokens
                    from firebase_config import send_multicast_notification
                    from dart_scraper import scrape_dart_text
                    from ai_analysis import generate_realtime_summary
                    
                    all_tokens = get_all_fcm_tokens()
                    if all_tokens:
                        push_title = f"🚨 [세력 포착 라이브] {corp}"
                        
                        # 1. 원본 텍스트 스크래핑 (약 1~2초 소요)
                        dart_text = scrape_dart_text(dart_link)
                        
                        # 2. AI 3줄 요약 생성
                        summary_body = generate_realtime_summary(corp, report_title, dart_text)
                        
                        push_data = {
                            "type": "disclosure_alert",
                            "url": dart_link,
                            "dart_url": dart_link,
                            "symbol": raw_code
                        }
                        send_multicast_notification(all_tokens, push_title, summary_body, data=push_data)
                        logger.info(f"[WhaleSiren] FCM Push sent to {len(all_tokens)} users with AI summary")

                except Exception as e:
                    logger.error(f"[WhaleSiren] Firestore/FCM error: {e}")

            # 관심종목 등록 여부 확인 (KS / KQ 접미사 모두 시도)
            symbol_candidates = [f"{raw_code}.KS", f"{raw_code}.KQ", raw_code]
            tokens = []
            matched_symbol = None

            for sym in symbol_candidates:
                t_list = get_user_tokens_by_watchlist_symbol(sym)
                if t_list:
                    tokens = t_list
                    matched_symbol = sym
                    break

            if not tokens:
                continue  # 관심종목 등록 사용자 없음 -> 스킵

            # 공시 유형별 이모지 결정
            emoji = "📢"
            if any(kw in report_title for kw in ["유상증자", "무상증자"]):
                emoji = "💰"
            elif any(kw in report_title for kw in ["전환사채", "신주인수권"]):
                emoji = "🔄"
            elif any(kw in report_title for kw in ["보호예수", "대량보유"]):
                emoji = "🔒"
            elif any(kw in report_title for kw in ["실적", "영업이익", "분기보고서", "사업보고서"]):
                emoji = "📊"
            elif any(kw in report_title for kw in ["배당", "주주총회"]):
                emoji = "💸"
            noti_title = f"{emoji} {corp} 공시 속보"
            safe_report_title = report_title.replace("[", "").replace("]", "").replace("|", "")
            noti_body = f"📋 {safe_report_title}"
            if rcept_dt:
                try:
                    dt_fmt = f"{rcept_dt[4:6]}월 {rcept_dt[6:8]}일"
                    noti_body += f" 📅 {dt_fmt}"
                except Exception:
                    pass

            data_payload = {
                "type": "disclosure_alert",
                "symbol": matched_symbol or raw_code,
                "url": f"/discovery?q={raw_code}",
                "dart_url": f"https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(dart_link)}",
            }

            logger.info(f"[공시Monitor] {corp} ({matched_symbol}) -> {len(tokens)}명: {report_title}")
            send_multicast_notification(tokens, noti_title, noti_body, data_payload)
            sent_count += 1
            await asyncio.sleep(0.5)

        logger.info(f"[공시Monitor] 완료: 신규 {new_count}건, 알림 {sent_count}건 발송")

        # 상태 저장 (최대 2000건 유지)
        state["processed_ids"] = list(processed_ids)[-2000:]
        save_state(state)

    except Exception as e:
        logger.error(f"[공시Monitor] DART 체크 오류: {e}")


async def check_and_notify_sec_disclosures():
    """
    SEC EDGAR RSS 기반 해외 공시 실시간 체크 (5분마다)
    - 관심 해외종목 -> CIK 변환 -> 신규 SEC Filing 알림
    - SEC 공식 RSS 사용 (무료, 인증 불필요)
    """
    logger.info("[SEC Monitor] SEC 공시 체크 시작...")

    from db_manager import get_all_users, get_watchlist, get_user_fcm_tokens
    from firebase_config import send_multicast_notification
    from sec_api_client import get_cik_by_ticker
    import requests
    import xml.etree.ElementTree as ET
    
    def translate_sec_title(title: str) -> str:
        t = title.lower()
        if "4 - " in t and "beneficial ownership" in t:
            return "내부자 주식 매수/매도 (지분 변동) 📉📈"
        elif "13g" in t:
            return "대주주 지분 신고 (단순 투자) 🐳"
        elif "13d" in t:
            return "대주주 지분 신고 (경영 참여) 🐳"
        elif "10-q" in t and "quarterly" in t:
            return "분기 실적 보고서 📊"
        elif "10-k" in t and "annual" in t:
            return "연간 실적 보고서 📊"
        elif "8-k" in t and "current report" in t:
            return "주요 경영사항 발생 (수시공시) 📢"
        elif "14a" in t:
            return "주주총회 소집 공고 🏢"
        elif "s-8" in t:
            return "임직원 스톡옵션 (주식 보상) 🎁"
        elif "3 - " in t and "initial statement" in t:
            return "신규 내부자 지분 신고 👤"
            
        try:
            from deep_translator import GoogleTranslator
            return GoogleTranslator(source='en', target='ko').translate(title)
        except Exception:
            return title

    try:
        state = load_state()
        sec_processed = set(state.get("sec_processed_ids", []))

        # 모든 사용자의 해외 관심종목 수집 (중복 제거)
        users = get_all_users()
        foreign_watchlist = {}  # { symbol: [user_id, ...] }

        for user in users:
            uid = user.get('user_id') or user.get('id')
            if not uid:
                continue
            wl = get_watchlist(uid)
            for wl_item in wl:
                sym = wl_item[0] if isinstance(wl_item, tuple) else wl_item.get('symbol', '')
                # 해외 종목: 6자리 숫자가 아닌 영문 티커
                clean = sym.split('.')[0]
                if clean and not clean.isdigit():
                    if sym not in foreign_watchlist:
                        foreign_watchlist[sym] = []
                    foreign_watchlist[sym].append(uid)

        if not foreign_watchlist:
            logger.info("[SEC Monitor] 관심 해외종목 없음")
            return

        sent_count = 0
        headers = {"User-Agent": "StockTrendProgram/1.0 (rnfjr@dummy.com)"}

        for symbol, user_ids in foreign_watchlist.items():
            ticker = symbol.split('.')[0].upper()
            cik = get_cik_by_ticker(ticker)
            if not cik:
                continue

            # SEC EDGAR Atom RSS: 해당 CIK 최신 Filing 5건
            rss_url = (
                f"https://www.sec.gov/cgi-bin/browse-edgar"
                f"?action=getcompany&CIK={cik}&type=&dateb=&owner=include"
                f"&count=5&search_text=&output=atom"
            )
            try:
                res = requests.get(rss_url, headers=headers, timeout=8)
                if res.status_code != 200:
                    continue

                root = ET.fromstring(res.content)
                ns = {"atom": "http://www.w3.org/2005/Atom"}
                entries = root.findall("atom:entry", ns)

                for entry in entries:
                    entry_id = entry.findtext("atom:id", default="", namespaces=ns)
                    if not entry_id or entry_id in sec_processed:
                        continue

                    sec_processed.add(entry_id)
                    title_el = entry.findtext("atom:title", default="New Filing", namespaces=ns)
                    link_el = entry.find("atom:link", ns)
                    filing_url = link_el.get("href", "") if link_el is not None else ""
                    updated = entry.findtext("atom:updated", default="", namespaces=ns)

                    # 사용자 FCM 토큰 수집 (뉴스 알림 허용한 토큰만)
                    all_tokens = []
                    for uid in set(user_ids):
                        for t in get_user_fcm_tokens(uid):
                            if t.get("pref_news", True) and t.get("token"):
                                all_tokens.append(t["token"])

                    if not all_tokens:
                        continue

                    noti_title = f"📢 {ticker} SEC 공시"
                    safe_title_el = title_el.replace("[", "").replace("]", "").replace("|", "")
                    kor_title = translate_sec_title(safe_title_el)
                    noti_body = f"📋 {kor_title}"
                    if updated:
                        try:
                            dt = datetime.fromisoformat(updated[:10])
                            noti_body += f" 📅 {dt.strftime('%m월 %d일')}"
                        except Exception:
                            pass

                    data_payload = {
                        "type": "disclosure_alert",
                        "symbol": ticker,
                        "url": f"/discovery?q={ticker}",
                        "dart_url": f"https://stock-trend-program.co.kr/disclosure/redirect?url={urllib.parse.quote(filing_url)}",
                    }

                    logger.info(f"[SEC Monitor] {ticker} -> {len(all_tokens)}명: {title_el}")
                    send_multicast_notification(all_tokens, noti_title, noti_body, data_payload)
                    sent_count += 1
                    await asyncio.sleep(0.5)

                await asyncio.sleep(1)  # SEC rate limit 준수 (초당 10회)

            except Exception as e:
                logger.warning(f"[SEC Monitor] {ticker} RSS 오류: {e}")

        logger.info(f"[SEC Monitor] 완료: {sent_count}건 SEC 공시 알림 발송")

        state["sec_processed_ids"] = list(sec_processed)[-2000:]
        save_state(state)

    except Exception as e:
        logger.error(f"[SEC Monitor] SEC 체크 오류: {e}")


async def hourly_briefing_scheduler_loop():
    """
    매 정각 정기 브리핑 생성 (초경량 실시간 전용 모드)
    """
    global ANALYSIS_LOCK
    ANALYSIS_LOCK = asyncio.Lock()

    logger.info("[Resource-Clean] Hourly Scheduler Active.")
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    last_run_hour = -1
    last_cleanup_date = ""

    while True:
        try:
            update_heartbeat("Hourly_Briefing")
            now = datetime.now(kst)
            current_hour = now.hour
            current_date = now.strftime("%Y-%m-%d")

            is_weekend = is_holiday("kor")

            if not is_weekend and current_hour != last_run_hour:
                logger.info(f"[Scheduler] Starting hourly briefing for: {current_hour}:00")
                from utils.global_briefing import generate_market_wide_briefing

                async with ANALYSIS_LOCK:
                    await asyncio.wait_for(
                        generate_market_wide_briefing(),
                        timeout=180.0
                    )
                last_run_hour = current_hour
                logger.info(f"[Scheduler] Task completed for {current_hour}:00")

            if current_hour == 2 and current_date != last_cleanup_date:
                from utils.briefing_store import cleanup_old_briefings
                cleanup_old_briefings()
                last_cleanup_date = current_date

            await asyncio.sleep(60)
        except Exception as e:
            logger.error(f"[Scheduler] Loop error: {e}")
            await asyncio.sleep(60)


async def check_and_notify_ipos():
    """Periodic task to check for new IPOs and notify ALL users."""
    logger.info("Running IPO Check...")

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

                    noti_title = f"🚀 {name} 신규 공모주 청약"
                    noti_body = f"💰 희망가 {band}원 📅 청약일 {schedule} 🏢 주관사 {underwriter}"
                    data_payload = {
                        "type": "IPO_ALERT",
                        "url": "/market"
                    }
                    send_multicast_notification(tokens, noti_title, noti_body, data_payload)
                    await asyncio.sleep(1)

            with open(IPO_STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump({"processed_ipos": processed_ipos[-1000:]}, f, ensure_ascii=False)
        else:
            logger.info("No new IPOs found.")

    except Exception as e:
        logger.error(f"Scheduler Error in IPO Check: {e}")


async def disclosure_scheduler_loop():
    """
    공시 실시간 감시 루프
    - DART 국내 공시: 5분마다 체크
    - SEC 해외 공시: 5분마다 체크 (DART와 동시)
    - IPO 공모주: 30분마다 체크
    """
    logger.info("[공시Monitor] 공시 실시간 감시 루프 시작 (5분 주기)")

    ipo_check_counter = 0  # 5분 * 6 = 30분마다 IPO 체크

    while True:
        try:
            update_heartbeat("Disclosure_Monitor")
            await asyncio.sleep(300)  # 5분 간격

            # 국내 DART 공시 체크
            await check_and_notify_disclosures()

            # 해외 SEC 공시 체크
            await check_and_notify_sec_disclosures()

            # IPO는 30분마다 (5분 * 6 = 30분)
            ipo_check_counter += 1
            if ipo_check_counter >= 6:
                await check_and_notify_ipos()
                ipo_check_counter = 0

        except asyncio.CancelledError:
            logger.info("[공시Monitor] 공시 감시 루프 종료")
            break
        except Exception as e:
            logger.error(f"[공시Monitor] 루프 오류: {e}")
            await asyncio.sleep(60)


async def auto_blog_scheduler_loop():
    """
    매일 지정된 시간에 블로그 포스팅 봇을 자동 호출
    - KOR (국내장): 16:00
    - US (미국장): 07:00
    """
    logger.info("[AutoBlog] Auto Blog Scheduler Active.")
    import pytz
    import subprocess
    import sys
    kst = pytz.timezone('Asia/Seoul')
    last_run_date_kor = ""
    last_run_date_us = ""
    
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "auto_blog_bot.py")

    while True:
        try:
            update_heartbeat("Auto_Blog_Bot")
            now = datetime.now(kst)
            current_date = now.strftime("%Y-%m-%d")
            
            # 오후 16시 정각 (한국장 마감 포스팅)
            if now.hour == 16 and last_run_date_kor != current_date:
                if not is_holiday("kor"):
                    logger.info("[AutoBlog] Triggering KOR market blog post...")
                    await asyncio.to_thread(subprocess.run, [sys.executable, script_path, "kor"])
                last_run_date_kor = current_date
            
            # 오전 07시 정각 (미국장 마감 포스팅)
            if now.hour == 7 and last_run_date_us != current_date:
                if not is_holiday("us"):
                    logger.info("[AutoBlog] Triggering US market blog post...")
                    await asyncio.to_thread(subprocess.run, [sys.executable, script_path, "us"])
                last_run_date_us = current_date

            await asyncio.sleep(60) # 1분 대기
        except Exception as e:
            logger.error(f"[AutoBlog] Loop error: {e}")
            await asyncio.sleep(60)

async def seo_blog_scheduler_loop():
    """
    SEO 최적화 자동 포스팅 봇 스케줄러 (하루 N회 실행)
    - 매일 오전 10시, 오후 2시 등에 트래픽 확보를 위해 실행
    """
    logger.info("[SEOBlog] SEO Blog Scheduler Active.")
    import pytz
    import subprocess
    import sys
    kst = pytz.timezone('Asia/Seoul')
    last_run_hour = -1
    
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seo_blog_bot.py")

    while True:
        try:
            update_heartbeat("SEO_Blog_Bot")
            now = datetime.now(kst)
            
            # 매일 오전 11시, 오후 15시 실행 (하루 2번)
            if now.hour in [11, 15] and last_run_hour != now.hour:
                logger.info(f"[SEOBlog] Triggering SEO blog post for hour {now.hour}...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_hour = now.hour

            await asyncio.sleep(60)
        except Exception as e:
            logger.error(f"[SEOBlog] Loop error: {e}")
            await asyncio.sleep(60)

async def watchdog_scheduler_loop():
    """10분 주기로 시스템 워치독 실행"""
    logger.info("[Watchdog] System Watchdog Active. Checking every 10 mins.")
    import system_watchdog
    while True:
        try:
            await asyncio.to_thread(system_watchdog.run_health_checks)
            await asyncio.sleep(600) # 10분 대기
        except Exception as e:
            logger.error(f"[Watchdog] Loop error: {e}")
            await asyncio.sleep(60)

async def google_indexer_scheduler_loop():
    """매일 새벽 2시에 구글 인덱서 실행"""
    logger.info("[GoogleIndexer] Google Indexer Scheduler Active.")
    import subprocess
    import sys
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "google_indexer.py")
    last_run_day = -1
    
    while True:
        try:
            now = datetime.now()
            # 매일 새벽 2시에 한 번 실행
            if now.hour == 2 and last_run_day != now.day:
                logger.info(f"[GoogleIndexer] Triggering Google Indexing for today...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_day = now.day
                
            await asyncio.sleep(60 * 30) # 30분 주기로 체크 (자주 돌 필요 없음)
        except Exception as e:
            logger.error(f"[GoogleIndexer] Loop error: {e}")
            await asyncio.sleep(60)

async def dividend_alerts_scheduler_loop():
    """매일 저녁 18:00 KST에 배당락일 D-1 푸시 알림 실행"""
    logger.info("[DividendAlerts] Dividend Alerts Scheduler Active.")
    import subprocess
    import sys
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dividend_alerts.py")
    last_run_day = -1
    
    # 시간대 처리
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            # 매일 오후 18시에 1번 실행 (18:00 ~ 18:59 사이 최초 도달 시)
            if now.hour == 18 and last_run_day != now.day:
                logger.info(f"[DividendAlerts] Triggering Dividend Alerts for today...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_day = now.day
                
            await asyncio.sleep(60 * 30) # 30분 주기로 체크
        except Exception as e:
            logger.error(f"[DividendAlerts] Loop error: {e}")
            await asyncio.sleep(60)

async def weekly_blog_bot_scheduler_loop():
    """매주 토요일 오전 9시 KST에 주간 증시 결산 블로그 포스팅 실행"""
    logger.info("[WeeklyBlog] Weekly Blog Bot Scheduler Active.")
    import subprocess
    import sys
    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weekly_blog_bot.py")
    last_run_week = -1
    
    import pytz
    kst = pytz.timezone('Asia/Seoul')
    
    while True:
        try:
            now = datetime.now(kst)
            # 5: 토요일 (weekday()는 월요일이 0, 토요일이 5)
            # 오전 9시에 1번 실행 (09:00 ~ 09:59 사이)
            current_week = now.isocalendar()[1]
            if now.weekday() == 5 and now.hour == 9 and last_run_week != current_week:
                logger.info(f"[WeeklyBlog] Triggering Weekly Blog Posting for week {current_week}...")
                await asyncio.to_thread(subprocess.run, [sys.executable, script_path])
                last_run_week = current_week
                
            await asyncio.sleep(60 * 30) # 30분 주기로 체크
        except Exception as e:
            logger.error(f"[WeeklyBlog] Loop error: {e}")
            await asyncio.sleep(60)
